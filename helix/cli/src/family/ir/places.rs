//! Where a rule's target stands among its siblings, as a source writes it:
//! `child`, `place`, and `ofType`.

use super::{not, Condition, Place};
use crate::family::read::Lit;

/// `child`: where the target stands among its siblings, counting from one for
/// `even` and `odd`. `first` and `later`
/// read as the slotted child's own condition, which the rule's reader turns
/// into a place where the rule styles no slotted children.
pub(super) fn child(place: &str) -> Result<Condition, String> {
    let at = |place| Condition::Place { place };
    Ok(match place {
        "first" => Condition::Child { first: true },
        "later" => Condition::Child { first: false },
        "last" => at(Place::Last),
        "earlier" => not(at(Place::Last)),
        "only" => at(Place::Only),
        "even" => at(Place::Even),
        "odd" => at(Place::Odd),
        _ => {
            return Err(
                "`child` is `first`, `later`, `last`, `earlier`, `only`, `even` or `odd`"
                    .to_owned(),
            )
        }
    })
}

/// `ofType`: a whole number from one, the host's place among the siblings of
/// its own kind.
pub(super) fn of_type(at: f64) -> Result<u32, String> {
    if at >= 1.0 && at.fract() == 0.0 && at <= f64::from(u32::MAX) {
        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        Ok(at as u32)
    } else {
        Err("`ofType` is a whole number from 1".to_owned())
    }
}

/// `nth` or `nthLast`: a whole number from one, the target's place counting
/// from the start or from the end, or `{ from }`, that place and every one
/// after it.
pub(super) fn nth(value: &Lit, from_end: bool) -> Result<Place, String> {
    let refused = || "`nth` and `nthLast` are a whole number from 1, or `{ from: <number> }`";
    let (number, onward) = match value {
        Lit::Number(at) => (*at, false),
        Lit::Object(fields) => match fields.as_slice() {
            [(key, Lit::Number(at))] if key == "from" => (*at, true),
            _ => return Err(refused().to_owned()),
        },
        _ => return Err(refused().to_owned()),
    };
    let at = of_type(number).map_err(|_| refused().to_owned())?;
    Ok(Place::Nth {
        at,
        from_end,
        onward,
    })
}

/// A place, read as the host's own among the element's siblings.
pub fn host_place(condition: Condition) -> Condition {
    match condition {
        Condition::Child { first } => {
            let first_child = Condition::HostPlace {
                place: Place::First,
            };
            if first {
                first_child
            } else {
                not(first_child)
            }
        }
        Condition::Place { place } => Condition::HostPlace { place },
        Condition::Not { condition } => not(host_place(*condition)),
        condition => condition,
    }
}

impl Place {
    /// The pseudo-class the web writes it as.
    pub fn css(self) -> String {
        match self {
            Self::Even => ":nth-child(even)".to_owned(),
            Self::First => ":first-child".to_owned(),
            Self::Last => ":last-child".to_owned(),
            Self::Nth {
                at,
                from_end,
                onward,
            } => {
                let pseudo = if from_end {
                    "nth-last-child"
                } else {
                    "nth-child"
                };
                if onward {
                    format!(":{pseudo}(n + {at})")
                } else {
                    format!(":{pseudo}({at})")
                }
            }
            Self::Odd => ":nth-child(odd)".to_owned(),
            Self::Only => ":only-child".to_owned(),
        }
    }
}
