//! What the two command lines hold in common, and nothing either owns.
//!
//! **A rule measures and returns; it never prints and never exits.** That split
//! is what makes one command able to render the same measurement three ways:
//! quiet for CI, printed for a person, and JSON for a script. It is also what
//! lets a meta rule read another rule's count rather than parsing integers out
//! of its prose, which is how it was done before and could be fooled by a
//! sentence.
//!
//! **This crate carries no product, which is what lets both depend on it.**
//! `helix component` and `fusion workspace` were one command line written
//! twice: the rule and report types, the runner that measures a set of rules,
//! the `fix` verb, the `--only` check, the JSON payload, the audit screen, the
//! exit codes, the error format, color and the walker, about eight hundred
//! lines held identical by hand and by a test. The argument for the copy was
//! lockstep: Helix and Fusion release from separate tags, so neither product
//! may depend on the other, and a crate inside either would make one release
//! wait on the other. That argument survives this crate because it is inside
//! neither: it knows what a rule is and not what a component or a workspace
//! is. The context a rule reads is a type parameter, each product declares its
//! own, and no product depends on the other. Taken by path at `0.0.0-dev`
//! like every crate here, so a change to it is a change to both command lines
//! in one commit, which is what the twin test was holding them to.
//!
//! **What stays per product is what differs.** Each command line keeps its
//! context and settings, its rule set, its floor rule and when that runs, and
//! its printed forms: `helix component audit` prints a rule's notes and
//! `fusion workspace audit` does not, and those are decisions about a
//! product's report rather than about what a rule is.

pub mod error;
pub mod exit;
pub mod source;
pub mod style;
pub mod tui;
pub mod version;
pub mod walk;

use std::path::Path;
use std::thread::{self, ScopedJoinHandle};

use serde::Serialize;

use crate::error::{Failure, Outcome};
use crate::exit::Code;
use crate::style::Paint;

/// One thing wrong, in the place it is wrong.
#[derive(Serialize)]
pub struct Finding {
    /// What to do about it. Rendered dim, and omitted from nothing.
    pub detail: String,
    /// Repository-relative, with a line number where there is one.
    pub file: String,
    pub message: String,
}

/// What a rule reports, whether or not it found anything.
#[derive(Serialize)]
pub struct Report {
    /// **What was tested, never what was walked past.** A floor rule reads
    /// this, and a corpus size here would make that rule agree with a check
    /// that had silently stopped checking.
    pub checked: usize,
    pub findings: Vec<Finding>,

    /// Work rather than fault: named, counted, and not part of the verdict.
    ///
    /// **The first rule to need this was the one about visual axes**, which
    /// reports families in a group that disagree about declaring one. Whether a
    /// component *should* have an axis needs a reading of what it is for, so
    /// failing would pressure somebody into declaring one to silence a rule.
    /// A count that does not fall is visible work; a finding is a defect.
    ///
    /// Skipped when empty, so a rule that has no notes costs no key.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub notes: Vec<String>,

    /// What `checked` counts, for a sentence that reads.
    pub unit: &'static str,
}

impl Report {
    pub fn ok(&self) -> bool {
        self.findings.is_empty()
    }
}

/// What a `fix` hands back: every file it wrote, relative to the root.
pub type Written = Result<Vec<String>, Unwritten>;

/// How a rule writes, which is a function here and a module's answer elsewhere.
pub type Fixer<C> = Box<dyn Fn(&C) -> Written + Send + Sync>;

/// A write that did not happen, which stops the fix where it stood.
///
/// **A fix that cannot write says so, rather than reporting the files it
/// managed.** A caller reading "3 files written" has no way to learn that a
/// fourth was refused, and a read-only checkout ran every fix as a quiet
/// no-op before this.
pub struct Unwritten {
    /// Relative to the root, the way a finding names one.
    pub file: String,
    /// What the filesystem said.
    pub why: String,
}

/// What one rule counted, which is all a meta rule needs of it.
pub struct Measured {
    pub checked: usize,
    pub name: &'static str,
    pub unit: &'static str,
}

/// How a rule is run, which is also what says whether it is a meta rule.
///
/// **A runner rather than a flag beside one.** A boolean and a function pointer
/// are two statements about the same fact, and the failure when they disagree is
/// a meta rule handed a workspace or a source rule handed a list of counts.
/// Naming the shape once makes that unrepresentable.
///
/// **A meta rule reads the others' measurements rather than re-running them.**
/// Re-running is the obvious shape and it doubles the walk of the whole source
/// tree, which is most of what an audit spends its time on.
pub enum Runner<C> {
    /// Reads what the source rules counted, and never the workspace.
    Meta(fn(&[Measured]) -> Report),
    /// Reads the workspace, whatever the product says a workspace is.
    Source(fn(&C) -> Report),
    /// Somebody else's rule, run by a host this crate knows nothing about.
    ///
    /// **A closure rather than a function pointer, which is the whole
    /// difference.** A rule written here is a `fn` because it is compiled in; a
    /// rule loaded at run time is a module, a name and a payload, and something
    /// has to hold those between the run being asked for and the rule being
    /// called. It measures like any other and is reported like any other: a
    /// plugin that judged is a rule that judged, and nothing downstream of the
    /// measurement asks where a report came from.
    Hosted(Box<dyn Fn(&C) -> Report + Send + Sync>),
}

/// What a rule can do, beyond judging.
///
/// **Generic over what it reads, because that is the product.** A component
/// rule reads tiers and manifests and a workspace rule reads package
/// manifests, and the one thing this crate must not know is which. `C` is each
/// command line's own context type, and the runner asks only that it can be
/// borrowed from a thread.
pub struct Rule<C> {
    /// `None` for a rule that judges and cannot write, which is most of them.
    ///
    /// **A rule that can write still judges first.** The verb decides which half
    /// runs, so a `fix` is never a second opinion about what is wrong: it is the
    /// same reading, applied. Only an ordering rule has one, because an order
    /// is the one kind of finding whose repair is mechanical.
    ///
    /// **Boxed for the same reason [`Runner::Hosted`] is a closure.** A rule
    /// compiled in writes from a `fn`, and a rule loaded at run time writes what
    /// a module handed back, which is a value something has to hold.
    pub fix: Option<Fixer<C>>,
    pub name: &'static str,
    pub run: Runner<C>,
    pub summary: &'static str,
}

impl<C> Rule<C> {
    /// Runs the others, so it is never part of the set it runs.
    pub fn meta(&self) -> bool {
        matches!(self.run, Runner::Meta(_))
    }
}

/// A path as a finding names it: relative to `root`, with forward slashes.
///
/// Forward slashes on every platform, because a finding is read by a person
/// and compared by a test, and neither wants the path to change with the
/// machine that produced it.
#[must_use]
pub fn relative(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

/// Refuses an `--only` naming a rule the noun does not have.
///
/// **An input error and not a finding.** A rule that does not exist is not a
/// failing workspace: 3 means the tool never got far enough to have an answer,
/// and a CI job that read it as 1 would report a typo in `--only` as a fault
/// in the tree.
///
/// # Errors
///
/// [`Failure`] naming the first unknown rule and listing the ones there are.
pub fn only_known<C>(noun: &str, rules: &[Rule<C>], only: &[String]) -> Outcome<()> {
    let known: Vec<&str> = rules.iter().map(|rule| rule.name).collect();
    let unknown = only.iter().find(|name| !known.contains(&name.as_str()));
    match unknown {
        Some(first) => Err(Failure::input(
            format!("no {noun} rule called `{first}`"),
            format!("the rules are {}", known.join(", ")),
        )),
        None => Ok(()),
    }
}

/// Runs the source rules once, then the meta rules over what they counted.
///
/// **Once, which is the point of the split.** The meta rule wants the numbers,
/// not the workspace, and a version of it that re-ran its siblings to find them
/// cost the whole set a second time on every audit.
///
/// **One thread per source rule, joined in declaration order.** A rule is a
/// `fn(&C) -> Report` that reads files and returns, and none of them shares
/// anything but the context, so they were serial only because nothing had made
/// them otherwise. The reports come back in the order the rules were declared
/// whatever order the threads finish in, and every form reads the finished
/// list, so nothing draws or prints while a rule is still running.
///
/// **Sorted by name at the end**, so the JSON, the printed report and the
/// screen all list the rules in one order whatever order a noun declared them.
pub fn measure<'a, C: Sync>(selected: &'a [Rule<C>], context: &C) -> Vec<(&'a Rule<C>, Report)> {
    let (meta, source): (Vec<&Rule<C>>, Vec<&Rule<C>>) =
        selected.iter().partition(|rule| rule.meta());

    let mut reports: Vec<(&Rule<C>, Report)> = thread::scope(|scope| {
        let running: Vec<(&Rule<C>, ScopedJoinHandle<Report>)> = source
            .into_iter()
            .map(|rule| {
                (
                    rule,
                    scope.spawn(move || match &rule.run {
                        Runner::Source(run) => run(context),
                        Runner::Hosted(run) => run(context),
                        Runner::Meta(_) => unreachable!("partitioned above"),
                    }),
                )
            })
            .collect();
        running
            .into_iter()
            .map(|(rule, handle)| {
                /* A rule that panicked has printed why on its own thread; the
                panic continues here so the process still ends the way it did
                when the rule ran on this one. */
                let report = handle
                    .join()
                    .unwrap_or_else(|panic| std::panic::resume_unwind(panic));
                (rule, report)
            })
            .collect()
    });

    let measured: Vec<Measured> = reports
        .iter()
        .map(|(rule, report)| Measured {
            checked: report.checked,
            name: rule.name,
            unit: report.unit,
        })
        .collect();
    for rule in meta {
        let report = match &rule.run {
            Runner::Meta(run) => run(&measured),
            Runner::Source(_) | Runner::Hosted(_) => unreachable!("partitioned above"),
        };
        reports.push((rule, report));
    }

    reports.sort_by_key(|(rule, _)| rule.name);
    reports
}

/// The exit a measurement earns: 1 on any finding, 0 on none.
pub fn verdict<C>(reports: &[(&Rule<C>, Report)]) -> Code {
    if reports.iter().all(|(_, report)| report.ok()) {
        Code::Ok
    } else {
        Code::Failed
    }
}

/// Every rule and what it found, as JSON for a caller that parses it.
///
/// **The contract, on every verb, always.** A command with a human form and no
/// JSON form is one a script has to parse prose out of, and prose is the thing
/// the command lines reserve the right to improve. `notes` is always present
/// here, empty or not, so a consumer reading both binaries reads one shape.
#[must_use]
pub fn payload<C>(reports: &[(&Rule<C>, Report)]) -> serde_json::Value {
    serde_json::json!({
        "ok": reports.iter().all(|(_, report)| report.ok()),
        "rules": reports.iter().map(|(rule, report)| serde_json::json!({
            "checked": report.checked,
            "findings": report.findings,
            "name": rule.name,
            "notes": report.notes,
            "unit": report.unit,
        })).collect::<Vec<_>>(),
    })
}

/// Runs the rules that can write, and says what they wrote.
///
/// **The same selection as `check`, filtered to what has a `fix`.** A rule with
/// none is not an error to have asked for: `--only` names a subject, and the
/// answer to "fix the tokens rule" is that there is nothing mechanical to apply.
///
/// **A write that fails is the command's failure, not a file left off the
/// list.** The fix stops at the first refusal and names the file, with
/// [`Code::Internal`], which is what a failed write is everywhere else.
///
/// `label` is the word the summary line opens with, which is the noun for
/// `helix` and the binary for `fusion`: each command line's printed form is its
/// own, and this prints under whichever it was handed.
///
/// # Errors
///
/// [`Failure`] with [`Code::Internal`] when a rule's fix could not write.
pub fn fix<C>(
    selected: &[Rule<C>],
    context: &C,
    json: bool,
    paint: Paint,
    label: &str,
) -> Outcome<Code> {
    let mut wrote: Vec<(&str, String)> = Vec::new();
    let mut ran = 0;
    for rule in selected {
        let Some(apply) = rule.fix.as_ref() else {
            continue;
        };
        ran += 1;
        let written = apply(context).map_err(|refused| {
            Failure::new(
                Code::Internal,
                format!("cannot write {}", refused.file),
                refused.why,
            )
        })?;
        for file in written {
            wrote.push((rule.name, file));
        }
    }

    if json {
        let payload = serde_json::json!({
            "ran": ran,
            "wrote": wrote.iter().map(|(rule, file)| serde_json::json!({
                "file": file,
                "rule": rule,
            })).collect::<Vec<_>>(),
        });
        println!("{payload:#}");
        return Ok(Code::Ok);
    }
    if wrote.is_empty() {
        let plural = if ran == 1 { "" } else { "s" };
        println!("{label}: {ran} rule{plural} can write, and nothing needed it");
    } else {
        for (rule, file) in &wrote {
            println!("  {}  {file}", paint.bold(rule));
        }
        let plural = if wrote.len() == 1 { "" } else { "s" };
        println!("{label}: {} file{plural} written", wrote.len());
    }
    Ok(Code::Ok)
}
