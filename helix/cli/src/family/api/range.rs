//! How an element a reader moves along a track says so, as its source's
//! `range`: the prop that holds the value, the props that bound it and step
//! it, and the events a move sends. The node whose role is `slider` is the
//! control a reader drags, presses, and steps with the keys. A field whose
//! role is `spinbutton` is a number a reader types and steps, with the keys
//! and the presses that `steps`. A box whose role is `radiogroup` is a row
//! of steps a reader picks a score from, as a rating's. A box whose role is
//! `separator` is the divider of a split a reader moves between two panes,
//! as a splitter's, its value where the divider stands.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// What an element a reader moves along a track holds, as a slider's value.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct ValueRange {
    /// The value the element computes as where its divider stands, as a
    /// percentage of its length, such as `40%`, for a split's first pane to
    /// take. A render reads it as `range.basis`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub basis: Option<String>,
    /// The event sent before a move stands, which a handler can cancel, as a
    /// slider's `before-change`. A refused move leaves the value where it was.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    /// The state the element is in while its value stands at its largest,
    /// so it steps no further up, as a number input's `at-max`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ceiling: Option<String>,
    /// The event sent once a move is done: as a drag or a press on the track
    /// ends, and with each step a key or a screen reader takes, as a slider's
    /// `change`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub change: Option<String>,
    /// The event sent once a score is taken back to none, as a rating's
    /// `clear`, after `input` and `change`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clear: Option<String>,
    /// The prop that lets a reader take a score back to none: a press on the
    /// score chosen, or Backspace or Delete, as a rating's `clearable`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clearable: Option<String>,
    /// The prop that holds the words a screen reader says for a split's
    /// divider while a pane is shut, as a splitter's `collapsed-label`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub closed: Option<String>,
    /// The event sent before a pane shuts or opens, which a handler can
    /// cancel, with the pane shut as `value`, or `''` where both stand open,
    /// as a splitter's `before-collapse`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub closing: Option<String>,
    /// The event sent once a pane shuts or opens, with the pane shut as
    /// `value`, as a splitter's `collapse`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collapse: Option<String>,
    /// The prop that holds which pane of a split is shut, `start` or `end`,
    /// as a splitter's `collapsed`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collapsed: Option<String>,
    /// The prop that holds which panes a reader can shut: `start`, `end`,
    /// `both`, or `none`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collapsible: Option<String>,
    /// The state the element is in while a reader drags it, as a slider's
    /// `dragging`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dragging: Option<String>,
    /// The state the element is in while its value stands at its smallest,
    /// so it steps no further down, as a number input's `at-min`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub floor: Option<String>,
    /// The value the element computes as whether its divider stands against
    /// an edge with no pane beside it. A render reads it as `range.flush`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flush: Option<String>,
    /// The state the element is in while a pane of a split is shut, as a
    /// splitter's `collapsed`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub folded: Option<String>,
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
    /// The value the element computes as how many marks the score it shows
    /// fills whole, as a rating's. A render reads it as `range.full`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full: Option<String>,
    /// The value the element computes as the largest value a screen reader
    /// hears it may take. A render reads it as `range.highest`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub highest: Option<String>,
    /// The prop that seeds the value where nothing sets it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial: Option<String>,
    /// The event sent once each move stands, as a slider's `input`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input: Option<String>,
    /// The prop that holds how many steps Page Up and Page Down take, as a
    /// number input's `large-step`, where `page` does not say how far.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub large: Option<String>,
    /// The prop that holds the locale the value is written in.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
    /// The value the element computes as the smallest value a screen reader
    /// hears it may take. A render reads it as `range.lowest`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lowest: Option<String>,
    /// The prop that holds the largest value.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<String>,
    /// The prop that holds the smallest value.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min: Option<String>,
    /// The prop that holds the words each score a reader picks is named by,
    /// with `{score}` and `{max}` in their places, as a rating's
    /// `option-label`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub option: Option<String>,
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
    /// The event sent as the score a reader's drag shows changes, with that
    /// score as `value`, or `''` once the element shows its own score again,
    /// as a rating's `preview`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview: Option<String>,
    /// The prop that holds the pane of a split that keeps its length as the
    /// element's own length changes, `start` or `end`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary: Option<String>,
    /// The value the element computes as its value, a number, as a screen
    /// reader reads it. A render reads it as `range.reading`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reading: Option<String>,
    /// The prop that keeps the reader from moving the value, while they can
    /// still reach it and hear it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub readonly: Option<String>,
    /// The prop that holds the least a split's end pane keeps, as a
    /// splitter's `end-min`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reserve: Option<String>,
    /// The state the element is in while its control has focus the keyboard
    /// brought, as a slider's `focus-visible`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ringed: Option<String>,
    /// The value the element computes as its value written as a reader sees
    /// it, in its format. A render reads it as `range.said`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub said: Option<String>,
    /// The value the element computes as how much of the mark after the
    /// whole ones the score it shows fills, 0 to 1, as a rating's. A render
    /// reads it as `range.part`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub share: Option<String>,
    /// The prop that seeds which pane of a split is shut, where nothing
    /// sets it, as a splitter's `default-collapsed`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shut: Option<String>,
    /// The prop that holds how much of a shut pane still shows, as a
    /// percentage, as a splitter's `collapsed-size`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sliver: Option<String>,
    /// The prop that holds the places a dragged divider snaps to, as a
    /// splitter's `snap`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snap: Option<String>,
    /// The value the element computes as how much of the track its fill
    /// covers, 0 to 1: its end less its start. A render reads it as
    /// `range.fillSpan`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub span: Option<String>,
    /// The value the element computes as the words a screen reader says for
    /// its value, where its format or its `template` asks for any. A render
    /// reads it as `range.spoken`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spoken: Option<String>,
    /// The state the element is in while a split's panes stand one above
    /// the other, as a splitter's `vertical`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stacked: Option<String>,
    /// The prop that holds how far one step moves the value.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step: Option<String>,
    /// The prop that holds the sentence a screen reader says for the value,
    /// with `{value}` in its place, as a slider's `value-text`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template: Option<String>,
    /// The prop that holds how close, in points, a drag comes to a snap
    /// place to land on it, as a splitter's `snap-threshold`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub threshold: Option<String>,
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
            ("ceiling", self.ceiling.as_ref(), Names::State),
            ("change", self.change.as_ref(), Names::Event),
            ("clear", self.clear.as_ref(), Names::Event),
            ("clearable", self.clearable.as_ref(), Names::Prop),
            ("closed", self.closed.as_ref(), Names::Prop),
            ("closing", self.closing.as_ref(), Names::Event),
            ("collapse", self.collapse.as_ref(), Names::Event),
            ("collapsed", self.collapsed.as_ref(), Names::Prop),
            ("collapsible", self.collapsible.as_ref(), Names::Prop),
            ("dragging", self.dragging.as_ref(), Names::State),
            ("floor", self.floor.as_ref(), Names::State),
            ("folded", self.folded.as_ref(), Names::State),
            ("format", self.format.as_ref(), Names::Prop),
            ("initial", self.initial.as_ref(), Names::Prop),
            ("input", self.input.as_ref(), Names::Event),
            ("large", self.large.as_ref(), Names::Prop),
            ("locale", self.locale.as_ref(), Names::Prop),
            ("max", self.max.as_ref(), Names::Prop),
            ("min", self.min.as_ref(), Names::Prop),
            ("option", self.option.as_ref(), Names::Prop),
            ("orientation", self.orientation.as_ref(), Names::Prop),
            ("origin", self.origin.as_ref(), Names::Prop),
            ("page", self.page.as_ref(), Names::Prop),
            ("preview", self.preview.as_ref(), Names::Event),
            ("primary", self.primary.as_ref(), Names::Prop),
            ("readonly", self.readonly.as_ref(), Names::Prop),
            ("reserve", self.reserve.as_ref(), Names::Prop),
            ("ringed", self.ringed.as_ref(), Names::State),
            ("shut", self.shut.as_ref(), Names::Prop),
            ("sliver", self.sliver.as_ref(), Names::Prop),
            ("snap", self.snap.as_ref(), Names::Prop),
            ("stacked", self.stacked.as_ref(), Names::State),
            ("step", self.step.as_ref(), Names::Prop),
            ("template", self.template.as_ref(), Names::Prop),
            ("threshold", self.threshold.as_ref(), Names::Prop),
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
            ("range.basis", self.basis.as_ref()),
            ("range.fillFrom", self.from.as_ref()),
            ("range.fillSpan", self.span.as_ref()),
            ("range.fillTo", self.to.as_ref()),
            ("range.flush", self.flush.as_ref()),
            ("range.fraction", self.fraction.as_ref()),
            ("range.full", self.full.as_ref()),
            ("range.highest", self.highest.as_ref()),
            ("range.lowest", self.lowest.as_ref()),
            ("range.part", self.share.as_ref()),
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
            "basis" => &mut read.basis,
            "before" => &mut read.before,
            "ceiling" => &mut read.ceiling,
            "change" => &mut read.change,
            "clear" => &mut read.clear,
            "clearable" => &mut read.clearable,
            "closed" => &mut read.closed,
            "closing" => &mut read.closing,
            "collapse" => &mut read.collapse,
            "collapsed" => &mut read.collapsed,
            "collapsible" => &mut read.collapsible,
            "dragging" => &mut read.dragging,
            "floor" => &mut read.floor,
            "flush" => &mut read.flush,
            "folded" => &mut read.folded,
            "format" => &mut read.format,
            "fraction" => &mut read.fraction,
            "from" => &mut read.from,
            "full" => &mut read.full,
            "highest" => &mut read.highest,
            "initial" => &mut read.initial,
            "input" => &mut read.input,
            "large" => &mut read.large,
            "locale" => &mut read.locale,
            "lowest" => &mut read.lowest,
            "max" => &mut read.max,
            "min" => &mut read.min,
            "option" => &mut read.option,
            "orientation" => &mut read.orientation,
            "origin" => &mut read.origin,
            "page" => &mut read.page,
            "preview" => &mut read.preview,
            "primary" => &mut read.primary,
            "reading" => &mut read.reading,
            "readonly" => &mut read.readonly,
            "reserve" => &mut read.reserve,
            "ringed" => &mut read.ringed,
            "said" => &mut read.said,
            "share" => &mut read.share,
            "shut" => &mut read.shut,
            "sliver" => &mut read.sliver,
            "snap" => &mut read.snap,
            "span" => &mut read.span,
            "spoken" => &mut read.spoken,
            "stacked" => &mut read.stacked,
            "step" => &mut read.step,
            "template" => &mut read.template,
            "threshold" => &mut read.threshold,
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
