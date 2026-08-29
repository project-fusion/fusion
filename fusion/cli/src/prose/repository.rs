//! Every reference to this repository names the one place it lives.
//!
//! **A move leaves residue and nothing notices.** A published manifest carries
//! its `repository.url` into every tarball and onto its registry page, a
//! reference page builds its View Source link from it, and a code-owners file
//! names a team under the organization. Each of those is correct on the day it
//! is written and silently wrong from the day the repository moves.
//!
//! **The shape of the fault is the duplication**, so the root manifest declares
//! the URL once — the conventional field for it, and declarative there rather
//! than published, the root being private — and everything else agrees with it.
//!
//! **The former names are a list, and that is deliberate.** The alternative is
//! inferring which paths on the host are ours, which cannot be done: a
//! dependency's own repository is in this tree too and is nobody's mistake. A
//! move is an event, so recording the name it moved from is the honest way to
//! catch what the move missed.
//!
//! **The file holding that list is exempt, necessarily.** It names every former
//! path by definition, so a rule reading it reports the record as the residue.
//! Exempting the settings file rather than a hardcoded path is what makes that
//! true for a consumer's settings as well as this one's.

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
        let where_ = file
            .strip_prefix(&context.root)
            .unwrap_or(&file)
            .to_string_lossy()
            .replace('\\', "/");
        let Ok(source) = fs::read_to_string(&file) else {
            continue;
        };
        if where_ == "fusion.rules.json" {
            continue;
        }

        for stale in &context.settings.former {
            if !source.contains(stale.as_str()) {
                continue;
            }
            findings.push(Finding {
                detail: format!(
                    "It is at `{canonical}` now. If it has moved again, record the previous path \
                     so the next move is caught the same way."
                ),
                file: where_.clone(),
                message: format!("names `{stale}`, which is where this repository used to live"),
            });
        }

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
        unit: "files naming this repository",
    }
}
