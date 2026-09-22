//! What two custom elements manifests disagree about, said in the manifest's
//! own terms.
//!
//! **The instrument a second generator is held to.** Replacing the analyzer is
//! only safe if the thing replacing it can be shown to produce what the thing
//! it replaces produced, and the manifest is the most-checked artifact in this
//! repository: the reference pages, the framework typings and sixty component
//! rules all read it. So the swap is measured rather than argued, and this is
//! what measures it.
//!
//! **A line diff cannot do this job.** The four manifests are fourteen
//! megabytes across a quarter of a million lines, they are written by a
//! serializer whose key order is its own business, and a member moving between
//! declarations shows up as two unrelated hunks a thousand lines apart. What a
//! reader needs is "`helix-button`'s `label` lost its default", addressed the
//! way they would go looking for it.
//!
//! **Order is compared as well as membership, because order is a decision
//! here.** One of the analyzer's plugins exists to make the output stable, so a
//! manifest whose members carry the same names in a different sequence is not
//! the same manifest: it would churn every diff that touched it and the reason
//! it does not is that something sorts them.

pub mod build;
pub mod inherit;
pub mod jsdoc;
pub mod order;
pub mod parse;
pub mod unions;

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

use fusion_rules::error::Failure;
use fusion_rules::exit::Code;
use serde_json::Value;

use crate::args::{ManifestBuild, ManifestDiff};

/// One disagreement, addressed the way a reader would go looking for it.
#[derive(Debug)]
pub struct Difference {
    /// `src/button/button.ts › HelixButton › members.label › default`.
    pub at: String,
    /// What the left manifest says, absent where it has nothing there.
    pub before: Option<String>,
    /// What the right one says.
    pub after: Option<String>,
}

/// The lists a declaration carries, each addressed by the `name` of its entries.
const LISTS: [&str; 6] = [
    "attributes",
    "cssParts",
    "cssProperties",
    "events",
    "members",
    "slots",
];

/// A scalar rendered for a reader, and `None` where the value is a container.
fn scalar(value: &Value) -> Option<String> {
    match value {
        Value::Null => Some("null".to_owned()),
        Value::Bool(one) => Some(one.to_string()),
        Value::Number(one) => Some(one.to_string()),
        Value::String(one) => Some(one.clone()),
        _ => None,
    }
}

/// Every leaf of a value, by the dotted path that reaches it.
///
/// Flattened rather than compared tree to tree so a difference is reported at
/// the field that differs rather than at the object containing it: a reader
/// told that `type` differs has to diff two objects by eye, and being told
/// `type.text` differs has the answer already.
fn leaves(value: &Value, at: &str, into: &mut BTreeMap<String, String>) {
    match value {
        Value::Object(fields) => {
            for (key, one) in fields {
                let deeper = if at.is_empty() {
                    key.clone()
                } else {
                    format!("{at}.{key}")
                };
                leaves(one, &deeper, into);
            }
        }
        Value::Array(items) => {
            for (index, one) in items.iter().enumerate() {
                leaves(one, &format!("{at}[{index}]"), into);
            }
        }
        _ => {
            if let Some(text) = scalar(value) {
                into.insert(at.to_owned(), text);
            }
        }
    }
}

/// The entries of a declaration's list, by name, with the order they came in.
fn by_name(declaration: &Value, list: &str) -> (BTreeMap<String, Value>, Vec<String>) {
    let mut found = BTreeMap::new();
    let mut order = Vec::new();
    for entry in declaration
        .get(list)
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let name = entry
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_owned();
        order.push(name.clone());
        found.insert(name, entry.clone());
    }
    (found, order)
}

/// The exports of a module, by what names one, with the order they came in.
///
/// **Not by name alone**, which the declarations above can be: a module that
/// re-exports two others has two entries both called `*`, and keying on the
/// name would report one of them and hide the other. What tells them apart is
/// where each points, so the key says that too.
fn exports(module: &Value) -> (BTreeMap<String, Value>, Vec<String>) {
    let mut found = BTreeMap::new();
    let mut order = Vec::new();
    for entry in module
        .get("exports")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let said = |at: &str, key: &str| {
            entry
                .get(at)
                .and_then(|one| one.get(key))
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_owned()
        };
        let kind = entry
            .get("kind")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let name = entry
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let from = said("declaration", "module");
        let from = if from.is_empty() {
            said("declaration", "package")
        } else {
            from
        };
        let key = format!("{kind} {name} from {from}");
        order.push(key.clone());
        found.insert(key, entry.clone());
    }
    (found, order)
}

/// The declarations of a module, by name, with the order they came in.
fn declarations(module: &Value) -> (BTreeMap<String, Value>, Vec<String>) {
    let mut found = BTreeMap::new();
    let mut order = Vec::new();
    for declaration in module
        .get("declarations")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let name = declaration
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_owned();
        order.push(name.clone());
        found.insert(name, declaration.clone());
    }
    (found, order)
}

/// The modules of a manifest, by path, with the order they came in.
fn modules(manifest: &Value) -> (BTreeMap<String, Value>, Vec<String>) {
    let mut found = BTreeMap::new();
    let mut order = Vec::new();
    for module in manifest
        .get("modules")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let path = module
            .get("path")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_owned();
        order.push(path.clone());
        found.insert(path, module.clone());
    }
    (found, order)
}

/// Names on one side and not the other, reported as presence rather than value.
fn missing(
    at: &str,
    kind: &str,
    before: &BTreeMap<String, Value>,
    after: &BTreeMap<String, Value>,
    into: &mut Vec<Difference>,
) {
    let left: BTreeSet<&String> = before.keys().collect();
    let right: BTreeSet<&String> = after.keys().collect();
    for gone in left.difference(&right) {
        into.push(Difference {
            after: None,
            at: format!("{} › {kind} {gone}", label(at)),
            before: Some("present".to_owned()),
        });
    }
    for new in right.difference(&left) {
        into.push(Difference {
            after: Some("present".to_owned()),
            at: format!("{} › {kind} {new}", label(at)),
            before: None,
        });
    }
}

/// Two entries compared leaf by leaf.
fn fields(at: &str, before: &Value, after: &Value, into: &mut Vec<Difference>) {
    let mut left = BTreeMap::new();
    let mut right = BTreeMap::new();
    leaves(before, "", &mut left);
    leaves(after, "", &mut right);
    let keys: BTreeSet<&String> = left.keys().chain(right.keys()).collect();
    for key in keys {
        let (was, is) = (left.get(key), right.get(key));
        if was != is {
            into.push(Difference {
                after: is.cloned(),
                at: format!("{at} › {key}"),
                before: was.cloned(),
            });
        }
    }
}

/// An ordering difference, said as the first place the two part company.
///
/// **Not the two lists.** A manifest holds nearly four hundred modules, and a
/// report that printed both orders to say that two of them swapped would bury
/// the answer in the evidence, which is the failure this whole command exists
/// to avoid. The first index where they differ, and what sits there in each, is
/// the whole of what a reader needs to go and look.
fn ordering(at: &str, kind: &str, before: &[String], after: &[String], into: &mut Vec<Difference>) {
    let left: BTreeSet<&String> = before.iter().collect();
    let right: BTreeSet<&String> = after.iter().collect();
    /* Only where both hold the same names. Where they do not, the membership
    report above is the honest account and an order report beside it would be
    the same news told twice. */
    if left != right || before == after {
        return;
    }
    let Some(first) = before.iter().zip(after).position(|(one, two)| one != two) else {
        return;
    };
    let moved = before
        .iter()
        .zip(after)
        .filter(|(one, two)| one != two)
        .count();
    into.push(Difference {
        after: after.get(first).cloned(),
        at: format!(
            "{} › {kind} in a different order, from position {first} ({moved} of {} moved)",
            label(at),
            before.len()
        ),
        before: before.get(first).cloned(),
    });
}

/// What to call the place a difference sits, for a report addressed to a reader.
///
/// The manifest itself has no name a reader would recognize, so a difference in
/// its top-level lists is addressed to the file rather than to an empty string
/// with an arrow after it.
fn label(at: &str) -> &str {
    if at.is_empty() {
        "the manifest"
    } else {
        at
    }
}

/// Everything two manifests disagree about.
pub fn compare(before: &Value, after: &Value) -> Vec<Difference> {
    let mut found = Vec::new();
    let (left, left_order) = modules(before);
    let (right, right_order) = modules(after);
    missing("", "module", &left, &right, &mut found);
    ordering("", "modules", &left_order, &right_order, &mut found);

    /* The document's own fields, which are two and easily forgotten. The first
    pass compared modules and nothing else, and so had nothing to say about a
    `schemaVersion` that was wrong in all four tiers. */
    let alone = |one: &Value| {
        let mut copy = one.clone();
        if let Some(fields) = copy.as_object_mut() {
            fields.remove("modules");
        }
        copy
    };
    fields("", &alone(before), &alone(after), &mut found);

    for (path, module) in &left {
        let Some(other) = right.get(path) else {
            continue;
        };
        let (sent, sent_order) = exports(module);
        let (theirs_sent, theirs_sent_order) = exports(other);
        missing(path, "export", &sent, &theirs_sent, &mut found);
        ordering(path, "exports", &sent_order, &theirs_sent_order, &mut found);
        for (key, value) in &sent {
            if let Some(against) = theirs_sent.get(key) {
                fields(
                    &format!("{path} › exports.{key}"),
                    value,
                    against,
                    &mut found,
                );
            }
        }

        let (mine, mine_order) = declarations(module);
        let (theirs, theirs_order) = declarations(other);
        missing(path, "declaration", &mine, &theirs, &mut found);
        ordering(path, "declarations", &mine_order, &theirs_order, &mut found);

        for (name, declaration) in &mine {
            let Some(against) = theirs.get(name) else {
                continue;
            };
            let at = format!("{path} › {name}");
            for list in LISTS {
                let (ours, ours_order) = by_name(declaration, list);
                let (yours, yours_order) = by_name(against, list);
                missing(&at, list, &ours, &yours, &mut found);
                ordering(&at, list, &ours_order, &yours_order, &mut found);
                for (entry, value) in &ours {
                    if let Some(other) = yours.get(entry) {
                        fields(&format!("{at} › {list}.{entry}"), value, other, &mut found);
                    }
                }
            }
            /* **An empty list is not a missing one.** The analyzer writes
            `"events": []` on a class whose every inferred event was dropped,
            and writing nothing there instead is a difference the comparison
            by name cannot see: neither side has an entry to report. Two
            declarations in the library say so. */
            for list in LISTS {
                let held = |one: &Value| match one.get(list) {
                    None => "nothing",
                    Some(Value::Array(items)) if items.is_empty() => "an empty list",
                    Some(_) => "entries",
                };
                let (was, now) = (held(declaration), held(against));
                if was != now {
                    found.push(Difference {
                        at: format!("{at} › {list}"),
                        before: Some(was.to_owned()),
                        after: Some(now.to_owned()),
                    });
                }
            }
            /* The declaration's own fields, with the lists taken out: those were
            compared by name above, and comparing them again as arrays would
            report every entry after an insertion as changed. */
            let strip = |one: &Value| {
                let mut copy = one.clone();
                if let Some(fields) = copy.as_object_mut() {
                    for list in LISTS {
                        fields.remove(list);
                    }
                }
                copy
            };
            fields(&at, &strip(declaration), &strip(against), &mut found);
        }
    }
    found
}

/// Read a manifest, or say which file could not be read and why.
pub fn read(at: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(at).map_err(|why| format!("{}: {why}", at.display()))?;
    serde_json::from_str(&text).map_err(|why| format!("{}: {why}", at.display()))
}

/// Say what two manifests disagree about, and exit 1 if they do.
pub fn diff(args: &ManifestDiff, from: &Path, json: bool) -> Result<Code, Failure> {
    let at = |one: &Path| {
        if one.is_absolute() {
            one.to_path_buf()
        } else {
            from.join(one)
        }
    };
    let before = read(&at(&args.before))
        .map_err(|why| Failure::input("the first manifest could not be read", why))?;
    let after = read(&at(&args.after))
        .map_err(|why| Failure::input("the second manifest could not be read", why))?;

    let found = compare(&before, &after);

    if json {
        let rows: Vec<Value> = found
            .iter()
            .map(
                |one| serde_json::json!({ "after": one.after, "at": one.at, "before": one.before }),
            )
            .collect();
        println!(
            "{:#}",
            serde_json::json!({ "differences": rows, "same": found.is_empty() })
        );
        return Ok(if found.is_empty() {
            Code::Ok
        } else {
            Code::Failed
        });
    }

    if found.is_empty() {
        println!("manifest: the two say the same thing");
        return Ok(Code::Ok);
    }

    let shown = if args.limit == 0 {
        found.len()
    } else {
        args.limit.min(found.len())
    };
    for one in found.iter().take(shown) {
        println!("  {}", one.at);
        match (&one.before, &one.after) {
            (Some(was), Some(is)) => {
                println!("    was  {was}");
                println!("    now  {is}");
            }
            (Some(was), None) => println!("    was  {was}, and is gone"),
            (None, Some(is)) => println!("    new  {is}"),
            (None, None) => {}
        }
    }
    if shown < found.len() {
        println!("  … and {} more", found.len() - shown);
    }
    println!(
        "manifest: {} difference(s) between {} and {}",
        found.len(),
        args.before.display(),
        args.after.display()
    );
    Ok(Code::Failed)
}

/// Generate a manifest and write it out.
pub fn generate(args: &ManifestBuild, from: &Path, _json: bool) -> Result<Code, Failure> {
    let package = if args.package.is_absolute() {
        args.package.clone()
    } else {
        from.join(&args.package)
    };
    if !package.join("src").is_dir() {
        return Err(Failure::input(
            "the package has no sources",
            format!("{} holds no `src`", package.display()),
        )
        .hint("pass the directory that holds the package's `src`, such as helix/styled"));
    }
    /* Read once, by the package name a superclass will name them by. A path
    that cannot be read is a failure rather than a silence: a manifest asked
    for and not found would leave every class in it looking as though it
    inherited nothing. */
    let mut dependencies = build::Dependencies::new();
    for given in &args.dependencies {
        let Some((name, at)) = given.split_once('=') else {
            return Err(Failure::input(
                "a dependency is written `<package>=<path>`",
                format!("`{given}` has no `=` in it"),
            ));
        };
        let at = if Path::new(at).is_absolute() {
            PathBuf::from(at)
        } else {
            from.join(at)
        };
        let manifest = read(&at)
            .map_err(|why| Failure::input("a dependency's manifest could not be read", why))?;
        dependencies.insert(name.to_owned(), manifest);
    }

    /* Always the pretty form. This exists to be read by `manifest diff` and by
    a person looking at what a layer produced, and neither is served by one
    line of six megabytes. */
    let given = args.package.to_string_lossy().replace('\\', "/");
    println!(
        "{:#}",
        build::build(&package, &given, &args.tier, &dependencies)
    );
    Ok(Code::Ok)
}
