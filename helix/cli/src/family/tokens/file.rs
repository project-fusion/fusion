//! A token source written as a Design Tokens Format Module file.
//!
//! **A token is a member with a `$value`**, named by its path joined with
//! `-`: `color.primary` is `color-primary`, as `--<prefix>-color-primary` on
//! the web. A group's `$type` is the type of each token in it that names
//! none. A key that opens with `$` is the format's own and names no token.
//!
//! **Each value is written as the native theme takes it**, as the styles
//! package's are: a color as sRGB hex, a dimension in pixels as points, one
//! in rems or ems as the CSS it is written in, a duration in milliseconds,
//! a cubic Bézier and a shadow as the CSS they are, and a font family list as
//! CSS writes one. An alias, `{color.primary}`, is the value of the token it
//! names. A type the native theme has no kind for, such as `border` or
//! `typography`, is refused by the token's name.
//!
//! **A mode is a second file laid over the first.** It sets some tokens to
//! another value, and every token it does not name keeps the first file's.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

use fusion_helix_theme::tokens::Native;
use fusion_rules::error::Failure;
use serde_json::{Map, Value as Json};

use super::{kinds_module, module, System};

/// How deep an alias may name another before the reading stops.
const DEPTH: usize = 16;

/// One token as the file writes it.
#[derive(Clone, Debug)]
struct Written {
    name: String,
    kind: Option<String>,
    value: Json,
}

/// The tokens of one file, in the order the file writes them.
#[derive(Debug)]
pub struct Read {
    path: PathBuf,
    tokens: Vec<Written>,
}

impl Read {
    /// Reads the file at `path`.
    ///
    /// # Errors
    ///
    /// [`Failure`] when the file cannot be read or is not a JSON object.
    pub fn file(path: &Path) -> Result<Self, Failure> {
        let text = fs::read_to_string(path).map_err(|error| {
            Failure::input(
                "cannot read the token file",
                format!("{}: {error}", path.display()),
            )
        })?;
        let json: Json = serde_json::from_str(&text).map_err(|error| {
            Failure::input(
                "the token file is not JSON",
                format!("{}: {error}", path.display()),
            )
        })?;
        let Json::Object(root) = json else {
            return Err(Failure::input(
                "the token file is not a group of tokens",
                format!("{} holds no JSON object", path.display()),
            ));
        };
        let mut tokens = Vec::new();
        walk(&root, &[], None, &mut tokens);
        Ok(Self {
            path: path.to_path_buf(),
            tokens,
        })
    }

    /// Every token's name.
    pub fn names(&self) -> BTreeSet<String> {
        self.tokens.iter().map(|token| token.name.clone()).collect()
    }

    /// Each mode's native module and the module of kinds, each opening with
    /// `header`. `modes` lays a file over this one for each mode it names:
    /// `light`, `dark`, or both.
    ///
    /// # Errors
    ///
    /// [`Failure`] naming each token whose value cannot be written, each mode
    /// the native theme does not draw, and each token a mode's file sets that
    /// this file does not hold.
    pub fn modules(
        &self,
        modes: &BTreeMap<String, PathBuf>,
        system: &System,
        header: &str,
    ) -> Result<Vec<(String, String)>, Failure> {
        let mut faults = Vec::new();
        for mode in modes.keys() {
            if mode != "light" && mode != "dark" {
                faults.push(format!(
                    "`{mode}`: the native theme draws `light` and `dark`"
                ));
            }
        }
        let mut written = Vec::new();
        let mut kinds: Vec<(String, &str)> = Vec::new();
        for name in ["light", "dark"] {
            let laid = match modes.get(name) {
                Some(path) => self.laid_under(&Self::file(path)?, &mut faults),
                None => self.tokens.clone(),
            };
            let mut values = Vec::new();
            for token in &laid {
                match native(&laid, token, 0) {
                    Ok((kind, value)) => {
                        if name == "light" {
                            kinds.push((token.name.clone(), kind));
                        }
                        values.push((token.name.clone(), value));
                    }
                    Err(why) => faults.push(format!("`{}` in {name} mode: {why}", token.name)),
                }
            }
            written.push((
                format!("{name}.generated.ts"),
                module(system, header, name, &values),
            ));
        }
        written.push((
            "kinds.generated.ts".to_owned(),
            kinds_module(system, header, &kinds),
        ));
        if faults.is_empty() {
            Ok(written)
        } else {
            Err(Failure::input(
                format!(
                    "cannot write {} of the tokens in {}",
                    faults.len(),
                    self.path.display()
                ),
                faults.join("\n"),
            ))
        }
    }

    /// This file's tokens with each one `over` sets replaced by its value
    /// there.
    fn laid_under(&self, over: &Self, faults: &mut Vec<String>) -> Vec<Written> {
        for token in &over.tokens {
            if !self.tokens.iter().any(|one| one.name == token.name) {
                faults.push(format!(
                    "`{}`: {} sets it, and {} does not hold it",
                    token.name,
                    over.path.display(),
                    self.path.display()
                ));
            }
        }
        self.tokens
            .iter()
            .map(|token| {
                over.tokens
                    .iter()
                    .find(|one| one.name == token.name)
                    .map_or_else(
                        || token.clone(),
                        |one| Written {
                            kind: one.kind.clone().or_else(|| token.kind.clone()),
                            ..one.clone()
                        },
                    )
            })
            .collect()
    }
}

/// Every token under `group`, at `path`, whose type is `inherited` where it
/// names none.
fn walk(
    group: &Map<String, Json>,
    path: &[&str],
    inherited: Option<&str>,
    into: &mut Vec<Written>,
) {
    let kind = group.get("$type").and_then(Json::as_str).or(inherited);
    for (key, member) in group {
        if key.starts_with('$') {
            continue;
        }
        let Json::Object(member) = member else {
            continue;
        };
        let mut at = path.to_vec();
        at.push(key);
        match member.get("$value") {
            Some(value) => into.push(Written {
                name: at.join("-"),
                kind: member
                    .get("$type")
                    .and_then(Json::as_str)
                    .or(kind)
                    .map(str::to_owned),
                value: value.clone(),
            }),
            None => walk(member, &at, kind, into),
        }
    }
}

/// The token an alias names: `{color.primary}` is `color-primary`.
fn alias(value: &Json) -> Option<String> {
    let text = value.as_str()?;
    let inner = text.strip_prefix('{')?.strip_suffix('}')?;
    Some(inner.replace('.', "-"))
}

/// A token's kind, as the native theme names it, and its value.
fn native(
    tokens: &[Written],
    token: &Written,
    depth: usize,
) -> Result<(&'static str, Native), String> {
    if let Some(target) = alias(&token.value) {
        if depth >= DEPTH {
            return Err("its aliases name each other in a loop".to_owned());
        }
        let found = tokens
            .iter()
            .find(|one| one.name == target)
            .ok_or_else(|| format!("it is an alias of `{target}`, which the file does not hold"))?;
        return native(tokens, found, depth + 1);
    }
    let kind = token
        .kind
        .as_deref()
        .ok_or_else(|| "it has no `$type`, and no group around it names one".to_owned())?;
    let value = &token.value;
    Ok(match kind {
        "color" => ("color", Native::Text(color(value)?)),
        "cubicBezier" => ("easing", Native::Text(bezier(value)?)),
        "dimension" => ("length", dimension(value)?),
        "duration" => ("time", Native::Number(duration(value)?)),
        "fontFamily" => ("family", Native::Text(families(value)?)),
        "fontWeight" | "number" => (
            "number",
            Native::Number(
                value
                    .as_f64()
                    .ok_or_else(|| format!("a `{kind}` is a number"))?,
            ),
        ),
        "shadow" => ("shadow", Native::Text(shadow(value)?)),
        other => return Err(format!("the native theme has no kind for a `{other}`")),
    })
}

/// A color as sRGB hex: its `hex`, or its components, with its alpha where
/// it is not opaque.
fn color(value: &Json) -> Result<String, String> {
    if let Some(text) = value.as_str() {
        return text
            .starts_with('#')
            .then(|| text.to_lowercase())
            .ok_or_else(|| format!("`{text}` is no hex color"));
    }
    let alpha = value["alpha"].as_f64().unwrap_or(1.0);
    let hex = if let Some(hex) = value["hex"].as_str() {
        hex.to_lowercase()
    } else {
        if value["colorSpace"] != "srgb" {
            return Err("a color without `hex` is written in `srgb`".to_owned());
        }
        let components: Vec<f64> = value["components"]
            .as_array()
            .map(|all| all.iter().filter_map(Json::as_f64).collect())
            .unwrap_or_default();
        let [red, green, blue] = components.as_slice() else {
            return Err("an `srgb` color has three components".to_owned());
        };
        format!("#{}{}{}", byte(*red), byte(*green), byte(*blue))
    };
    Ok(if alpha < 1.0 {
        format!("{hex}{}", byte(alpha))
    } else {
        hex
    })
}

/// A share from 0 to 1 as two hex digits.
fn byte(share: f64) -> String {
    /* Clamped first, so the cast holds a whole number from 0 to 255. */
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let whole = (share.clamp(0.0, 1.0) * 255.0).round() as u8;
    format!("{whole:02x}")
}

/// A number as CSS writes it: `0`, `0.5`, `16`.
fn number(value: f64) -> String {
    if value.fract() == 0.0 && value.abs() < 1e15 {
        format!("{value:.0}")
    } else {
        value.to_string()
    }
}

/// The value and unit of a dimension or a duration, written as an object or,
/// as older files do, as one string such as `16px`.
fn measure(value: &Json) -> Result<(f64, String), String> {
    if let Some(text) = value.as_str() {
        let at = text
            .find(|one: char| one.is_ascii_alphabetic())
            .ok_or_else(|| format!("`{text}` has no unit"))?;
        let (amount, unit) = text.split_at(at);
        let amount: f64 = amount
            .trim()
            .parse()
            .map_err(|_| format!("`{text}` is no number and unit"))?;
        return Ok((amount, unit.to_owned()));
    }
    let amount = value["value"]
        .as_f64()
        .ok_or_else(|| "a measure has a `value` that is a number".to_owned())?;
    let unit = value["unit"]
        .as_str()
        .ok_or_else(|| "a measure has a `unit`".to_owned())?;
    Ok((amount, unit.to_owned()))
}

/// A dimension: pixels as points, and rems or ems as the CSS they are.
fn dimension(value: &Json) -> Result<Native, String> {
    let (amount, unit) = measure(value)?;
    match unit.as_str() {
        "px" => Ok(Native::Number(amount)),
        "rem" | "em" => Ok(Native::Text(format!("{}{unit}", number(amount)))),
        other => Err(format!(
            "a dimension is in `px`, `rem`, or `em`, and this one is in `{other}`"
        )),
    }
}

/// A duration in milliseconds.
fn duration(value: &Json) -> Result<f64, String> {
    let (amount, unit) = measure(value)?;
    match unit.as_str() {
        "ms" => Ok(amount),
        "s" => Ok(amount * 1000.0),
        other => Err(format!(
            "a duration is in `ms` or `s`, and this one is in `{other}`"
        )),
    }
}

/// A cubic Bézier as CSS writes it.
fn bezier(value: &Json) -> Result<String, String> {
    let points: Vec<f64> = value
        .as_array()
        .map(|all| all.iter().filter_map(Json::as_f64).collect())
        .unwrap_or_default();
    if points.len() != 4 {
        return Err("a `cubicBezier` is four numbers".to_owned());
    }
    Ok(format!(
        "cubic-bezier({})",
        points
            .iter()
            .map(|one| number(*one))
            .collect::<Vec<_>>()
            .join(", ")
    ))
}

/// A font family list as CSS writes it, each name of several words quoted.
fn families(value: &Json) -> Result<String, String> {
    let names: Vec<&str> = match value {
        Json::String(one) => vec![one.as_str()],
        Json::Array(all) => all.iter().filter_map(Json::as_str).collect(),
        _ => return Err("a `fontFamily` is a name or a list of names".to_owned()),
    };
    Ok(names
        .iter()
        .map(|name| {
            if name.contains(' ') {
                format!("\"{name}\"")
            } else {
                (*name).to_owned()
            }
        })
        .collect::<Vec<_>>()
        .join(", "))
}

/// A shadow, or a list of them, as CSS writes it: the offsets, the blur, the
/// spread where it is not zero, and the color.
fn shadow(value: &Json) -> Result<String, String> {
    let layer = |one: &Json| -> Result<String, String> {
        let length = |key: &str| -> Result<String, String> {
            match one.get(key) {
                None => Ok("0px".to_owned()),
                Some(found) => {
                    let (amount, unit) = measure(found)?;
                    Ok(format!("{}{unit}", number(amount)))
                }
            }
        };
        let mut parts = vec![length("offsetX")?, length("offsetY")?, length("blur")?];
        let spread = length("spread")?;
        if spread != "0px" {
            parts.push(spread);
        }
        parts.push(color(&one["color"])?);
        Ok(parts.join(" "))
    };
    match value {
        Json::Array(all) => Ok(all
            .iter()
            .map(layer)
            .collect::<Result<Vec<_>, _>>()?
            .join(", ")),
        one => layer(one),
    }
}
