//! The conditions of a rule's `when` that are about the reader's device and
//! the moment a part is drawn, rather than about the element: the queries
//! written around a rule, an entering part's first values, and whether a
//! region holds something.
//!
//! **A phone answers each query the same way every time**, so a rule under
//! one is either always drawn there or never: a finger hovers nothing and is
//! a coarse pointer, and a phone neither prints nor forces colors.

use super::{not, Condition};
use crate::family::read::Lit;

const PRINT: &str = "print";
const FORCED_COLORS: &str = "(forced-colors: active)";
const CAN_HOVER: &str = "(hover: hover)";
/// A pointer that cannot hover, as a finger cannot: always true on a phone.
pub const CANNOT_HOVER: &str = "(hover: none)";
/// A pointer as coarse as a finger: always true on a phone.
pub const COARSE_POINTER: &str = "(pointer: coarse)";
/// A pointer as fine as a mouse: never true on a phone.
const FINE_POINTER: &str = "(pointer: fine)";

fn media(query: &str) -> Condition {
    Condition::Media {
        query: query.to_owned(),
    }
}

/// Whether a condition means nothing on a native view, so a rule under it is
/// the web's alone: printing, forced colors, a pointer that hovers or is
/// fine, which a phone's finger is not, and an element not yet upgraded.
pub fn web_only(condition: &Condition) -> bool {
    match condition {
        Condition::Media { query } => {
            [PRINT, FORCED_COLORS, CAN_HOVER, FINE_POINTER].contains(&query.as_str())
        }
        Condition::Not { condition } => matches!(**condition, Condition::Defined),
        _ => false,
    }
}

/// One of `canHover`, `coarsePointer`, `entering`, `forcedColors`, `print`
/// and `reducedMotion`, with its value.
pub(super) fn read(key: &str, value: &Lit) -> Result<Condition, String> {
    Ok(match (key, value) {
        ("reducedMotion", Lit::Bool(true)) => media("(prefers-reduced-motion: reduce)"),
        ("reducedMotion", Lit::Bool(false)) => media("(prefers-reduced-motion: no-preference)"),
        ("forcedColors", Lit::Bool(true)) => media(FORCED_COLORS),
        ("forcedColors", Lit::Bool(false)) => media("(forced-colors: none)"),
        ("print", Lit::Bool(true)) => media(PRINT),
        ("canHover", Lit::Bool(true)) => media(CAN_HOVER),
        ("canHover", Lit::Bool(false)) => media(CANNOT_HOVER),
        ("coarsePointer", Lit::Bool(true)) => media(COARSE_POINTER),
        ("coarsePointer", Lit::Bool(false)) => media(FINE_POINTER),
        ("entering", Lit::Bool(true)) => Condition::Entering,
        ("print" | "entering", _) => return Err(format!("`{key}` in `when` takes `true`")),
        _ => return Err(format!("`{key}` in `when` takes `true` or `false`")),
    })
}

/// `filled`: a region that holds something, several that each do, or an
/// object of regions that do and regions that do not.
pub(super) fn filled(value: &Lit, read: &mut Vec<Condition>) -> Result<(), String> {
    let filled = |region: &str| Condition::Filled {
        region: region.to_owned(),
    };
    match value {
        Lit::Text(region) => read.push(filled(region)),
        Lit::Array(regions) if !regions.is_empty() => {
            for region in regions {
                let Lit::Text(region) = region else {
                    return Err("`filled` lists regions by name".to_owned());
                };
                read.push(filled(region));
            }
        }
        Lit::Object(regions) if !regions.is_empty() => {
            for (region, holds) in regions {
                match holds {
                    Lit::Bool(true) => read.push(filled(region)),
                    Lit::Bool(false) => read.push(not(filled(region))),
                    _ => return Err(format!("`filled.{region}` takes `true` or `false`")),
                }
            }
        }
        _ => {
            return Err(
                "`filled` is a region's name, an array of them, or an object of them".to_owned(),
            )
        }
    }
    Ok(())
}
