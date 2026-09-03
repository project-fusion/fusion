//! Holds the theme engine's emitted names and the stylesheet's, in both directions.
//!
//! **Two derivations compute this palette and nothing compared them.** The
//! engine solves tokens and emits a block of custom properties; the styles
//! package derives its own ramp in CSS from a handful of seeds. They meet at
//! exactly one place, the names, and a disagreement there is silent: two of the
//! five intent knobs once did nothing at all, and a spec asserting one of the
//! dead names passed the whole time.
//!
//! A spec can only hold a name it names, which is why this is a rule and not a
//! test. It reads both sides and compares the sets.
//!
//! **Both directions, because each failure is different.** A name emitted and
//! unread means a consumer sets an intent input and nothing moves, which is
//! invisible from either file alone. A name read and never emitted means the
//! stylesheet offers a public seed the engine cannot produce, so the documented
//! path to a theme cannot reach part of the palette and a consumer has to
//! hand-write CSS to finish the job. The second is not hypothetical: two seeds
//! are read by the ramp and the engine emits neither, which is remaining work
//! rather than a bug. `planned` carries them with a reason each, because an
//! allowlist without reasons becomes the place things go to stop being
//! questioned.
//!
//! **Both sides are compared as suffixes, not as whole names**, because the
//! engine's prefix is an input: the namespace exists so a team on their own
//! tokens can use the solver without adopting Helix, and it makes the emitted
//! name a template rather than a literal.
//!
//! **The stylesheet side is read from the public name inside `var()`.** A seed
//! is written against the private twin with the public name as the input, so the
//! public names are exactly the first arguments. Matching the declarations
//! instead would find the private names, which is the wrong set: those are the
//! stylesheet talking to itself.
//!
//! **It covers the token names too, and the rule's name is narrower than the job
//! it does.** The boundary is the same one: every color token the engine emits
//! has to be a name the token layer declares, or a themed page sets a property
//! nothing reads, which is the seed bug one level up and with thirty-six more
//! chances to happen. `seeds` stays the name because the seeds are the sharp
//! edge.
//!
//! **Read from what the engine emitted, never from the engine's source.** A
//! pattern over the templates only approximates the names: it can see a family
//! and never a leaf, stopping at the first interpolation, and it cannot see the
//! color tokens at all, those being written by a loop. The oracle is the emitted
//! answer for seventeen intents and the Rust suite asserts the engine against
//! it, so it cannot go stale quietly. The one thing lost is a branch no intent
//! reaches, which is why four of those intents exist purely to turn on the tail
//! of the emission.

use std::collections::BTreeSet;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::component::{Context, Finding, Report};

static COMMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("a literal pattern compiles"));
static SLASHED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?m)^\s*//.*$").expect("a literal pattern compiles"));
static READ: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"var\(\s*--helix-seed-([a-z0-9-]+)").expect("a literal pattern compiles")
});
static DECLARED_SEED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*--helix-seed-([a-z0-9-]+)\s*:").expect("a literal pattern compiles")
});
static DECLARED_COLOR: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*--helix-(color-[a-z0-9-]+)\s*:").expect("a literal pattern compiles")
});
static DECLARED_ANY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*--helix-([a-z0-9-]+)\s*:").expect("a literal pattern compiles")
});
static EMITTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*--[a-z0-9]+-([a-z0-9-]+)\s*:").expect("a literal pattern compiles")
});

/// Everything the oracle says the engine writes.
struct Engine {
    emitted: BTreeSet<String>,
    model: BTreeSet<String>,
    seeds: BTreeSet<String>,
}

fn engine(oracle: &Value, pinned: &BTreeSet<String>) -> Option<Engine> {
    let themes = oracle.get("themes")?.as_array()?;
    /* The default derivation, which is the one that carries the model
    unmodified. Every other intent changes something, and the pairs are a fact
    about the surface model rather than about any theme. */
    let base = themes
        .iter()
        .find(|one| one.get("label").and_then(Value::as_str) == Some("default"))?;

    let pairings = base.get("pairings")?.as_array()?;
    let mut model = BTreeSet::new();
    for pairing in pairings {
        for side in ["foreground", "background"] {
            if let Some(name) = pairing.get(side).and_then(Value::as_str) {
                model.insert(name.to_owned());
            }
        }
    }

    let seeds = base
        .get("seeds")?
        .as_object()?
        .keys()
        .filter_map(|one| one.strip_prefix("seed-").map(str::to_owned))
        .collect();

    /* All the themes rather than the default one, because most of the emitted
    block is conditional: a theme that says nothing about motion emits no
    duration, and the names still have to exist for the theme that does. */
    let emitted = themes
        .iter()
        .filter_map(|theme| theme.get("css").and_then(Value::as_str))
        .flat_map(|css| {
            EMITTED
                .captures_iter(css)
                .map(|caught| caught[1].to_owned())
                .collect::<Vec<String>>()
        })
        .filter(|name| !pinned.contains(name))
        .collect();

    Some(Engine {
        emitted,
        model,
        seeds,
    })
}

#[allow(clippy::too_many_lines)]
pub fn run(context: &Context) -> Report {
    let settings = &context.settings.seeds;
    let unit = "names the engine and the stylesheet share";
    let nothing = |findings| Report {
        checked: 0,
        findings,
        notes: Vec::new(),
        unit,
    };
    let said = |message: String, detail: &str, file: &str| Finding {
        detail: detail.to_owned(),
        file: file.to_owned(),
        message,
    };

    /* **No oracle configured is not a fault, and an unreadable one is.** A
    consumer holding components to Helix's conventions may have no theme engine
    at all, and a rule that fails on a key they never set is a rule they turn
    off. Configured and missing is the other case entirely: somebody named a
    file and it is not there. Reporting nothing here is what `floors` exists to
    make visible. */
    let Some(named) = context.settings.oracle.as_ref() else {
        return nothing(Vec::new());
    };
    let Some(oracle) = fs::read_to_string(context.root.join(named))
        .ok()
        .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
    else {
        return nothing(vec![said(
            "the oracle is not there, so the emitted names cannot be read".to_owned(),
            "This rule reads what the engine emitted rather than how it writes it. Without the \
             oracle there is nothing to compare the stylesheet to.",
            context.settings.oracle.as_deref().unwrap_or("oracle"),
        )]);
    };

    let pinned: BTreeSet<String> = settings.pinned.iter().cloned().collect();
    let Some(engine) = engine(&oracle, &pinned) else {
        return nothing(vec![said(
            "the oracle holds no `default` theme, so the model cannot be read from it".to_owned(),
            "The pairs are a fact about the surface model rather than about any theme, so they \
             are read from the theme that asked for nothing.",
            context.settings.oracle.as_deref().unwrap_or("oracle"),
        )]);
    };

    /* Comments hold seed names too: one sheet explains the whole scheme in prose
    directly above the block. Reading those in makes the rule pass on the exact
    bug it was written for. */
    let sheets: Vec<String> = settings
        .sheets
        .iter()
        .map(|path| {
            let source = fs::read_to_string(context.root.join(path)).unwrap_or_default();
            SLASHED
                .replace_all(&COMMENT.replace_all(&source, " "), " ")
                .into_owned()
        })
        .collect();
    let named = settings.sheets.join(" or ");

    let mut consumed = BTreeSet::new();
    let mut colors = BTreeSet::new();
    let mut declared = BTreeSet::new();
    for source in &sheets {
        for caught in READ.captures_iter(source) {
            consumed.insert(caught[1].to_owned());
        }
        /* A public seed can also be declared outright rather than read through a
        private twin, which is how an angle is written: there is no color behind
        it to fall back through, so the public name is the declaration. */
        for caught in DECLARED_SEED.captures_iter(source) {
            consumed.insert(caught[1].to_owned());
        }
        for caught in DECLARED_COLOR.captures_iter(source) {
            colors.insert(caught[1].to_owned());
        }
        for caught in DECLARED_ANY.captures_iter(source) {
            declared.insert(caught[1].to_owned());
        }
    }

    let mut findings = Vec::new();
    for name in &engine.seeds {
        if !consumed.contains(name) {
            findings.push(said(
                format!("the engine emits the seed `{name}` and no stylesheet reads it"),
                "A derived theme carrying this name moves nothing on the page, which is invisible \
                 from either file alone. Either the stylesheet should read it or the engine should \
                 stop emitting it.",
                &named,
            ));
        }
    }
    for name in &consumed {
        if engine.seeds.contains(name) || settings.planned.contains_key(name) {
            continue;
        }
        findings.push(said(
            format!("the stylesheet reads the seed `{name}` and the engine never emits it"),
            "The documented path to a theme cannot reach it, and a consumer has to hand-write CSS \
             to finish the job. Emit it, or record it in `planned` with the reason.",
            &named,
        ));
    }
    for (name, why) in &settings.planned {
        if !consumed.contains(name) {
            findings.push(said(
                format!("`{name}` is planned ({why}) and no stylesheet reads it"),
                "An exemption for a name nothing consumes is an entry nobody will ever remove. \
                 Delete it.",
                &named,
            ));
        }
        if engine.seeds.contains(name) {
            findings.push(said(
                format!("`{name}` is planned ({why}) and the engine now emits it"),
                "The reason has expired, which is the point of writing one down. Delete the entry.",
                &named,
            ));
        }
    }

    for name in &engine.model {
        if !colors.contains(name) {
            findings.push(said(
                format!("the surface model names `{name}` and no stylesheet declares it"),
                "A themed page would set a property nothing reads, and the pairing would be \
                 measured against a color no component can paint.",
                &named,
            ));
        }
    }

    /* **A name interpolated twice is a family, and the family still has to
    exist.** The type ramp is written with the leaf interpolated, which no
    pattern over the source can reach past. Matching the prefix catches the
    failure that matters here, a family the token layer does not have at all. It
    cannot check the leaf, and saying so is better than implying otherwise. */
    let written: BTreeSet<&String> = engine
        .emitted
        .iter()
        .filter(|name| !name.starts_with("seed-"))
        .collect();
    let family = |name: &str| name.split('-').next().unwrap_or_default().to_owned();
    let families: BTreeSet<String> = written.iter().map(|one| family(one)).collect();
    let known: BTreeSet<String> = declared.iter().map(|one| family(one)).collect();

    for one in &families {
        if !known.contains(one) {
            findings.push(said(
                format!(
                    "the engine writes a `--helix-{one}-*` family and no stylesheet declares one"
                ),
                "Every token in it sets a property nothing reads.",
                &named,
            ));
        }
    }
    for name in &written {
        if !declared.contains(*name) {
            findings.push(said(
                format!("the engine writes `--helix-{name}` and no stylesheet declares it"),
                "A derived theme carrying it sets a property nothing reads. Either the token layer \
                 should have the name or the engine should stop writing it.",
                &named,
            ));
        }
    }

    Report {
        checked: engine.seeds.len() + consumed.len() + engine.model.len() + written.len(),
        findings,
        notes: Vec::new(),
        unit,
    }
}
