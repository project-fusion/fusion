//! How a form control says what makes its answer acceptable: the prop that
//! makes an answer required, the page's own message, and the page's sentence
//! for a missing answer. What the answer is comes from the element's toggle,
//! its collection, or its entry, and an entry's text may be held to the props
//! that bound its length, its pattern, and its type as well. A number a
//! reader types and steps is held to its range, with the sentences for text
//! that is no number, a number past either end, and one off its step.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// What a form control's verdict reads.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Validation {
    /// The prop that holds the sentence for text that reads as no number,
    /// as a number input's `bad-input-message`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bad: Option<String>,
    /// The prop that holds the page's own message, which shows at once.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub feedback: Option<String>,
    /// The prop that holds the most characters an entry's text may have.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub maxlength: Option<String>,
    /// The value the element computes as the sentence it shows under the
    /// control: the page's message, or the verdict's once the reader has had
    /// a go, and empty while nothing shows. A render reads it as
    /// `validation.message`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    /// The prop that holds the fewest characters an entry's text may have.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub minlength: Option<String>,
    /// The prop that holds the sentence for a number off its step, with
    /// `{below}` and `{above}` in place of the nearest numbers on it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub off: Option<String>,
    /// The prop that holds the sentence for a number above its largest,
    /// with `{max}` in place of it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over: Option<String>,
    /// The prop that holds a regular expression an entry's text matches
    /// whole, as the web's `pattern` reads it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern: Option<String>,
    /// The prop that holds the sentence for text shorter than `minlength`
    /// says, where the length counts however the text came, as a Pin
    /// Input's code: `{length}` is how many characters fill it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short: Option<String>,
    /// The prop that holds the sentence for a number below its smallest,
    /// with `{min}` in place of it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub under: Option<String>,
    /// The prop that holds what an entry's text is, `email` or `url`, which
    /// the text has to read as.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    #[ts(rename = "type")]
    #[schemars(rename = "type")]
    pub kind: Option<String>,
    /// The prop that holds the sentence for a missing answer, whose default
    /// is the control's own.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub missing: Option<String>,
    /// The prop that makes an answer required.
    pub required: String,
}

impl Validation {
    /// Each name it holds, where a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        [
            ("bad", self.bad.as_ref()),
            ("feedback", self.feedback.as_ref()),
            ("maxlength", self.maxlength.as_ref()),
            ("minlength", self.minlength.as_ref()),
            ("missing", self.missing.as_ref()),
            ("off", self.off.as_ref()),
            ("over", self.over.as_ref()),
            ("pattern", self.pattern.as_ref()),
            ("required", Some(&self.required)),
            ("short", self.short.as_ref()),
            ("type", self.kind.as_ref()),
            ("under", self.under.as_ref()),
        ]
        .into_iter()
        .filter_map(|(at, name)| name.map(|name| (at, name.as_str(), Names::Prop)))
        .collect()
    }
}

/// `validation({ required, ... })`, each field a prop's name.
pub fn validation(lit: &Lit) -> Result<Validation, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`validation` is a call to `validation()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "validation", arguments.as_slice()) else {
        return Err("`validation` is a call to `validation()` with an object".to_owned());
    };
    let mut read = Validation::default();
    let mut required = None;
    for (key, value) in fields {
        let Lit::Text(name) = value else {
            return Err(format!("validation: `{key}` is not a field it has"));
        };
        let slot = match key.as_str() {
            "bad" => &mut read.bad,
            "feedback" => &mut read.feedback,
            "maxlength" => &mut read.maxlength,
            "message" => &mut read.message,
            "minlength" => &mut read.minlength,
            "missing" => &mut read.missing,
            "off" => &mut read.off,
            "over" => &mut read.over,
            "pattern" => &mut read.pattern,
            "short" => &mut read.short,
            "under" => &mut read.under,
            "type" => &mut read.kind,
            "required" => &mut required,
            _ => return Err(format!("validation: `{key}` is not a field it has")),
        };
        *slot = Some(name.clone());
    }
    read.required = required.ok_or("a validation names the prop that makes an answer required")?;
    Ok(read)
}

#[cfg(test)]
mod tests {
    use super::{validation, Validation};
    use crate::family::read::Lit;

    fn call(fields: &[(&str, &str)]) -> Lit {
        Lit::Call(
            "validation".to_owned(),
            vec![Lit::Object(
                fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), Lit::Text((*value).to_owned())))
                    .collect(),
            )],
        )
    }

    #[test]
    fn reads_each_prop_it_names() {
        assert_eq!(
            validation(&call(&[
                ("feedback", "feedback"),
                ("missing", "value-missing-message"),
                ("required", "required"),
            ]))
            .unwrap(),
            Validation {
                feedback: Some("feedback".to_owned()),
                missing: Some("value-missing-message".to_owned()),
                required: "required".to_owned(),
                ..Validation::default()
            }
        );
    }

    #[test]
    fn refuses_a_validation_with_no_required_prop_or_a_field_it_lacks() {
        assert_eq!(
            validation(&call(&[("feedback", "feedback")])).unwrap_err(),
            "a validation names the prop that makes an answer required"
        );
        assert_eq!(
            validation(&call(&[("required", "required"), ("step", "step")])).unwrap_err(),
            "validation: `step` is not a field it has"
        );
    }
}
