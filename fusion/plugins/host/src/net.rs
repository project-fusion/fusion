//! Where an address leads, decided from the host a URL parser reads and the
//! addresses that host resolves to.
//!
//! **A URL is local only when it reaches this machine alone**: a Unix
//! socket, or a host whose every address is a loopback address. The text of
//! a URL says nothing about where it goes, so `https://localhost.example.com`
//! and `https://example.com/?127.0.0.1` count as hosted, and a name that
//! resolves to no address counts as hosted too.
//!
//! **A request from the host application's own process reaches only the
//! public internet**, unless the setting or grant behind it names more. The fetch tool and a
//! plugin's fetch run outside the sandbox, so a granted name that resolves
//! to this machine, a private network, a link-local address where a cloud
//! runner's metadata answers, or the shared address space carriers use
//! would reach what no grant named. [`Guarded`] resolves each name once and
//! hands the client only the addresses that pass, so the address checked is
//! the address connected to, and an address given as itself is checked
//! before the request and at every redirect.
//!
//! **A name the person's own settings open may reach their network.** The
//! fetch tool takes `tools.fetch_private` from the person's settings alone,
//! and a name it lists may resolve to an intranet address: a private range
//! of RFC 1918, a unique local address, or the shared space carriers use.
//! This machine, link-local addresses, and a cloud runner's metadata
//! service stay refused for it, since an intranet server answers at none of
//! them.

use std::{
    collections::HashMap,
    net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr, ToSocketAddrs},
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

/// How long an answer about a host name is kept before the name is resolved
/// again.
const KEPT: Duration = Duration::from_mins(1);

/// Each host name and port asked about, with when it was asked and whether
/// it resolved to loopback alone.
type Answers = HashMap<(String, u16), (Instant, bool)>;

/// Whether `address` is this machine's own: a loopback address, as itself or
/// mapped into IPv6.
pub fn loopback(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(v4) => v4.is_loopback(),
        IpAddr::V6(v6) => {
            v6.is_loopback() || v6.to_ipv4_mapped().is_some_and(|v4| v4.is_loopback())
        }
    }
}

/// Whether every address `host` resolves to on `port` is a loopback address,
/// kept for [`KEPT`].
fn resolves_to_loopback(host: &str, port: u16) -> bool {
    static ANSWERS: LazyLock<Mutex<Answers>> = LazyLock::new(|| Mutex::new(HashMap::new()));
    let key = (host.to_ascii_lowercase(), port);
    if let Ok(answers) = ANSWERS.lock() {
        if let Some((at, local)) = answers.get(&key) {
            if at.elapsed() < KEPT {
                return *local;
            }
        }
    }
    let local = (host, port).to_socket_addrs().is_ok_and(|addresses| {
        let addresses: Vec<IpAddr> = addresses.map(|address| address.ip()).collect();
        !addresses.is_empty() && addresses.into_iter().all(loopback)
    });
    if let Ok(mut answers) = ANSWERS.lock() {
        answers.insert(key, (Instant::now(), local));
    }
    local
}

/// Whether `base`, a URL, reaches this machine alone: a Unix socket, or a
/// host every one of whose addresses is a loopback address.
pub fn on_this_machine(base: &str) -> bool {
    let Ok(url) = reqwest::Url::parse(base.trim()) else {
        return false;
    };
    if url.scheme() == "unix" || url.scheme().ends_with("+unix") {
        return true;
    }
    let Some(host) = url.host_str() else {
        return false;
    };
    match host
        .trim_start_matches('[')
        .trim_end_matches(']')
        .parse::<IpAddr>()
    {
        Ok(address) => loopback(address),
        Err(_) => resolves_to_loopback(host, url.port_or_known_default().unwrap_or(80)),
    }
}

/// The IPv4 address an IPv6 address carries, where it carries one: mapped,
/// compatible, NAT64, or 6to4.
fn carried(v6: Ipv6Addr) -> Option<Ipv4Addr> {
    if let Some(v4) = v6.to_ipv4_mapped() {
        return Some(v4);
    }
    let segments = v6.segments();
    let octets = v6.octets();
    if segments[..6] == [0; 6] && !v6.is_loopback() && !v6.is_unspecified() {
        return Some(Ipv4Addr::new(
            octets[12], octets[13], octets[14], octets[15],
        ));
    }
    if segments[..6] == [0x64, 0xff9b, 0, 0, 0, 0] {
        return Some(Ipv4Addr::new(
            octets[12], octets[13], octets[14], octets[15],
        ));
    }
    if segments[0] == 0x2002 {
        return Some(Ipv4Addr::new(octets[2], octets[3], octets[4], octets[5]));
    }
    None
}

/// What `address` is, where it is anything but an address on the public
/// internet.
fn class(address: IpAddr) -> Option<&'static str> {
    match address {
        IpAddr::V4(v4) => {
            let [first, second, ..] = v4.octets();
            if v4.is_loopback() {
                Some("an address on this machine")
            } else if v4.is_unspecified() || first == 0 {
                Some("an address that reaches this machine")
            } else if v4.is_private() {
                Some("an address on a private network")
            } else if v4.is_link_local() {
                Some("a link-local address, where a cloud runner's metadata service answers")
            } else if first == 100 && (64..128).contains(&second) {
                Some("an address in the shared space carriers use")
            } else if v4.is_multicast() || v4.is_broadcast() || first >= 240 {
                Some("a multicast, broadcast, or reserved address")
            } else {
                None
            }
        }
        IpAddr::V6(v6) => {
            if let Some(v4) = carried(v6) {
                return class(IpAddr::V4(v4));
            }
            let first = v6.segments()[0];
            if v6.is_loopback() {
                Some("an address on this machine")
            } else if v6.is_unspecified() {
                Some("an address that reaches this machine")
            } else if first & 0xfe00 == 0xfc00 || first & 0xffc0 == 0xfec0 {
                Some("an address on a private network")
            } else if first & 0xffc0 == 0xfe80 {
                Some("a link-local address, where a cloud runner's metadata service answers")
            } else if first & 0xff00 == 0xff00 {
                Some("a multicast, broadcast, or reserved address")
            } else {
                None
            }
        }
    }
}

/// The addresses a cloud runner's metadata service answers at, which no
/// setting opens: AWS's, Azure's, Google's, and Oracle's at 169.254.169.254,
/// AWS's over IPv6, and Alibaba Cloud's, which sits in the shared space
/// carriers use.
const METADATA: [IpAddr; 3] = [
    IpAddr::V4(Ipv4Addr::new(169, 254, 169, 254)),
    IpAddr::V6(Ipv6Addr::new(0xfd00, 0xec2, 0, 0, 0, 0, 0, 0x254)),
    IpAddr::V4(Ipv4Addr::new(100, 100, 100, 200)),
];

/// Whether `address` is one an intranet server answers at: a private range
/// of RFC 1918, a unique local address, or the shared space carriers use,
/// and no cloud runner's metadata service.
fn intranet(address: IpAddr) -> bool {
    if METADATA.contains(&address) {
        return false;
    }
    match address {
        IpAddr::V4(v4) => {
            let [first, second, ..] = v4.octets();
            v4.is_private() || (first == 100 && (64..128).contains(&second))
        }
        IpAddr::V6(v6) => match carried(v6) {
            Some(v4) => intranet(IpAddr::V4(v4)),
            None => v6.segments()[0] & 0xfe00 == 0xfc00,
        },
    }
}

/// Lowers `host` and drops the brackets and the final dot a name may carry.
fn bare(host: &str) -> String {
    host.trim()
        .trim_start_matches('[')
        .trim_end_matches(']')
        .trim_end_matches('.')
        .to_ascii_lowercase()
}

/// What a request from the host application's own process may reach beyond
/// the public internet: this machine, where the setting or grant names `localhost` or a
/// name under it, each address it names as itself, that address alone, and
/// an intranet address, for a name the person's own settings open.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Reach {
    /// Whether any name may resolve to an intranet address, as for the
    /// sign-in of a server that is on one.
    intranet: bool,
    loopback: bool,
    named: Vec<IpAddr>,
    /// Whether a refusal of an intranet address names `tools.fetch_private`,
    /// which only the fetch tool reads.
    opens: bool,
    /// The names that may resolve to an intranet address, with their
    /// subdomains.
    private: Vec<String>,
}

impl Reach {
    /// What `hosts`, the hosts a setting or a grant names, let through.
    #[must_use]
    pub fn of(hosts: &[String]) -> Self {
        let mut reach = Self::default();
        for host in hosts {
            let host = bare(host);
            if host == "localhost" || host.ends_with(".localhost") {
                reach.loopback = true;
            } else if let Ok(address) = host.parse::<IpAddr>() {
                reach.named.push(address);
            }
        }
        reach
    }

    /// This reach, where each of `hosts`, the names `tools.fetch_private`
    /// in the person's own settings lists, and its subdomains may resolve
    /// to an intranet address. A name stands for itself alone, so `*` opens
    /// nothing.
    #[must_use]
    pub fn private(mut self, hosts: &[String]) -> Self {
        self.opens = true;
        self.private = hosts
            .iter()
            .map(|host| bare(host))
            .filter(|host| !host.is_empty() && host != "*")
            .collect();
        self
    }

    /// Why a request may not connect to `address`, if it may not.
    #[must_use]
    pub fn refused(&self, address: IpAddr) -> Option<&'static str> {
        if self.named.contains(&address)
            || (self.loopback && loopback(address))
            || (self.intranet && intranet(address))
        {
            return None;
        }
        class(address)
    }

    /// What a request made for the server at `url`, such as its sign-in,
    /// may reach: the public internet, this machine where the server is on
    /// it, and the person's network where the server is on that, so an
    /// authorization server beside the server is reached. Link-local
    /// addresses and a cloud runner's metadata service stay refused, since
    /// no server a person names answers there.
    pub async fn around(url: &reqwest::Url) -> Self {
        let mut reach = Self::default();
        let Some(host) = url.host_str().map(bare) else {
            return reach;
        };
        let addresses: Vec<IpAddr> = if let Ok(address) = host.parse::<IpAddr>() {
            vec![address]
        } else {
            let port = url.port_or_known_default().unwrap_or(443);
            tokio::net::lookup_host((host.as_str(), port))
                .await
                .map(|found| found.map(|address| address.ip()).collect())
                .unwrap_or_default()
        };
        for address in addresses {
            if loopback(address) {
                reach.loopback = true;
            } else if intranet(address) {
                reach.intranet = true;
            }
        }
        reach
    }

    /// Why a request to `host` may not connect to `address`, one of the
    /// addresses `host` resolved to, if it may not.
    #[must_use]
    pub fn refused_for(&self, host: &str, address: IpAddr) -> Option<&'static str> {
        let why = self.refused(address)?;
        let host = bare(host);
        let opened = self
            .private
            .iter()
            .any(|name| host == *name || host.ends_with(&format!(".{name}")));
        if opened && intranet(address) {
            None
        } else {
            Some(why)
        }
    }

    /// What to do about a refusal of `address` for `host`, where a setting
    /// can lift it.
    fn remedy(&self, host: &str, address: IpAddr) -> String {
        if self.opens && intranet(address) {
            format!(
                "; to fetch from a server on your network by this name, add {} to tools.fetch_private in your user settings",
                bare(host)
            )
        } else {
            String::new()
        }
    }

    /// Why a request may not go to `url`, where its host is an address given
    /// as itself, which the client connects to without resolving.
    #[must_use]
    pub fn literal(&self, url: &reqwest::Url) -> Option<String> {
        let host = url.host_str()?;
        let address = host
            .trim_start_matches('[')
            .trim_end_matches(']')
            .parse::<IpAddr>()
            .ok()?;
        self.refused(address).map(|why| {
            format!(
                "{host} is {why}, which is not fetched from unless a setting or a grant names it"
            )
        })
    }
}

/// A resolver that hands the client only the addresses [`Reach`] lets
/// through, so the client connects to an address that was checked and never
/// resolves the name again.
pub struct Guarded {
    pub reach: Reach,
}

impl reqwest::dns::Resolve for Guarded {
    fn resolve(&self, name: reqwest::dns::Name) -> reqwest::dns::Resolving {
        let reach = self.reach.clone();
        let host = name.as_str().to_owned();
        Box::pin(async move {
            let found: Vec<SocketAddr> =
                tokio::net::lookup_host((host.as_str(), 0)).await?.collect();
            let mut refused = None;
            let kept: Vec<SocketAddr> = found
                .into_iter()
                .filter(|address| match reach.refused_for(&host, address.ip()) {
                    None => true,
                    Some(why) => {
                        refused = Some((address.ip(), why));
                        false
                    }
                })
                .collect();
            if kept.is_empty() {
                let why = match refused {
                    Some((address, why)) => format!(
                        "{host} resolves to {address}, {why}, which is not fetched from unless a setting or a grant names it{}",
                        reach.remedy(&host, address)
                    ),
                    None => format!("{host} resolves to no address"),
                };
                return Err(why.into());
            }
            Ok(Box::new(kept.into_iter()) as reqwest::dns::Addrs)
        })
    }
}

/// `error` with every cause under it, which is where a refused address says
/// why.
pub fn said(error: &(dyn std::error::Error + 'static)) -> String {
    let mut text = error.to_string();
    let mut cause = error.source();
    while let Some(under) = cause {
        let more = under.to_string();
        if !text.contains(&more) {
            text.push_str(": ");
            text.push_str(&more);
        }
        cause = under.source();
    }
    text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_request_reaches_only_the_public_internet_unless_a_grant_names_more() {
        let public = Reach::of(&["example.com".to_owned(), "*".to_owned()]);
        let refused = |address: &str| public.refused(address.parse().unwrap()).is_some();

        for address in [
            "127.0.0.1",
            "127.9.9.9",
            "0.0.0.0",
            "10.1.2.3",
            "172.16.0.1",
            "192.168.1.1",
            "169.254.169.254",
            "100.64.0.1",
            "100.100.100.200",
            "224.0.0.1",
            "255.255.255.255",
            "::1",
            "::",
            "::ffff:127.0.0.1",
            "::ffff:169.254.169.254",
            "64:ff9b::a9fe:a9fe",
            "2002:a9fe:a9fe::1",
            "fd00:ec2::254",
            "fc00::1",
            "fe80::1",
            "fec0::1",
            "ff02::1",
        ] {
            assert!(refused(address), "{address}");
        }
        for address in ["93.184.215.14", "8.8.8.8", "100.128.0.1", "2606:4700::1111"] {
            assert!(!refused(address), "{address}");
        }

        let local = Reach::of(&["localhost".to_owned()]);
        assert!(local.refused("127.0.0.1".parse().unwrap()).is_none());
        assert!(local.refused("::1".parse().unwrap()).is_none());
        assert!(local.refused("10.0.0.1".parse().unwrap()).is_some());
        let named = Reach::of(&["10.0.0.5".to_owned()]);
        assert!(named.refused("10.0.0.5".parse().unwrap()).is_none());
        assert!(named.refused("10.0.0.6".parse().unwrap()).is_some());
        assert!(named.refused("127.0.0.1".parse().unwrap()).is_some());
    }

    #[test]
    fn an_address_given_as_itself_is_checked_as_the_client_reads_it() {
        let reach = Reach::of(&["*".to_owned()]);
        let url = |text: &str| reqwest::Url::parse(text).unwrap();

        assert!(reach
            .literal(&url("http://169.254.169.254/latest/meta-data/"))
            .is_some());
        assert!(
            reach.literal(&url("http://0x7f000001/")).is_some(),
            "read as 127.0.0.1"
        );
        assert!(
            reach.literal(&url("http://2130706433/")).is_some(),
            "read as 127.0.0.1"
        );
        assert!(reach.literal(&url("http://[::ffff:7f00:1]/")).is_some());
        assert!(reach.literal(&url("https://example.com/")).is_none());
    }

    #[test]
    fn a_name_your_settings_open_reaches_your_network_and_never_metadata_or_this_machine() {
        let reach = Reach::of(&["*".to_owned()]).private(&["docs.internal.example.".to_owned()]);
        let refused = |host: &str, address: &str| reach.refused_for(host, address.parse().unwrap());

        for address in [
            "10.0.0.5",
            "172.16.4.4",
            "192.168.1.20",
            "100.64.0.9",
            "fd12:3456::1",
        ] {
            assert_eq!(refused("docs.internal.example", address), None, "{address}");
        }
        assert_eq!(refused("wiki.docs.internal.example", "10.0.0.6"), None);
        assert_eq!(refused("DOCS.internal.example.", "10.0.0.6"), None);
        assert!(refused("internal.example", "10.0.0.5").is_some());
        assert!(refused("docs.internal.example.attacker.example", "10.0.0.5").is_some());
        for address in [
            "169.254.169.254",
            "fd00:ec2::254",
            "100.100.100.200",
            "::ffff:169.254.169.254",
            "2002:6464:64c8::1",
            "127.0.0.1",
            "::1",
            "169.254.10.10",
            "fe80::1",
            "0.0.0.0",
            "224.0.0.1",
        ] {
            assert!(
                refused("docs.internal.example", address).is_some(),
                "{address}"
            );
        }
        assert_eq!(
            refused("docs.internal.example", "93.184.215.14"),
            None,
            "a public address needs no opening"
        );

        let everything = Reach::of(&["*".to_owned()]).private(&["*".to_owned()]);
        assert!(everything
            .refused_for("anything.example", "10.0.0.5".parse().unwrap())
            .is_some());
    }

    #[tokio::test]
    async fn a_sign_in_reaches_where_its_server_is_and_never_metadata() {
        let url = |text: &str| reqwest::Url::parse(text).unwrap();
        let refused =
            |reach: &Reach, address: &str| reach.refused(address.parse().unwrap()).is_some();

        let public = Reach::around(&url("https://93.184.215.14/mcp")).await;
        let local = Reach::around(&url("http://127.0.0.1:8080/mcp")).await;
        let intranet = Reach::around(&url("https://10.0.0.5/mcp")).await;

        for address in ["127.0.0.1", "10.0.0.6", "169.254.169.254"] {
            assert!(refused(&public, address), "{address}");
        }
        assert!(!refused(&public, "8.8.8.8"));
        assert!(!refused(&local, "127.0.0.1"));
        assert!(refused(&local, "10.0.0.6"));
        assert!(!refused(&intranet, "10.0.0.6"));
        assert!(!refused(&intranet, "fd12::1"));
        for address in [
            "169.254.169.254",
            "fd00:ec2::254",
            "100.100.100.200",
            "127.0.0.1",
        ] {
            assert!(refused(&intranet, address), "{address}");
        }
    }

    #[tokio::test]
    async fn a_name_your_settings_open_still_does_not_reach_this_machine() {
        use reqwest::dns::Resolve as _;
        let guarded = Guarded {
            reach: Reach::of(&["*".to_owned()]).private(&["localhost".to_owned()]),
        };

        let refused = guarded
            .resolve("localhost".parse().unwrap())
            .await
            .err()
            .unwrap()
            .to_string();

        assert!(refused.contains("an address on this machine"), "{refused}");
        assert!(!refused.contains("tools.fetch_private"), "{refused}");
    }

    #[tokio::test]
    async fn a_name_that_resolves_to_this_machine_is_refused_before_any_connection() {
        use reqwest::dns::Resolve as _;
        let guarded = Guarded {
            reach: Reach::of(&["*".to_owned()]),
        };

        let refused = guarded
            .resolve("localhost".parse().unwrap())
            .await
            .err()
            .unwrap()
            .to_string();

        assert!(refused.starts_with("localhost resolves to "), "{refused}");
        assert!(refused.contains("an address on this machine"), "{refused}");
        let allowed = Guarded {
            reach: Reach::of(&["localhost".to_owned()]),
        };
        assert!(allowed.resolve("localhost".parse().unwrap()).await.is_ok());
    }

    #[test]
    fn only_a_host_that_resolves_to_loopback_alone_is_this_machine() {
        assert!(on_this_machine("http://localhost:11434"));
        assert!(on_this_machine("http://127.0.0.1:11434/v1"));
        assert!(on_this_machine("http://127.8.9.10"));
        assert!(on_this_machine("http://[::1]:8080"));
        assert!(on_this_machine("http://[::ffff:127.0.0.1]:8080"));
        assert!(on_this_machine("unix:///var/run/ollama.sock"));
        assert!(on_this_machine(
            "http+unix://%2Fvar%2Frun%2Follama.sock/api"
        ));

        assert!(!on_this_machine("https://localhost.attacker.example"));
        assert!(!on_this_machine("https://evil.example/?127.0.0.1"));
        assert!(!on_this_machine("https://evil.example/localhost"));
        assert!(!on_this_machine("http://127.0.0.1.attacker.example"));
        assert!(!on_this_machine("http://10.0.0.5:11434"));
        assert!(!on_this_machine("https://ollama.com"));
        assert!(!on_this_machine("not a url"));
    }
}
