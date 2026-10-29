//! How an element a reader moves along a track says so, as its source's
//! `range`: the prop that holds the value, the props that bound it and step
//! it, and the events a move sends. The node whose role is `slider` is the
//! control a reader drags, presses, and steps with the keys.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// What an element a reader moves along a track holds, as a slider's value.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct ValueRange {
    /// The event sent before a move stands, which a handler can cancel, as a
    /// slider's `before-change`. A refused move leaves the value where it was.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    /// The event sent once a move is done: as a drag or a press on the track
    /// ends, and with each step a key or a screen reader takes, as a slider's
    /// `change`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub change: Option<String>,
    /// The state the element is in while a reader drags it, as a slider's
    /// `dragging`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dragging: Option<String>,
    /// The prop that holds the options the value is written with, as
    /// `Intl.NumberFormat` takes them.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    /// The value the element computes as where the value sits along the
    /// track, 0 to 1. A render reads it as `range.fraction`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fraction: Option<String>,
    /// The value the element computes as where its fill starts along the
    /// track, 0 to 1: its `origin`, or the value where the value is nearer
    /// the start. A render reads it as `range.fillFrom`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<String>,
    /// The prop that seeds the value where nothing sets it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial: Option<String>,
    /// The event sent once each move stands, as a slider's `input`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input: Option<String>,
    /// The prop that holds the locale the value is written in.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
    /// The prop that holds the largest value.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<String>,
    /// The prop that holds the smallest value.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min: Option<String>,
    /// The prop that holds `vertical` where the track stands on end.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub orientation: Option<String>,
    /// The prop that holds where the fill starts: `start`, `center`, or
    /// `end`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub origin: Option<String>,
    /// The prop that holds how far Page Up and Page Down move the value.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<String>,
    /// The value the element computes as its value, a number, as a screen
    /// reader reads it. A render reads it as `range.reading`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reading: Option<String>,
    /// The state the element is in while its control has focus the keyboard
    /// brought, as a slider's `focus-visible`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ringed: Option<String>,
    /// The prop that keeps the reader from moving the value, while they can
    /// still reach it and hear it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub readonly: Option<String>,
    /// The value the element computes as its value written as a reader sees
    /// it, in its format. A render reads it as `range.said`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub said: Option<String>,
    /// The value the element computes as the words a screen reader says for
    /// its value, where its format or its `template` asks for any. A render
    /// reads it as `range.spoken`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spoken: Option<String>,
    /// The value the element computes as how much of the track its fill
    /// covers, 0 to 1: its end less its start. A render reads it as
    /// `range.fillSpan`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub span: Option<String>,
    /// The prop that holds how far one step moves the value.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step: Option<String>,
    /// The prop that holds the sentence a screen reader says for the value,
    /// with `{value}` in its place, as a slider's `value-text`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template: Option<String>,
    /// The value the element computes as where its fill ends along the
    /// track, 0 to 1. A render reads it as `range.fillTo`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<String>,
    /// The prop that holds the value.
    pub value: String,
}

impl ValueRange {
    /// Each name the range holds, where a source writes it, and what it
    /// names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        [
            ("before", self.before.as_ref(), Names::Event),
            ("change", self.change.as_ref(), Names::Event),
            ("dragging", self.dragging.as_ref(), Names::State),
            ("format", self.format.as_ref(), Names::Prop),
            ("initial", self.initial.as_ref(), Names::Prop),
            ("input", self.input.as_ref(), Names::Event),
            ("locale", self.locale.as_ref(), Names::Prop),
            ("max", self.max.as_ref(), Names::Prop),
            ("min", self.min.as_ref(), Names::Prop),
            ("orientation", self.orientation.as_ref(), Names::Prop),
            ("origin", self.origin.as_ref(), Names::Prop),
            ("page", self.page.as_ref(), Names::Prop),
            ("readonly", self.readonly.as_ref(), Names::Prop),
            ("ringed", self.ringed.as_ref(), Names::State),
            ("step", self.step.as_ref(), Names::Prop),
            ("template", self.template.as_ref(), Names::Prop),
            ("value", Some(&self.value), Names::Prop),
        ]
        .into_iter()
        .filter_map(|(at, name, names)| name.map(|name| (at, name.as_str(), names)))
        .collect()
    }

    /// The values the element computes, as a render reads each: `(path,
    /// name)`.
    pub fn computed(&self) -> Vec<(&'static str, &str)> {
        [
            ("range.fillFrom", self.from.as_ref()),
            ("range.fillSpan", self.span.as_ref()),
            ("range.fillTo", self.to.as_ref()),
            ("range.fraction", self.fraction.as_ref()),
            ("range.reading", self.reading.as_ref()),
            ("range.said", self.said.as_ref()),
            ("range.spoken", self.spoken.as_ref()),
        ]
        .into_iter()
        .filter_map(|(path, name)| name.map(|name| (path, name.as_str())))
        .collect()
    }
}

/// `range({ value, ... })`, each field a name.
pub fn range(lit: &Lit) -> Result<ValueRange, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`range` is a call to `range()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "range", arguments.as_slice()) else {
        return Err("`range` is a call to `range()` with an object".to_owned());
    };
    let mut read = ValueRange::default();
    let mut value = None;
    for (key, field) in fields {
        let Lit::Text(name) = field else {
            return Err(format!("range: `{key}` is not a field it has"));
        };
        let slot = match key.as_str() {
            "before" => &mut read.before,
            "change" => &mut read.change,
            "dragging" => &mut read.dragging,
            "format" => &mut read.format,
            "fraction" => &mut read.fraction,
            "from" => &mut read.from,
            "initial" => &mut read.initial,
            "input" => &mut read.input,
            "locale" => &mut read.locale,
            "max" => &mut read.max,
            "min" => &mut read.min,
            "orientation" => &mut read.orientation,
            "origin" => &mut read.origin,
            "page" => &mut read.page,
            "reading" => &mut read.reading,
            "readonly" => &mut read.readonly,
            "ringed" => &mut read.ringed,
            "said" => &mut read.said,
            "spoken" => &mut read.spoken,
            "span" => &mut read.span,
            "step" => &mut read.step,
            "template" => &mut read.template,
            "to" => &mut read.to,
            "value" => &mut value,
            _ => return Err(format!("range: `{key}` is not a field it has")),
        };
        *slot = Some(name.clone());
    }
    read.value = value.ok_or("`range` names the prop that holds its value, `prop`")?;
    Ok(read)
}

#[cfg(test)]
mod tests {
    use super::{range, ValueRange};
    use crate::family::read::Lit;

    fn call(fields: &[(&str, &str)]) -> Lit {
        Lit::Call(
            "range".to_owned(),
            vec![Lit::Object(
                fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_each_name_it_holds_and_the_values_it_computes() {
        let read = range(&call(&[
            ("before", "before-change"),
            ("change", "change"),
            ("fraction", "fraction"),
            ("max", "max"),
            ("min", "min"),
            ("step", "step"),
            ("value", "value"),
        ]))
        .unwrap();
        assert_eq!(
            read,
            ValueRange {
                before: Some("before-change".to_owned()),
                change: Some("change".to_owned()),
                fraction: Some("fraction".to_owned()),
                max: Some("max".to_owned()),
                min: Some("min".to_owned()),
                step: Some("step".to_owned()),
                value: "value".to_owned(),
                ..ValueRange::default()
            }
        );
        assert_eq!(read.references().len(), 6);
        assert_eq!(read.computed(), vec![("range.fraction", "fraction")]);
    }

    #[test]
    fn refuses_a_range_with_no_prop_or_a_field_it_lacks() {
        assert_eq!(
            range(&call(&[("min", "min")])).unwrap_err(),
            "`range` names the prop that holds its value, `prop`"
        );
        assert_eq!(
            range(&call(&[("value", "value"), ("checked", "checked")])).unwrap_err(),
            "range: `checked` is not a field it has"
        );
    }
}
