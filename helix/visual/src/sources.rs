//! Where entries come from, and the servers some of them need running.
//!
//! **Four kinds of source, and the binary lists every one.** HTML files from a
//! glob, a server's routes or its sitemap, a Storybook's stories from its
//! `index.json`, and a JSON catalog of addresses. The driver fetches what a
//! running server answers, so this file needs no HTTP of its own.
//!
//! **A server is started only when nothing answers at its address**, so a dev
//! server you already have running is used as it is. One this starts is
//! stopped when the run ends, whatever the outcome, with its whole process
//! group, since `npm run start` is a shell that starts the server as a child.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};

use fusion_rules::error::{Failure, Outcome};
use serde_json::{json, Value};

use crate::config::{CatalogSource, Config, Route, Served, ServerSource, Source, StorybookSource};
use crate::discover::{self, Entry};
use crate::driver::Driver;

/// The servers this run started, stopped when it is dropped.
pub struct Servers {
    started: Vec<Child>,
}

impl Drop for Servers {
    fn drop(&mut self) {
        for child in &mut self.started {
            stop(child);
        }
    }
}

/// Stops a server and everything it started, and waits for it, never for
/// long.
///
/// **`--` before the group**, because procps `kill` on Linux reads `-1234` as
/// an option and signals nothing. macOS's `kill` takes it either way, so a run
/// there ended and the same run on a runner waited for a server that never
/// stopped, until the job's timeout.
///
/// **Bounded.** Ten seconds after `TERM` the group gets `KILL`, so a server that
/// ignores the first signal cannot hold the run open.
#[cfg(unix)]
fn stop(child: &mut Child) {
    let group = format!("-{}", child.id());
    let signal = |name: &str| {
        let _ = Command::new("kill")
            .args(["-s", name, "--", &group])
            .stderr(Stdio::null())
            .status();
    };
    signal("TERM");
    for _ in 0..100 {
        if matches!(child.try_wait(), Ok(Some(_))) {
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    signal("KILL");
    let _ = child.kill();
    let _ = child.wait();
}

#[cfg(not(unix))]
fn stop(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

/// `scheme://host:port` of an address, which is what the driver lets
/// requests reach.
pub fn origin(url: &str) -> String {
    let after = url.find("://").map_or(0, |at| at + 3);
    let end = url[after..].find('/').map_or(url.len(), |at| after + at);
    url[..end].to_string()
}

/// Whether anything answers at `url`, asked through the driver.
fn answers(driver: &mut Driver, url: &str) -> bool {
    driver
        .ask(&json!({ "op": "fetch", "url": url }))
        .is_ok_and(|answer| {
            answer["ok"].as_bool().unwrap_or(false) || answer["status"].as_u64().is_some()
        })
}

/// Starts every source's server that is not already answering.
///
/// # Errors
///
/// A server that cannot be started, or does not answer in its time.
pub fn start(config: &Config, base: &Path, driver: &mut Driver) -> Outcome<Servers> {
    let mut servers = Servers {
        started: Vec::new(),
    };
    for source in &config.sources {
        let Some(served) = source.server() else {
            continue;
        };
        if answers(driver, &served.url) {
            eprintln!(
                "helix: {} answers already, so the source `{}` uses it.",
                served.url, served.name
            );
            continue;
        }
        let Some(command) = &served.start else {
            return Err(Failure::input(
                format!("the source `{}`", served.name),
                format!(
                    "nothing answers at {} and the source has no `start` command",
                    served.url
                ),
            ));
        };
        let cwd = served
            .cwd
            .as_ref()
            .map_or_else(|| base.to_path_buf(), |cwd| base.join(cwd));
        let mut shell = Command::new("sh");
        shell
            .arg("-c")
            .arg(command)
            .current_dir(&cwd)
            .stdin(Stdio::null())
            /* The server's own output goes where the driver's does, so the
            verdict lines on standard output stay the run's alone. */
            .stdout(Stdio::from(std::io::stderr()))
            .stderr(Stdio::inherit());
        #[cfg(unix)]
        std::os::unix::process::CommandExt::process_group(&mut shell, 0);
        let child = shell.spawn().map_err(|error| {
            Failure::input(
                format!("cannot start `{command}`"),
                error.to_string().to_lowercase(),
            )
        })?;
        servers.started.push(child);
        let waited = driver
            .ask(&json!({ "op": "wait", "seconds": served.timeout, "url": served.url }))
            .map_err(|why| Failure::input(format!("the source `{}`", served.name), why))?;
        if waited["up"] != true {
            return Err(unanswered(served, command));
        }
        eprintln!("helix: {} answers, started by `{command}`.", served.url);
    }
    Ok(servers)
}

/// A `start` command whose server did not answer, with the setting that gives
/// a slow server longer.
fn unanswered(served: &Served, command: &str) -> Failure {
    Failure::input(
        format!("the source `{}`", served.name),
        format!(
            "`{command}` started and nothing answered at {} within {} seconds",
            served.url, served.timeout
        ),
    )
    .hint("a server that needs longer names it in seconds, in the source's `timeout`")
}

/// A route as the name its baselines take: `/` is `index`, and every other
/// route its path with each `/` a `-`.
pub fn slug(path: &str) -> String {
    let trimmed = path
        .split(['?', '#'])
        .next()
        .unwrap_or_default()
        .trim_matches('/');
    if trimmed.is_empty() {
        "index".to_string()
    } else {
        trimmed.replace('/', "-")
    }
}

/// Every route a sitemap lists, as paths, whatever host it names: a sitemap
/// built for production lists production's addresses.
pub fn sitemap_paths(xml: &str) -> Vec<String> {
    let mut out = Vec::new();
    for piece in xml.split("<loc>").skip(1) {
        let Some(address) = piece.split("</loc>").next() else {
            continue;
        };
        let address = address.trim().replace("&amp;", "&");
        let path = match address.find("://") {
            Some(at) => address[at + 3..]
                .find('/')
                .map_or("/".to_string(), |slash| {
                    address[at + 3 + slash..].to_string()
                }),
            None => address,
        };
        if !out.contains(&path) {
            out.push(path);
        }
    }
    out
}

/// The stories in a Storybook `index.json`, filtered by tags, as ids.
///
/// # Errors
///
/// The index is not one Storybook writes.
pub fn storybook_ids(
    index: &Value,
    include: &[String],
    exclude: &[String],
) -> Result<Vec<String>, String> {
    let entries = index
        .get("entries")
        .or_else(|| index.get("stories"))
        .and_then(Value::as_object)
        .ok_or("the index has neither `entries` nor `stories`")?;
    let mut out = Vec::new();
    for (id, entry) in entries {
        if entry
            .get("type")
            .and_then(Value::as_str)
            .is_some_and(|kind| kind != "story")
        {
            continue;
        }
        let tags: Vec<&str> = entry
            .get("tags")
            .and_then(Value::as_array)
            .map(|tags| tags.iter().filter_map(Value::as_str).collect())
            .unwrap_or_default();
        if !include.is_empty() && !include.iter().any(|tag| tags.contains(&tag.as_str())) {
            continue;
        }
        if exclude.iter().any(|tag| tags.contains(&tag.as_str())) {
            continue;
        }
        out.push(id.clone());
    }
    out.sort();
    Ok(out)
}

/// The `id` and `url` of every entry in a catalog: an array, or an object
/// whose `entries` is one.
///
/// # Errors
///
/// The catalog is not that shape.
pub fn catalog_entries(catalog: &Value) -> Result<Vec<(String, String)>, String> {
    let listed = catalog
        .as_array()
        .or_else(|| catalog.get("entries").and_then(Value::as_array))
        .ok_or("a catalog is an array of entries, or an object whose `entries` is one")?;
    listed
        .iter()
        .map(|one| match (one["id"].as_str(), one["url"].as_str()) {
            (Some(id), Some(url)) => Ok((id.to_string(), url.to_string())),
            _ => Err(format!(
                "every catalog entry has a string `id` and `url`, and one is {one}"
            )),
        })
        .collect()
}

/// `url` joined onto a server's address when it is a path.
fn on(server: &str, url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.to_string()
    } else {
        format!(
            "{}/{}",
            server.trim_end_matches('/'),
            url.trim_start_matches('/')
        )
    }
}

fn fetched(driver: &mut Driver, url: &str, source: &str) -> Outcome<String> {
    let answer = driver
        .ask(&json!({ "op": "fetch", "url": url }))
        .map_err(|why| Failure::input(format!("the source `{source}`"), why))?;
    if answer["ok"] != true {
        return Err(Failure::input(
            format!("the source `{source}`"),
            format!("{url} answered {}", answer["status"]),
        ));
    }
    Ok(answer["text"].as_str().unwrap_or_default().to_string())
}

/// The selector and the status each named route gives, by the name its
/// baselines take.
fn route_settings(source: &ServerSource) -> BTreeMap<String, (Option<String>, Option<u16>)> {
    source
        .routes
        .iter()
        .filter_map(|route| match route {
            Route::Path(_) => None,
            Route::Named {
                name,
                path,
                selector,
                status,
            } => Some((
                name.clone().unwrap_or_else(|| slug(path)),
                (selector.clone(), *status),
            )),
        })
        .collect()
}

/// `(name, url)` for each page a server source pictures.
fn server_pages(source: &ServerSource, driver: &mut Driver) -> Outcome<Vec<(String, String)>> {
    let mut out: Vec<(String, String)> = source
        .routes
        .iter()
        .map(|route| match route {
            Route::Path(path) => (slug(path), on(&source.server.url, path)),
            Route::Named { name, path, .. } => (
                name.clone().unwrap_or_else(|| slug(path)),
                on(&source.server.url, path),
            ),
        })
        .collect();
    if let Some(sitemap) = &source.sitemap {
        let xml = fetched(
            driver,
            &on(&source.server.url, sitemap),
            &source.server.name,
        )?;
        for path in sitemap_paths(&xml) {
            let url = on(&source.server.url, &path);
            if !out.iter().any(|(_, known)| *known == url) {
                out.push((slug(&path), url));
            }
        }
    }
    Ok(out)
}

fn storybook_pages(
    source: &StorybookSource,
    driver: &mut Driver,
) -> Outcome<Vec<(String, String)>> {
    let named = &source.server.name;
    let text = fetched(driver, &on(&source.server.url, "/index.json"), named)?;
    let index: Value = serde_json::from_str(&text).map_err(|error| {
        Failure::input(
            format!("the source `{named}`"),
            format!("its index.json is not JSON: {error}"),
        )
    })?;
    let ids = storybook_ids(&index, &source.include, &source.exclude)
        .map_err(|why| Failure::input(format!("the source `{named}`"), why))?;
    Ok(ids
        .into_iter()
        .map(|id| {
            let url = on(
                &source.server.url,
                &format!("/iframe.html?id={id}&viewMode=story"),
            );
            (id, url)
        })
        .collect())
}

fn catalog_pages(source: &CatalogSource, base: &Path) -> Outcome<Vec<(String, String)>> {
    let named = &source.server.name;
    let file = base.join(&source.catalog);
    let text = std::fs::read_to_string(&file).map_err(|error| {
        Failure::input(
            format!("cannot read {}", file.display()),
            error.to_string().to_lowercase(),
        )
    })?;
    let catalog: Value = serde_json::from_str(&text).map_err(|error| {
        Failure::input(
            format!("the source `{named}`"),
            format!("its catalog is not JSON: {error}"),
        )
    })?;
    let listed = catalog_entries(&catalog)
        .map_err(|why| Failure::input(format!("the source `{named}`"), why))?;
    Ok(listed
        .into_iter()
        .map(|(id, url)| (id, on(&source.server.url, &url)))
        .collect())
}

/// The two sides of each pair a `pairs` source's `prepare` builds, with the
/// files it asks the harness to serve.
///
/// **`changed` is handed to `prepare` and read by nothing here.** Which entries
/// a change reaches is a fact about the project, such as which components
/// compose which, so the config decides and returns only those.
fn pair_entries(
    index: usize,
    name: &str,
    changed: Option<&str>,
    driver: &mut Driver,
    serve: &mut BTreeMap<String, PathBuf>,
) -> Outcome<Vec<Entry>> {
    let source = || format!("the source `{name}`");
    let answer = driver
        .ask(&json!({ "changed": changed, "op": "prepare", "source": name }))
        .map_err(|why| Failure::input(source(), why))?;
    if let Some(note) = answer["note"].as_str() {
        eprintln!("helix: {name}: {note}");
    }
    if let Some(mounts) = answer["serve"].as_object() {
        for (url, path) in mounts {
            let Some(path) = path.as_str() else {
                return Err(Failure::input(
                    source(),
                    format!("`prepare` serves {url} from something that is not a path"),
                ));
            };
            serve.insert(url.clone(), PathBuf::from(path));
        }
    }
    let listed = answer["pairs"]
        .as_array()
        .ok_or_else(|| Failure::input(source(), "`prepare` returned no `pairs` array"))?;
    let mut out = Vec::new();
    for pair in listed {
        let Some(entry) = pair["name"].as_str().filter(|one| !one.is_empty()) else {
            return Err(Failure::input(
                source(),
                format!("a pair has no `name`: {pair}"),
            ));
        };
        for side in ["a", "b"] {
            let given = &pair[side];
            if given["body"].as_str().is_none()
                && given["url"].as_str().is_none()
                && given["error"].as_str().is_none()
            {
                return Err(Failure::input(
                    source(),
                    format!(
                        "the pair `{entry}` gives its side `{side}` no `body`, `url` or `error`"
                    ),
                ));
            }
        }
        out.push(Entry {
            dir: PathBuf::new(),
            file: None,
            group: pair["group"].as_str().unwrap_or(entry).to_string(),
            id: format!("{name}/{entry}"),
            name: entry.to_string(),
            sides: Some(Box::new([pair["a"].clone(), pair["b"].clone()])),
            source: index,
            stem: String::new(),
            selector: None,
            status: None,
            url: None,
        });
    }
    Ok(out)
}

/// Every entry of every source, in config order and then in each source's
/// own order, and the files the sources ask the harness to serve.
///
/// # Errors
///
/// A source that cannot be listed, or two entries with one id.
pub fn entries(
    config: &Config,
    base: &Path,
    driver: &mut Driver,
    changed: Option<&str>,
) -> Outcome<(Vec<Entry>, BTreeMap<String, PathBuf>)> {
    let mut out: Vec<Entry> = Vec::new();
    let mut serve = BTreeMap::new();
    for (index, source) in config.sources.iter().enumerate() {
        let name = source.name().to_string();
        let found: Vec<Entry> = match source {
            Source::Html(html) => {
                let root = base.join(&html.root);
                discover::matches(&root, &html.glob)
                    .map_err(|why| Failure::input(format!("the source `{name}`"), why))?
                    .into_iter()
                    .map(|(entry, file)| Entry {
                        dir: file.parent().map(Path::to_path_buf).unwrap_or_default(),
                        group: entry.clone(),
                        id: format!("{name}/{entry}"),
                        name: entry,
                        sides: None,
                        source: index,
                        stem: file
                            .file_stem()
                            .map(|stem| stem.to_string_lossy().into_owned())
                            .unwrap_or_default(),
                        file: Some(file),
                        selector: None,
                        status: None,
                        url: None,
                    })
                    .collect()
            }
            Source::Pairs(_) => pair_entries(index, &name, changed, driver, &mut serve)?,
            _ => {
                let pages = match source {
                    Source::Server(one) => server_pages(one, driver)?,
                    Source::Storybook(one) => storybook_pages(one, driver)?,
                    Source::Catalog(one) => catalog_pages(one, base)?,
                    Source::Html(_) | Source::Pairs(_) => unreachable!("matched above"),
                };
                let dir: PathBuf = source
                    .server()
                    .map(|served| base.join(&served.baselines))
                    .unwrap_or_default();
                let settings = match source {
                    Source::Server(one) => route_settings(one),
                    _ => BTreeMap::new(),
                };
                pages
                    .into_iter()
                    .map(|(entry, url)| {
                        let (selector, status) = settings.get(&entry).cloned().unwrap_or_default();
                        Entry {
                            dir: dir.clone(),
                            file: None,
                            group: entry.clone(),
                            id: format!("{name}/{entry}"),
                            sides: None,
                            stem: entry.clone(),
                            name: entry,
                            selector,
                            source: index,
                            status,
                            url: Some(url),
                        }
                    })
                    .collect()
            }
        };
        for entry in found {
            /* A pair writes no baseline, so its name may carry a path. */
            if entry.sides.is_none()
                && (entry.name.is_empty()
                    || entry.name.contains(['/', '\\'])
                    || entry.name.starts_with('.'))
            {
                return Err(Failure::input(
                    format!("the source `{name}`"),
                    format!(
                        "`{}` cannot name a baseline file: name it in the config",
                        entry.name
                    ),
                ));
            }
            if out.iter().any(|known| known.id == entry.id) {
                return Err(Failure::input(
                    format!("the source `{name}`"),
                    format!("two entries are named `{}`", entry.id),
                ));
            }
            out.push(entry);
        }
    }
    /* A pairs source whose `prepare` found nothing the change reaches is a
    run with nothing to do, and says so; every other empty list is a
    config that matches nothing. */
    let only_pairs = config
        .sources
        .iter()
        .all(|source| matches!(source, Source::Pairs(_)));
    if out.is_empty() && !only_pairs {
        return Err(Failure::input("the sources", "they list no entry"));
    }
    Ok((out, serve))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_server_that_never_answers_names_the_setting_that_gives_it_longer() {
        let served: Served = serde_json::from_value(json!({
            "baselines": "shots",
            "name": "site",
            "url": "http://localhost:3000",
        }))
        .unwrap();
        let said = unanswered(&served, "npm start");
        assert!(said.why.contains("within 120 seconds"));
        assert!(said.hint.unwrap().contains("`timeout`"));
    }

    #[test]
    fn a_named_route_gives_its_selector_and_its_status() {
        let source: ServerSource = serde_json::from_value(json!({
            "baselines": "shots",
            "name": "site",
            "routes": ["/plain", { "path": "/map", "selector": "[data-ready]" }, { "name": "gone", "path": "/nope", "status": 404 }],
            "url": "http://localhost:3000",
        }))
        .unwrap();
        let settings = route_settings(&source);
        assert_eq!(settings["map"], (Some("[data-ready]".to_string()), None));
        assert_eq!(settings["gone"], (None, Some(404)));
        assert!(!settings.contains_key("plain"));
    }

    #[test]
    fn a_route_names_its_baselines() {
        assert_eq!(slug("/"), "index");
        assert_eq!(slug("/helix/docs/install/"), "helix-docs-install");
        assert_eq!(slug("/search?q=a"), "search");
    }

    #[test]
    fn an_origin_is_scheme_host_and_port() {
        assert_eq!(origin("http://localhost:3000/a/b"), "http://localhost:3000");
        assert_eq!(origin("https://fusion.dev"), "https://fusion.dev");
    }

    #[test]
    fn a_sitemap_gives_paths_on_any_host() {
        let xml = "<urlset><url><loc>https://fusion.dev/</loc></url>\
                   <url><loc> https://fusion.dev/helix/docs?a=1&amp;b=2 </loc></url>\
                   <url><loc>https://fusion.dev/</loc></url></urlset>";
        assert_eq!(sitemap_paths(xml), ["/", "/helix/docs?a=1&b=2"]);
    }

    #[test]
    fn storybook_stories_are_filtered_by_tags_and_docs_are_left_out() {
        let index = json!({ "v": 5, "entries": {
            "button--primary": { "type": "story", "tags": ["dev"] },
            "button--docs": { "type": "docs", "tags": ["dev"] },
            "card--plain": { "type": "story", "tags": ["dev", "skip-visual"] },
        }});
        assert_eq!(
            storybook_ids(&index, &[], &[]).unwrap(),
            ["button--primary", "card--plain"]
        );
        assert_eq!(
            storybook_ids(&index, &[], &["skip-visual".to_string()]).unwrap(),
            ["button--primary"]
        );
        assert!(storybook_ids(&json!({}), &[], &[]).is_err());
    }

    #[test]
    fn a_catalog_is_ids_and_addresses() {
        let listed = catalog_entries(&json!({ "entries": [{ "id": "a", "url": "/a" }] })).unwrap();
        assert_eq!(listed, [("a".to_string(), "/a".to_string())]);
        assert!(catalog_entries(&json!([{ "id": "a" }])).is_err());
    }

    #[test]
    fn a_path_is_joined_onto_its_server() {
        assert_eq!(
            on("http://localhost:3000/", "/a"),
            "http://localhost:3000/a"
        );
        assert_eq!(
            on("http://localhost:3000", "https://other/x"),
            "https://other/x"
        );
    }
}
