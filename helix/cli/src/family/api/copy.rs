//! How an element puts text on the clipboard as it is pressed and says what
//! became of it for a moment, as a copy button confirms a copy.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// The words an element is named by as a copy stands: at rest, once a copy
/// is confirmed, and once a press put nothing on the clipboard.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
pub struct CopyWords {
    /// The prop or the computed value that names it once a copy is confirmed.
    pub copied: String,
    /// The prop or the computed value that names it once a copy failed.
    pub failed: String,
    /// The prop or the computed value that names it at rest.
    pub resting: String,
}

/// A copy to the clipboard on a press of the pressable that `copies`, and
/// the result it holds for a moment.
///
/// **The clipboard capability writes it**, the browser's clipboard on the
/// web and expo-clipboard on a phone, and **the timers capability ends the
/// result**, so a fake clock moves both platforms alike. Empty text is not
/// copied, and is a failed copy.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
pub struct Copy {
    /// The prop that holds how long the result stands, in milliseconds.
    pub after: String,
    /// The state that holds while a copy stands confirmed.
    pub copied: String,
    /// The state that holds while a press that put nothing on the clipboard
    /// is said.
    pub failed: String,
    /// The event sent when a press put nothing on the clipboard.
    pub fails: String,
    /// The value the element computes: the words it is named by now.
    pub says: String,
    /// The event sent once the text is on the clipboard, its `value` the text.
    pub sends: String,
    /// The prop that holds the text a press copies.
    pub text: String,
    /// The value the element computes: the result's words while it stands,
    /// and none at rest.
    pub told: String,
    /// The words it is named by, as the copy stands.
    pub words: CopyWords,
}

impl Copy {
    /// Each name the copy holds that names a prop, a state or an event, where
    /// a source writes it, and what it names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        vec![
            ("after", self.after.as_str(), Names::Prop),
            ("copied", self.copied.as_str(), Names::State),
            ("failed", self.failed.as_str(), Names::State),
            ("fails", self.fails.as_str(), Names::Event),
            ("sends", self.sends.as_str(), Names::Event),
            ("text", self.text.as_str(), Names::Prop),
        ]
    }

    /// The names of the words, each a prop or a value the element computes.
    pub fn worded(&self) -> [(&'static str, &str); 3] {
        [
            ("words.copied", self.words.copied.as_str()),
            ("words.failed", self.words.failed.as_str()),
            ("words.resting", self.words.resting.as_str()),
        ]
    }

    /// The values the copy computes, which `bind()` and `not()` read by
    /// name: the states its result holds and the words it names it by.
    pub fn computed(&self) -> [&str; 4] {
        [
            self.copied.as_str(),
            self.failed.as_str(),
            self.says.as_str(),
            self.told.as_str(),
        ]
    }
}

/// `copy({ after, copied, failed, fails, says, sends, text, told, words })`.
pub fn copy(lit: &Lit) -> Result<Copy, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`copy` is a call to `copy()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "copy", arguments.as_slice()) else {
        return Err("`copy` is a call to `copy()` with an object".to_owned());
    };
    let mut copy = Copy::default();
    for (key, value) in fields {
        match (key.as_str(), value) {
            ("after", Lit::Text(name)) => copy.after.clone_from(name),
            ("copied", Lit::Text(name)) => copy.copied.clone_from(name),
            ("failed", Lit::Text(name)) => copy.failed.clone_from(name),
            ("fails", Lit::Text(name)) => copy.fails.clone_from(name),
            ("says", Lit::Text(name)) => copy.says.clone_from(name),
            ("sends", Lit::Text(name)) => copy.sends.clone_from(name),
            ("text", Lit::Text(name)) => copy.text.clone_from(name),
            ("told", Lit::Text(name)) => copy.told.clone_from(name),
            ("words", Lit::Object(words)) => copy.words = worded(words)?,
            (key, _) => return Err(format!("copy: `{key}` is not a field it has")),
        }
    }
    let named = [
        &copy.after,
        &copy.copied,
        &copy.failed,
        &copy.fails,
        &copy.says,
        &copy.sends,
        &copy.text,
        &copy.told,
        &copy.words.copied,
        &copy.words.failed,
        &copy.words.resting,
    ];
    if named.iter().any(|name| name.is_empty()) {
        return Err(
            "copy: a copy names `after`, `copied`, `failed`, `fails`, `says`, `sends`, `text`, `told`, and its `words`, `copied`, `failed`, and `resting`"
                .to_owned(),
        );
    }
    Ok(copy)
}

/// `words: { copied, failed, resting }`, each a name.
fn worded(fields: &[(String, Lit)]) -> Result<CopyWords, String> {
    let mut words = CopyWords::default();
    for (key, value) in fields {
        match (key.as_str(), value) {
            ("copied", Lit::Text(name)) => words.copied.clone_from(name),
            ("failed", Lit::Text(name)) => words.failed.clone_from(name),
            ("resting", Lit::Text(name)) => words.resting.clone_from(name),
            (key, _) => return Err(format!("copy: `words.{key}` is not a field it has")),
        }
    }
    Ok(words)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text(value: &str) -> Lit {
        Lit::Text(value.to_owned())
    }

    fn object(fields: Vec<(&str, Lit)>) -> Lit {
        Lit::Object(
            fields
                .into_iter()
                .map(|(key, value)| (key.to_owned(), value))
                .collect(),
        )
    }

    fn call(fields: Vec<(&str, Lit)>) -> Lit {
        Lit::Call("copy".to_owned(), vec![object(fields)])
    }

    #[test]
    fn reads_what_a_copy_names() {
        let read = copy(&call(vec![
            ("after", text("feedback-duration")),
            ("copied", text("copied")),
            ("failed", text("failed")),
            ("fails", text("copy-error")),
            ("says", text("says")),
            ("sends", text("copy")),
            ("text", text("value")),
            ("told", text("told")),
            (
                "words",
                object(vec![
                    ("copied", text("copied-words")),
                    ("failed", text("failed-words")),
                    ("resting", text("name")),
                ]),
            ),
        ]))
        .unwrap();
        assert_eq!(read.words.resting, "name");
        assert_eq!(read.references().len(), 6);
        assert_eq!(read.computed(), ["copied", "failed", "says", "told"]);
    }

    #[test]
    fn refuses_a_copy_that_leaves_a_name_out() {
        let read = copy(&call(vec![("after", text("feedback-duration"))]));
        assert!(read.is_err_and(|why| why.starts_with("copy: a copy names")));
    }

    #[test]
    fn refuses_a_field_it_does_not_have() {
        let read = copy(&call(vec![("from", text("x"))]));
        assert_eq!(read, Err("copy: `from` is not a field it has".to_owned()));
    }
}
