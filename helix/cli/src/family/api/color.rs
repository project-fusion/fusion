//! How an element a reader builds a color in says so, as its source's
//! `color`, and how a field that opens such an element says so, as its
//! source's `colorField`.

use std::collections::BTreeMap;

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::countdown::fields;
use super::Names;
use crate::family::read::Lit;

/// What the element computes as a color moves, each read as `color.x`: the
/// name is the source's, and the value the name the render binds.
pub const COMPUTED: &[&str] = &[
    "brightness",
    "channels",
    "fields",
    "formatLabel",
    "formatWord",
    "hue",
    "markX",
    "markY",
    "painted",
    "presets",
    "reading",
    "sampleLabel",
    "saturation",
    "square",
    "squareReversed",
    "tint",
    "wheelGrid",
    "wheelX",
    "wheelY",
];

/// What the element holds where a reader builds a color in it, as a color
/// picker's square and ramps.
///
/// **The web element holds its color itself, and a phone runs the `color`
/// machine**, and both read core's color picker arithmetic. The value is text
/// in the syntax `format` names. Hue, saturation and brightness are held beside
/// it, since black has neither a hue nor a saturation to read back.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct ColorChoice {
    /// The prop that says whether the color carries an alpha channel.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alpha: Option<String>,
    /// The event sent before the color changes, which a handler can cancel,
    /// with the color it would leave as `value`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    /// The event sent once the color settles.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub change: Option<String>,
    /// What the element computes as the color moves, by the field's name.
    pub computed: BTreeMap<String, String>,
    /// The event sent once the sample put the value on the clipboard.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub copied: Option<String>,
    /// The prop that holds the syntax the value is written in.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    /// The event sent as the color moves.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input: Option<String>,
    /// The prop that says a reader cannot change the color.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub readonly: Option<String>,
    /// The prop that seeds the color.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<String>,
    /// The prop that holds the presets, separated by commas.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub swatches: Option<String>,
    /// The prop that holds the color.
    pub value: String,
}

impl ColorChoice {
    /// Each name the color holds, where a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        [
            ("alpha", self.alpha.as_ref(), Names::Prop),
            ("before", self.before.as_ref(), Names::Event),
            ("change", self.change.as_ref(), Names::Event),
            ("copied", self.copied.as_ref(), Names::Event),
            ("format", self.format.as_ref(), Names::Prop),
            ("input", self.input.as_ref(), Names::Event),
            ("readonly", self.readonly.as_ref(), Names::Prop),
            ("seed", self.seed.as_ref(), Names::Prop),
            ("swatches", self.swatches.as_ref(), Names::Prop),
            ("value", Some(&self.value), Names::Prop),
        ]
        .into_iter()
        .filter_map(|(at, name, names)| name.map(|name| (at, name.as_str(), names)))
        .collect()
    }
}

/// `color({ value, seed, before, ... })`, each field a name.
pub fn color(lit: &Lit) -> Result<ColorChoice, String> {
    let mut read = ColorChoice::default();
    for (key, name) in fields(lit, "color")? {
        if COMPUTED.contains(&key) {
            read.computed.insert(key.to_owned(), name.to_owned());
            continue;
        }
        let slot = match key {
            "alpha" => &mut read.alpha,
            "before" => &mut read.before,
            "change" => &mut read.change,
            "copied" => &mut read.copied,
            "format" => &mut read.format,
            "input" => &mut read.input,
            "readonly" => &mut read.readonly,
            "seed" => &mut read.seed,
            "swatches" => &mut read.swatches,
            "value" => {
                name.clone_into(&mut read.value);
                continue;
            }
            key => return Err(format!("color: `{key}` is not a field it has")),
        };
        *slot = Some(name.to_owned());
    }
    if read.value.is_empty() {
        return Err("color: the color names the `prop` that holds it".to_owned());
    }
    Ok(read)
}

/// What a text field that opens a color picker computes from its text: the
/// color its picker shows, the color its swatch paints, and what the swatch
/// says. The text is its `text`, and a phone runs the `color-field` machine
/// over it, bound to the box that draws the picker.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct ColorField {
    /// The value that holds the color the swatch paints.
    pub painted: String,
    /// The value that holds the last text that was a color, which the picker shows.
    pub picked: String,
    /// The value that holds what the swatch says of itself.
    pub said: String,
}

/// `colorField({ painted, picked, said })`, each field a name.
pub fn color_field(lit: &Lit) -> Result<ColorField, String> {
    let mut read = ColorField::default();
    for (key, name) in fields(lit, "colorField")? {
        let slot = match key {
            "painted" => &mut read.painted,
            "picked" => &mut read.picked,
            "said" => &mut read.said,
            key => return Err(format!("colorField: `{key}` is not a field it has")),
        };
        name.clone_into(slot);
    }
    if read.painted.is_empty() || read.picked.is_empty() || read.said.is_empty() {
        return Err("colorField: the field names `painted`, `picked`, and `said`".to_owned());
    }
    Ok(read)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn named(name: &str, fields: &[(&str, &str)]) -> Lit {
        Lit::Call(
            name.to_owned(),
            vec![Lit::Object(
                fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                    .collect(),
            )],
        )
    }

    fn call(fields: &[(&str, &str)]) -> Lit {
        named("color", fields)
    }

    #[test]
    fn reads_the_props_the_events_and_what_it_computes() {
        let read = color(&call(&[
            ("value", "value"),
            ("before", "before-change"),
            ("hue", "hue"),
        ]))
        .unwrap();
        assert_eq!(read.value, "value");
        assert_eq!(read.computed["hue"], "hue");
        assert_eq!(read.references().len(), 2);
    }

    #[test]
    fn refuses_a_color_with_no_prop_or_a_field_it_lacks() {
        assert_eq!(
            color(&call(&[("hue", "hue")])).unwrap_err(),
            "color: the color names the `prop` that holds it"
        );
        assert_eq!(
            color(&call(&[("value", "value"), ("list", "chosen")])).unwrap_err(),
            "color: `list` is not a field it has"
        );
    }

    #[test]
    fn a_color_field_names_all_it_computes() {
        assert!(color_field(&named("colorField", &[("painted", "painted")])).is_err());
        let read = color_field(&named(
            "colorField",
            &[
                ("painted", "painted"),
                ("picked", "picked"),
                ("said", "said"),
            ],
        ))
        .unwrap();
        assert_eq!(read.picked, "picked");
    }
}
