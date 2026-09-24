//! Every link into this site names an address the site serves.
//!
//! **A dead documentation link is the one broken reference that travels.** A
//! stale path in a comment misleads whoever opens the file. A `@documentation`
//! tag is carried into the manifest, out through the framework typings, and on
//! into a consumer's editor, where it is the library's own answer to "where do
//! I read about this". On 16 Sep 2026 every one of those tags in Helix, and
//! every documentation link in the package READMEs and in `SUPPORT.md` beside
//! them, pointed at a subdomain that had stopped resolving. Nothing in the
//! workspace noticed, because nothing in the workspace was looking.
//!
//! **The neighbor that could have caught it and did not.** `references` already
//! resolves a markdown link target against the tree, and it had every one of
//! these in its hands: it skips any target carrying a scheme, on the reasoning
//! that an absolute URL is outside the repository's reach. That reasoning holds
//! for every host but one. A link to the site this repository builds is as
//! answerable as a link to a file in it, and answering it is this rule.
//!
//! **A `fusion prose` rule rather than a `helix component` one.** `helix
//! component` is the design system telling a *consumer* whether they extended it
//! correctly, and it runs in their repository against their components. Their
//! `@documentation` tags point at their own documentation, which this workspace
//! has never heard of and has no catalog for, so the rule would be unrunnable
//! everywhere it was meant to run. The subject here is narrower and local: what
//! this repository wrote down about the site this repository publishes, which is
//! what `fusion prose` is for. It is also the only side that sees the whole
//! corpus. The tags are in two component tiers, and the same dead host was in
//! eight package READMEs, an issue template and a unit test's fixtures, none of
//! which a component rule reads.
//!
//! **It reads the catalog, and never the network.** A check that resolved a URL
//! over HTTP would be slow, would fail on a laptop with no connection, and would
//! turn somebody else's outage into a red build. The site already writes one
//! document per route under its public folder, and `turbo run routes-check`
//! holds that tree to the route registry in both directions, so it is the route
//! list in a form a rule can read. Two addresses the site serves are not pages:
//! a `route.ts` under the app tree answers at its own path, and a file under the
//! public folder is served at its own path. All three are read.
//!
//! **What counts as this site is derived rather than listed.** The published
//! address is declared once, in the module named by `site.address`, and the host
//! in it is the one this site publishes. Any host at or under that domain is a
//! claim about this site: a subdomain that answers nothing looks exactly like
//! the canonical host in prose, and looking exactly right is how the last set
//! rotted. A link to anywhere else is somebody else's address and is left alone.
//!
//! **The catalog has to have been built.** `check:prose` runs the generator
//! first for that reason. Where the tree is not there this says so and names the
//! task, rather than reporting every link in the repository as unresolvable.

use std::collections::BTreeSet;
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

use fusion_rules::walk::{crawl, walk};
use regex::Regex;

use crate::rules::{Context, Finding, Report};

/// An absolute HTTP URL, as a host and whatever follows it.
///
/// The tail stops at whitespace and at the characters that close a link rather
/// than belong to one: a markdown target ends at `)`, a template literal at a
/// backtick, a quoted string at its quote.
static URL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)https?://([a-z0-9.-]+)([^\s"'`<>()\[\]\\|]*)"#)
        .expect("a literal pattern compiles")
});

/// The address a site module declares, which is the one host this site has.
static DECLARED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"SITE\s*=\s*['"]https?://([a-z0-9.-]+)['"]"#).expect("a literal pattern compiles")
});

/// What a link may be written in. An allowlist, because the alternative is
/// reading every font and every screenshot in the tree to find no URLs in them.
///
/// `.json` is in it because a package manifest's `homepage` is a claim about
/// this site like any other, and `.yml` because an issue template's placeholder
/// is the first address a reporter sees.
const EXTENSIONS: [&str; 13] = [
    ".css", ".html", ".json", ".md", ".mdx", ".mjs", ".rs", ".toml", ".ts", ".tsx", ".txt",
    ".yaml", ".yml",
];

/// What a build wrote into a source tree, which is not what anybody wrote.
///
/// **A finding in a derived file has its fix in the source, and the source is
/// already in the corpus**, so reading both is two reports of one fault. The
/// manifests and the catalog are where that is loudest: one tag reaches them as
/// a declaration, an entry and a page apiece, so a single stale link was
/// reported three hundred and eighty times, at line one, in files nobody can
/// edit. Measured 16 Sep 2026.
///
/// **Two shapes rather than a list of files.** `.generated.` is the naming
/// convention every generator in this workspace follows, and the analyzer's
/// output is the one that predates it. A generated file named like neither is
/// read, which is a miss and not a false report: it is judged against the same
/// catalog as its source and agrees with it or the source was already wrong.
fn derived(name: &str) -> bool {
    name.contains(".generated.") || name == "custom-elements.json"
}

/// The path a URL names, as the site would serve it.
///
/// A query and a fragment are the client's, never the server's, and a trailing
/// slash is the same address: the site redirects one to the other, so reporting
/// it as unserved would be a finding with nothing behind it.
fn address(tail: &str) -> String {
    let path = tail
        .split(['?', '#'])
        .next()
        .unwrap_or_default()
        /* Emphasis around a bare URL too, `**` or `_`, which sticks to it. */
        .trim_end_matches(['.', ',', ';', ':', '!', '*', '_']);
    if path.is_empty() || path == "/" {
        return "/".to_owned();
    }
    path.trim_end_matches('/').to_owned()
}

/// Every route, read off the document the site generates for each one.
///
/// **The documents rather than the registry**, because the registry is
/// TypeScript that computes two thirds of itself from other packages, and
/// `routes-check` already holds the two to each other in both directions. What
/// is on disk is therefore the route list, and it is the shape a rule can read.
fn routes(from: &Path) -> BTreeSet<String> {
    let mut documents = Vec::new();
    walk(
        from,
        &|path| path.extension().is_some_and(|one| one == "md"),
        &mut documents,
    );
    documents
        .iter()
        .filter_map(|path| path.strip_prefix(from).ok())
        .map(|path| {
            let slug = path.to_string_lossy().replace('\\', "/");
            let slug = slug.trim_end_matches(".md");
            if slug == "index" {
                "/".to_owned()
            } else {
                format!("/{slug}")
            }
        })
        .collect()
}

/// Every address a route handler answers at, which is every address that is not
/// a page: `llms.txt`, the manifest a consumer fetches, the token dump.
///
/// A route group is parentheses around a segment and is not part of the
/// address. A dynamic segment is, and no handler here has one, so one that
/// appears is reported rather than silently matching everything.
fn handlers(from: &Path) -> BTreeSet<String> {
    let mut found = Vec::new();
    crawl(
        from,
        &|path| path.file_name().is_some_and(|one| one == "route.ts"),
        &mut found,
    );
    found
        .iter()
        .filter_map(|path| path.parent()?.strip_prefix(from).ok())
        .map(|path| {
            let segments: Vec<String> = path
                .components()
                .map(|one| one.as_os_str().to_string_lossy().to_string())
                .filter(|one| !(one.starts_with('(') && one.ends_with(')')))
                .collect();
            format!("/{}", segments.join("/"))
        })
        .collect()
}

pub fn run(context: &Context) -> Report {
    const UNIT: &str = "links into this site";
    let site = &context.settings.site;
    let nothing = |findings: Vec<Finding>| Report {
        checked: 0,
        findings,
        notes: Vec::new(),
        unit: UNIT,
    };

    let Some(published) = fs::read_to_string(context.root.join(&site.address))
        .ok()
        .and_then(|text| Some(DECLARED.captures(&text)?[1].to_owned()))
    else {
        return nothing(Vec::new());
    };

    let pages = routes(&context.root.join(&site.routes));
    if pages.is_empty() {
        return nothing(vec![Finding {
            detail: "`turbo run catalog` writes one document per route, and `check:prose` runs \
                     it first. Without them there is no catalog to resolve against, and every \
                     link in the tree would read as dead."
                .to_owned(),
            file: site.routes.clone(),
            message: "has no route documents, so this rule has nothing to resolve against"
                .to_owned(),
        }]);
    }
    let answered = handlers(&context.root.join(&site.app));
    let assets = context.root.join(&site.routes);

    let mut files = Vec::new();
    crawl(
        &context.root,
        &|path| {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            EXTENSIONS.iter().any(|one| name.ends_with(one)) && !derived(&name)
        },
        &mut files,
    );

    let mut findings = Vec::new();
    let mut checked = 0;
    for file in &files {
        let Ok(text) = fs::read_to_string(file) else {
            continue;
        };
        let where_ = context.relative(file);
        for found in URL.captures_iter(&text) {
            let host = found[1].to_lowercase();
            let host = host.trim_end_matches('.');
            let ours = host == published || host.ends_with(&format!(".{published}"));
            if !ours {
                continue;
            }
            checked += 1;
            let at = format!(
                "{where_}:{}",
                text[..found.get(0).expect("group zero always matches").start()]
                    .matches('\n')
                    .count()
                    + 1
            );
            if host != published {
                findings.push(Finding {
                    detail: format!(
                        "The published address is declared once, in `{}`. A subdomain that \
                         answers nothing reads exactly like the host that does.",
                        site.address
                    ),
                    file: at,
                    message: format!(
                        "`{host}` is not a host this site publishes, `{published}` is"
                    ),
                });
                continue;
            }
            let path = address(&found[2]);
            let file_at = path.trim_start_matches('/');
            let serves = pages.contains(&path)
                || answered.contains(&path)
                || (!file_at.is_empty() && !path.contains("..") && assets.join(file_at).is_file());
            if !serves {
                findings.push(Finding {
                    detail: format!(
                        "Resolved against the route documents under `{}` and the handlers under \
                         `{}`, which is the whole of what this site answers at.",
                        site.routes, site.app
                    ),
                    file: at,
                    message: format!("`{path}` is not an address this site serves"),
                });
            }
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: UNIT,
    }
}
