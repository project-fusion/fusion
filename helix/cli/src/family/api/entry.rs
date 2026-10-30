//! How an element a reader types into says so, as its source's `text`: the
//! prop that holds the text, the prop that seeds it, the prop that keeps it
//! from changing, and the events an edit sends. The element's `field` is
//! where the text is typed, and a pressable that `clears` empties it.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// What an element a reader types into holds, as an input's text.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct TextEntry {
    /// The state the element is in while the field holds no text, as an
    /// input's `blank`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blank: Option<String>,
    /// The value the element computes as the box the caret is in, `-1` while
    /// the field has no focus, which a derivation reads, as a Pin Input's
    /// boxes do.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub caret: Option<String>,
    /// The part each box of the text is drawn in, which a press on it puts the
    /// caret in, as a Pin Input's `cell`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cell: Option<String>,
    /// The derivation, by its name, that turns what a reader typed into the
    /// text the element holds, as a Pin Input keeps the characters its type
    /// accepts.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cleans: Option<String>,
    /// The event sent once the text is as long as `length` says, as a Pin
    /// Input's `complete`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub complete: Option<String>,
    /// The prop that holds how many characters fill the text, which
    /// `complete` waits for.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub length: Option<String>,
    /// The event sent before an edit stands, which a handler can cancel, as
    /// an input's `before-change`. A refused edit puts the text back.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    /// The event sent once the reader is done with the text, as an input's
    /// `change` as it loses focus with new text, or as it is cleared.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub change: Option<String>,
    /// The event sent once a pressable that `clears` has emptied the field,
    /// after `input` and `change`, as an input's `clear`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clear: Option<String>,
    /// The prop that seeds the text where nothing sets it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial: Option<String>,
    /// The event sent once each edit stands, as an input's `input`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input: Option<String>,
    /// The prop that offers a press that empties the field, as an input's
    /// `clearable`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offers: Option<String>,
    /// The prop that keeps the reader from changing the text, while they
    /// can still read, select and copy it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub readonly: Option<String>,
    /// The prop that offers a press that shows and hides a password, as an
    /// input's `reveal`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reveal: Option<String>,
    /// The value the element computes as whether its press that reveals is
    /// drawn: while `reveal` holds and `kind` is a password.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unveils: Option<String>,
    /// The value the element computes as whether the password shows.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bared: Option<String>,
    /// The prop that says what the text is, as an input's `type`: a `number`
    /// reads `lowest`, `highest`, and `stride`, and a `password` hides its text.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    /// The prop that holds the least number of a `number` kind.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lowest: Option<String>,
    /// The prop that holds the greatest number of a `number` kind.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub highest: Option<String>,
    /// The prop that holds the step of a `number` kind.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stride: Option<String>,
    /// The value the element computes as whether its press that clears is
    /// drawn: while `offers` holds, the field holds text, and the reader may
    /// change it. A render reads it as `text.clearShown`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shows: Option<String>,
    /// The value the element computes as the text it holds, which a
    /// derivation reads, as a Pin Input's boxes do.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub typed: Option<String>,
    /// The prop that holds the text.
    pub value: String,
}

impl TextEntry {
    /// Each name the entry holds, where a source writes it, and what it
    /// names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        [
            ("before", self.before.as_ref(), Names::Event),
            ("change", self.change.as_ref(), Names::Event),
            ("clear", self.clear.as_ref(), Names::Event),
            ("complete", self.complete.as_ref(), Names::Event),
            ("initial", self.initial.as_ref(), Names::Prop),
            ("input", self.input.as_ref(), Names::Event),
            ("length", self.length.as_ref(), Names::Prop),
            ("offers", self.offers.as_ref(), Names::Prop),
            ("readonly", self.readonly.as_ref(), Names::Prop),
            ("value", Some(&self.value), Names::Prop),
            ("blank", self.blank.as_ref(), Names::State),
        ]
        .into_iter()
        .filter_map(|(at, name, names)| name.map(|name| (at, name.as_str(), names)))
        .collect()
    }
}

/// `entry({ value, ... })`, each field a name.
pub fn entry(lit: &Lit) -> Result<TextEntry, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`entry` is a call to `entry()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "entry", arguments.as_slice()) else {
        return Err("`entry` is a call to `entry()` with an object".to_owned());
    };
    let mut read = TextEntry::default();
    let mut value = None;
    for (key, field) in fields {
        let Lit::Text(name) = field else {
            return Err(format!("entry: `{key}` is not a field it has"));
        };
        let slot = match key.as_str() {
            "blank" => &mut read.blank,
            "bared" => &mut read.bared,
            "caret" => &mut read.caret,
            "highest" => &mut read.highest,
            "kind" => &mut read.kind,
            "lowest" => &mut read.lowest,
            "reveal" => &mut read.reveal,
            "stride" => &mut read.stride,
            "unveils" => &mut read.unveils,
            "cell" => &mut read.cell,
            "cleans" => &mut read.cleans,
            "complete" => &mut read.complete,
            "length" => &mut read.length,
            "typed" => &mut read.typed,
            "before" => &mut read.before,
            "change" => &mut read.change,
            "clear" => &mut read.clear,
            "initial" => &mut read.initial,
            "input" => &mut read.input,
            "offers" => &mut read.offers,
            "readonly" => &mut read.readonly,
            "shows" => &mut read.shows,
            "value" => &mut value,
            _ => return Err(format!("entry: `{key}` is not a field it has")),
        };
        *slot = Some(name.clone());
    }
    read.value = value.ok_or("`text` names the prop that holds its text, `prop`")?;
    Ok(read)
}

#[cfg(test)]
mod tests {
    use super::{entry, TextEntry};
    use crate::family::read::Lit;

    fn call(fields: &[(&str, &str)]) -> Lit {
        Lit::Call(
            "entry".to_owned(),
            vec![Lit::Object(
                fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_each_name_it_holds() {
        let read = entry(&call(&[
            ("before", "before-change"),
            ("change", "change"),
            ("clear", "clear"),
            ("initial", "default-value"),
            ("input", "input"),
            ("readonly", "readonly"),
            ("value", "value"),
        ]))
        .unwrap();
        assert_eq!(
            read,
            TextEntry {
                before: Some("before-change".to_owned()),
                change: Some("change".to_owned()),
                clear: Some("clear".to_owned()),
                initial: Some("default-value".to_owned()),
                input: Some("input".to_owned()),
                readonly: Some("readonly".to_owned()),
                value: "value".to_owned(),
                ..TextEntry::default()
            }
        );
        assert_eq!(read.references().len(), 7);
    }

    #[test]
    fn refuses_an_entry_with_no_prop_or_a_field_it_lacks() {
        assert_eq!(
            entry(&call(&[("input", "input")])).unwrap_err(),
            "`text` names the prop that holds its text, `prop`"
        );
        assert_eq!(
            entry(&call(&[("value", "value"), ("checked", "checked")])).unwrap_err(),
            "entry: `checked` is not a field it has"
        );
    }
}
