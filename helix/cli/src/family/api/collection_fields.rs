//! What a collection's object fields hold: how its items are numbered, how
//! a reader moves them, and how the keys move among them.

use std::collections::BTreeMap;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::collection::{Collection, Keys};
use crate::family::read::Lit;

/// How a collection's items are numbered: the props that say where the count
/// starts and whether it runs down, and the values the items read the first
/// number and the step as.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Counts {
    pub first: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reversed: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start: Option<String>,
    pub step: String,
}

/// How a reader moves an item: the prop that allows it, the events a move
/// sends, the words said at each step, and the part a lifted item looks like.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Reorder {
    pub after: String,
    pub before: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub canceled: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dropped: Option<String>,
    pub enabled: String,
    pub r#move: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub moved: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub picked: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview: Option<String>,
}

/// An object's fields, each a name, held to the fields `allowed`.
fn names(
    fields: &[(String, Lit)],
    allowed: &[&str],
    at: &str,
) -> Result<BTreeMap<String, String>, String> {
    fields
        .iter()
        .map(|(key, value)| match value {
            Lit::Text(name) if allowed.contains(&key.as_str()) => Ok((key.clone(), name.clone())),
            _ => Err(format!("collection: `{at}{key}` is not a field it has")),
        })
        .collect()
}

/// A field the object must have.
fn needed(fields: &mut BTreeMap<String, String>, key: &str, what: &str) -> Result<String, String> {
    fields.remove(key).ok_or_else(|| format!("{what} `{key}`"))
}

/// The props and values that number the items: where they start, whether
/// they count down, and the values the items read them as.
pub fn counts(fields: &[(String, Lit)]) -> Result<Counts, String> {
    let mut read = names(fields, &["first", "reversed", "start", "step"], "counts.")?;
    let what = "collection: `counts` names its";
    Ok(Counts {
        first: needed(&mut read, "first", what)?,
        reversed: read.remove("reversed"),
        start: read.remove("start"),
        step: needed(&mut read, "step", what)?,
    })
}

/// How a reader moves an item: the prop that allows it, the events a move
/// sends, the words said at each step, and the part a lifted item looks like.
pub fn reorder(fields: &[(String, Lit)]) -> Result<Reorder, String> {
    let allowed = [
        "after", "before", "canceled", "dropped", "enabled", "move", "moved", "picked", "preview",
    ];
    let mut read = names(fields, &allowed, "reorder.")?;
    let what = "collection: `reorder` names its";
    Ok(Reorder {
        after: needed(&mut read, "after", what)?,
        before: needed(&mut read, "before", what)?,
        canceled: read.remove("canceled"),
        dropped: read.remove("dropped"),
        enabled: needed(&mut read, "enabled", what)?,
        r#move: needed(&mut read, "move", what)?,
        moved: read.remove("moved"),
        picked: read.remove("picked"),
        preview: read.remove("preview"),
    })
}

/// How a reader removes an item from the set: the event the item's press
/// sends to ask for it, which Delete and Backspace on the item send as well,
/// and the part that takes focus once the last item is gone.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Removes {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub empty: Option<String>,
    pub event: String,
}

/// The event an item's removal asks with, and the part focus goes to once
/// no item is left.
pub fn removes(fields: &[(String, Lit)]) -> Result<Removes, String> {
    let mut read = names(fields, &["empty", "event"], "removes.")?;
    Ok(Removes {
        empty: read.remove("empty"),
        event: needed(&mut read, "event", "collection: `removes` names its")?,
    })
}

/// What an item's event closes, in a set that mixes: the element's toggle,
/// once the event stands, as a menu closes as a row is chosen.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Closes {
    /// The item's event that closes the element once it stands.
    pub event: String,
    /// The prop of the element that must hold for the event to close it,
    /// as a menu's `close-on-select`, which an item's own may overrule.
    #[serde(rename = "while", skip_serializing_if = "Option::is_none")]
    pub r#while: Option<String>,
}

/// The item's event that closes the element, and the prop that must hold.
pub fn closes(fields: &[(String, Lit)]) -> Result<Closes, String> {
    let mut read = names(fields, &["event", "while"], "closes.")?;
    Ok(Closes {
        r#while: read.remove("while"),
        event: needed(&mut read, "event", "collection: `closes` names its")?,
    })
}

/// The keys a collection moves focus with, and so the ones its items can keep.
const MOVING: [&str; 6] = [
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "End",
    "Home",
];

/// `keys: { chooses, wrap, adds?, along?, enter?, escape?, keeps?, letters?, selects? }`:
/// two flags, where Control or Command with Space adds or takes out an item,
/// the prop that says which way the items run, what Enter does on an item
/// that is no link, whether Escape lets go with Control or Command held, the
/// moving keys the items keep, whether a typed
/// letter moves focus, which it does unless `letters` is `false`, and whether
/// Space and Enter go to the set's selection, which they do unless `selects`
/// is `false`.
pub fn keys(fields: &[(String, Lit)]) -> Result<Keys, String> {
    let mut keys = Keys::default();
    let (mut chooses, mut wrap) = (None, None);
    for (key, value) in fields {
        match (key.as_str(), value) {
            ("adds", Lit::Text(under)) if under == "replace" => keys.adds = Some(under.clone()),
            ("adds", _) => {
                return Err(
                    "collection: `keys.adds` is `replace`, where Control or Command with Space adds an item only under `replace`"
                        .to_owned(),
                )
            }
            ("along", Lit::Text(prop)) => keys.along = Some(prop.clone()),
            ("chooses", Lit::Bool(flag)) => chooses = Some(*flag),
            ("enter", Lit::Text(does)) if does == "selects" => keys.enter = Some(does.clone()),
            ("enter", _) => {
                return Err(
                    "collection: `keys.enter` is `selects`, where Enter selects as Space does"
                        .to_owned(),
                )
            }
            ("escape", Lit::Text(held)) if held == "plain" => keys.escape = Some(held.clone()),
            ("escape", _) => {
                return Err(
                    "collection: `keys.escape` is `plain`, where Escape lets go only without Control or Command"
                        .to_owned(),
                )
            }
            ("letters", Lit::Bool(flag)) => keys.letterless = !*flag,
            ("selects", Lit::Bool(flag)) => keys.selects = Some(*flag),
            ("wrap", Lit::Bool(flag)) => wrap = Some(*flag),
            ("keeps", Lit::Array(kept)) => {
                for one in kept {
                    match one {
                        Lit::Text(name) if MOVING.contains(&name.as_str()) => {
                            keys.keeps.push(name.clone());
                        }
                        _ => {
                            return Err(format!(
                                "collection: `keys.keeps` holds the keys that move focus, {}",
                                MOVING.join(", ")
                            ))
                        }
                    }
                }
            }
            (key, _) => return Err(format!("collection: `keys.{key}` is not a field it has")),
        }
    }
    keys.chooses =
        chooses.ok_or("collection: `keys` says whether arriving chooses, as `chooses`")?;
    keys.wrap = wrap.ok_or("collection: `keys` says whether a move comes round, as `wrap`")?;
    Ok(keys)
}

/// Refuses a collection whose fields cannot stand together: a set whose items
/// open that does not say `toggles`, a set that mixes or whose items mark
/// themselves and holds a chosen value, a mode, or turns, and a set of any
/// other kind that names no chosen value.
pub fn kept(collection: &Collection, chosen: Option<&str>) -> Result<(), String> {
    if collection.opens.is_some() && !collection.toggles {
        return Err("collection: a set whose items open says `toggles: true`".to_owned());
    }
    /* A set that mixes holds no chosen value, and its items do not turn as a set's. */
    if collection.mixes && (chosen.is_some() || collection.toggles || collection.mode.is_some()) {
        return Err(
            "collection: a set that `mixes` holds no `chosen` value, no `mode`, and does not say `toggles`"
                .to_owned(),
        );
    }
    /* A set whose items mark themselves holds nothing of its own to choose. */
    let held = chosen.is_some() || collection.toggles || collection.mode.is_some();
    if collection.marked && (held || collection.mixes || collection.opens.is_some()) {
        return Err(
            "collection: a set whose items are `marked` holds no `chosen` value or `mode`, and does not open, mix, or say `toggles`"
                .to_owned(),
        );
    }
    if chosen.is_none() && collection.opens.is_none() && !collection.mixes && !collection.marked {
        return Err("a collection names the prop that holds the chosen value".to_owned());
    }
    Ok(())
}
