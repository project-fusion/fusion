//! Every reference to this repository names the one place it lives.
//!
//! **A move leaves residue and nothing notices.** A published manifest carries
//! its `repository.url` into every tarball and onto its registry page, a
//! reference page builds its View Source link from it, and a code-owners file
//! names a team under the organization. Each of those is correct on the day it
//! is written and silently wrong from the day the repository moves.
//!
//! **The shape of the fault is the duplication**, so the root manifest declares
//! the URL once (the conventional field for it, and declarative there rather
//! than published, the root being private), and everything else agrees with it.
//!
//! **It checks agreement, not history.** This carried a list of the paths the
//! repository used to live at and reported any file still naming one. That list
//! was residue of one move, went clean, and stayed clean: a name nothing
//! references is a name the next contributor never types. Agreement with the
//! declared URL is the half that keeps earning its place.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::rules::{Context, Finding, Report};
use crate::workspace::crawl;

static DECLARED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"github\.com/([\w.-]+/[\w.-]+?)(?:\.git)?$").expect("a literal pattern compiles")
});

pub fn run(context: &Context) -> Report {
    let nothing = |findings| Report {
        checked: 0,
        findings,
        notes: Vec::new(),
        unit: "files naming this repository",
    };

    let Some(canonical) = fs::read_to_string(context.root.join("package.json"))
        .ok()
        .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
        .and_then(|one| Some(one.get("repository")?.get("url")?.as_str()?.to_owned()))
        .and_then(|url| Some(DECLARED.captures(&url)?[1].to_owned()))
    else {
        return nothing(vec![Finding {
            detail: "Nothing says where this repository lives, so every other reference to it is \
                     unverifiable."
                .to_owned(),
            file: "package.json".to_owned(),
            message: "the root manifest declares no `repository.url`".to_owned(),
        }]);
    };

    let mut files = Vec::new();
    crawl(&context.root, &|_| true, &mut files);

    let mut findings = Vec::new();
    let mut mentions = 0;
    let mut manifests = 0;

    for file in files {
        let where_ = context.relative(&file);
        let Ok(source) = fs::read_to_string(&file) else {
            continue;
        };
        if where_.ends_with("package.json") {
            let url = serde_json::from_str::<Value>(&source)
                .ok()
                .and_then(|one| Some(one.get("repository")?.get("url")?.as_str()?.to_owned()));
            if let Some(url) = url {
                manifests += 1;
                if !url.contains(&canonical) {
                    findings.push(Finding {
                        detail: "A published package carries this into its tarball and onto its \
                                 registry page, so a manifest that disagrees points readers at a \
                                 repository that is not this one."
                            .to_owned(),
                        file: where_.clone(),
                        message: format!(
                            "`repository.url` is `{url}`, and the root says `{canonical}`"
                        ),
                    });
                }
            }
        }

        if source.contains(&canonical) {
            mentions += 1;
        }
    }

    Report {
        checked: mentions + manifests,
        findings,
        notes: Vec::new(),
        unit: "files naming this repository",
    }
}
