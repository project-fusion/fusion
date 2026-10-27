//! The Design Tokens Format Module 2025.10 file and the resolver document that
//! says how its modes compose.
//!
//! **`<prefix>.tokens.json` is light mode at the default density**, every
//! token grouped by its category, under the design system's token prefix.
//! **`<prefix>.resolver.json` holds the rest** as two
//! modifiers over it: `mode`, whose `dark` context holds each token whose value
//! is different in dark mode, and `density`, whose `sm` and `lg` contexts hold
//! each token a density stop in `base.css` moves. An alias is written once and
//! follows the token it names into every context.
//!
//! **The two modifiers never touch the same token**, which is what lets a
//! resolver apply them in either order. A token that both moved would be
//! refused here.

use std::fs;
use std::path::Path;

use fusion_helix_theme::tokens::{declared_under, Mode, Registry, Written};
use fusion_rules::error::Failure;
use serde_json::{json, Map, Value as Json};

use super::format::{self, entry, path, Entry};
use super::{declared, typed, written, System};

/// The density stops, by the value `data-density` takes. `md` is the default.
pub const DENSITIES: [&str; 3] = ["sm", "md", "lg"];

/// The token layer typed at the default density, and once more at each stop,
/// with the design system it is the layer of.
pub struct Layer {
    pub base: Registry,
    pub densities: Vec<(&'static str, Registry)>,
    pub system: System,
}

impl Layer {
    /// The token layer under `styles`, and each density stop `base.css`
    /// declares over it.
    ///
    /// # Errors
    ///
    /// [`Failure`] when a source cannot be read or a token cannot be typed.
    pub fn read(styles: &Path, system: System) -> Result<Self, Failure> {
        let declared = declared(styles)?;
        let written = written(styles)?;
        let base_css =
            fs::read_to_string(styles.join("src").join("base.css")).map_err(|error| {
                Failure::input(
                    "cannot read the density stops",
                    format!("base.css: {error}"),
                )
            })?;
        let densities = DENSITIES
            .iter()
            .map(|stop| {
                let moved = declared_under(&base_css, &format!("[data-density=\"{stop}\"]"));
                Ok((
                    *stop,
                    typed(&declared, &stopped(&written, &moved, &system))?,
                ))
            })
            .collect::<Result<_, Failure>>()?;
        Ok(Self {
            base: typed(&declared, &written)?,
            densities,
            system,
        })
    }

    /// Holds each token's CSS, as the registry prints it from its typed
    /// expression, to what the builders returned for it, which `tokens.json`
    /// records and `tokens.css` declares.
    ///
    /// # Errors
    ///
    /// [`Failure`] naming each token whose two spellings differ, or when
    /// `built` is not the token layer's JSON.
    pub fn held_to_stylesheet(&self, built: &str) -> Result<(), Failure> {
        let built: Json = serde_json::from_str(built)
            .map_err(|error| Failure::input("cannot read tokens.json", error.to_string()))?;
        let values: Vec<(&str, &str)> = built["tokens"]
            .as_array()
            .map(|tokens| {
                tokens
                    .iter()
                    .filter_map(|one| Some((one["name"].as_str()?, one["value"].as_str()?)))
                    .collect()
            })
            .unwrap_or_default();
        let mut differences = Vec::new();
        for token in self.base.tokens() {
            let name = self.system.names.token(&token.name);
            match values.iter().find(|(one, _)| *one == name) {
                Some((_, css)) if *css == token.css => {}
                Some((_, css)) => differences.push(format!(
                    "`{name}`: the builders wrote `{css}` and the registry prints `{}`",
                    token.css
                )),
                None => differences.push(format!("`{name}` is not in tokens.json")),
            }
        }
        if values.len() != self.base.tokens().len() {
            differences.push(format!(
                "tokens.json holds {} tokens and the registry {}",
                values.len(),
                self.base.tokens().len()
            ));
        }
        if differences.is_empty() {
            return Ok(());
        }
        Err(Failure::input(
            "the CSS the builders write and the CSS the registry prints differ",
            differences.join("\n"),
        )
        .hint("run `turbo run token-layer` and then this again"))
    }
}

/// `written` with each token a density stop declares replaced by its CSS
/// there.
fn stopped(
    written: &[(String, Written)],
    moved: &[(String, String)],
    system: &System,
) -> Vec<(String, Written)> {
    written
        .iter()
        .map(|(name, value)| {
            let declared = moved
                .iter()
                .find(|(property, _)| system.names.token_of(property) == Some(name.as_str()));
            match declared {
                Some((_, css)) => (name.clone(), Written::Css(css.clone())),
                None => (name.clone(), value.clone()),
            }
        })
        .collect()
}

/// Every token of `registry` in `mode`, by name, as the format writes it.
fn entries(
    registry: &Registry,
    mode: Mode,
    system: &System,
) -> Result<Vec<(String, Entry)>, Failure> {
    let alias_type = |name: &str| {
        let target = registry.tokens().iter().find(|one| one.name == name)?;
        format::type_of(registry, target, mode, &system.names)
    };
    let mut faults = Vec::new();
    let found = registry
        .tokens()
        .iter()
        .filter_map(
            |token| match entry(registry, token, mode, &alias_type, system) {
                Ok(one) => Some((token.name.clone(), one)),
                Err(why) => {
                    faults.push(why);
                    None
                }
            },
        )
        .collect();
    if faults.is_empty() {
        Ok(found)
    } else {
        Err(Failure::input(
            "cannot evaluate the token layer",
            faults.join("\n"),
        ))
    }
}

/// The tokens of `entries` grouped by category, and each untyped one in its
/// group's `$extensions`, keeping only those `keep` names.
fn grouped(
    entries: &[(String, Entry)],
    keep: &dyn Fn(&str) -> bool,
    vendor: &str,
) -> Map<String, Json> {
    let mut groups: Map<String, Json> = Map::new();
    for (name, entry) in entries.iter().filter(|(name, _)| keep(name)) {
        let (group, rest) = path(name);
        let Json::Object(members) = groups.entry(group).or_insert_with(|| json!({})) else {
            continue;
        };
        match entry {
            Entry::Typed(token) => {
                members.insert(rest.to_owned(), token.clone());
            }
            Entry::Untyped(record) => {
                let extensions = members.entry("$extensions").or_insert_with(|| {
                    let mut own = Map::new();
                    own.insert(vendor.to_owned(), json!({ "untyped": {} }));
                    Json::Object(own)
                });
                extensions[vendor]["untyped"][rest] = record.clone();
            }
        }
    }
    groups
}

/// The names whose entries differ between `base` and `other`.
fn moved(base: &[(String, Entry)], other: &[(String, Entry)]) -> Vec<String> {
    other
        .iter()
        .filter(|(name, entry)| {
            base.iter().find(|(one, _)| one == name).map(|(_, one)| one) != Some(entry)
        })
        .map(|(name, _)| name.clone())
        .collect()
}

/// The base file and the resolver, as their names and their text.
///
/// # Errors
///
/// [`Failure`] when a token cannot be evaluated, or a density stop moves a
/// token dark mode moves too.
pub fn design_tokens(layer: &Layer) -> Result<Vec<(String, String)>, Failure> {
    let system = &layer.system;
    let vendor = system.vendor.as_str();
    let set = system.names.property.as_str();
    let tokens_file = format!("{set}.tokens.json");
    let resolver_file = format!("{set}.resolver.json");
    let light = entries(&layer.base, Mode::Light, system)?;
    let dark = entries(&layer.base, Mode::Dark, system)?;
    let darkened = moved(&light, &dark);
    let mut file = Map::new();
    file.insert(
        "$description".to_owned(),
        json!(format!(
            "{}'s semantic tokens in light mode at the default density. {resolver_file} adds dark mode and the other densities.",
            system.name
        )),
    );
    file.extend(grouped(&light, &|_| true, vendor));
    let mut stops = Map::new();
    for (stop, registry) in &layer.densities {
        let at = entries(registry, Mode::Light, system)?;
        let shifted = moved(&light, &at);
        if let Some(both) = shifted.iter().find(|name| darkened.contains(name)) {
            return Err(Failure::input(
                "the modes are not independent",
                format!(
                    "`{}` moves in dark mode and at density {stop}",
                    system.names.token(both)
                ),
            ));
        }
        stops.insert((*stop).to_owned(), sources(&at, &shifted, vendor));
    }
    let mut sets = Map::new();
    sets.insert(
        set.to_owned(),
        json!({ "sources": [{ "$ref": tokens_file }] }),
    );
    let resolver = json!({
        "$schema": "https://www.designtokens.org/schemas/2025.10/resolver.json",
        "name": system.name,
        "version": "2025.10",
        "description": format!("{}'s semantic tokens in each color mode and at each density.", system.name),
        "sets": sets,
        "modifiers": {
            "mode": {
                "description": "The color mode.",
                "contexts": { "light": [], "dark": sources(&dark, &darkened, vendor) },
                "default": "light",
            },
            "density": {
                "description": "The density a region is set at, as `data-density` names it.",
                "contexts": stops,
                "default": "md",
            },
        },
        "resolutionOrder": [
            { "$ref": format!("#/sets/{set}") },
            { "$ref": "#/modifiers/mode" },
            { "$ref": "#/modifiers/density" },
        ],
    });
    Ok(vec![
        (tokens_file, pretty(&Json::Object(file))),
        (resolver_file, pretty(&resolver)),
    ])
}

/// A context's sources: none where nothing moves, or one inline set of the
/// tokens that do.
fn sources(entries: &[(String, Entry)], names: &[String], vendor: &str) -> Json {
    if names.is_empty() {
        return json!([]);
    }
    json!([grouped(
        entries,
        &|name| names.iter().any(|one| one == name),
        vendor
    )])
}

fn pretty(json: &Json) -> String {
    let mut text = serde_json::to_string_pretty(json).unwrap_or_default();
    text.push('\n');
    text
}
