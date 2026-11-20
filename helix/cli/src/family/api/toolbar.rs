//! How a toolbar says so: the props that turn it and that stop its arrow keys
//! at the ends. Every control drawn inside the part whose role is `toolbar`
//! is one of its stops.

use schemars::JsonSchema;
use serde::Serialize;
use ts_rs::TS;

use super::Names;
use crate::family::read::Lit;

/// What a toolbar holds: one tab stop, whose arrow keys move among the
/// controls inside it, along the way it runs.
#[derive(Clone, Debug, Default, PartialEq, Serialize, JsonSchema, TS)]
#[ts(optional_fields)]
pub struct Toolbar {
    /// The prop that stops the arrow keys at the first and the last control.
    /// Unset, they come round from one end to the other.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ends: Option<String>,
    /// The prop that says which way the toolbar runs, `horizontal` or
    /// `vertical`. Unset, it runs along a row.
    pub orientation: String,
}

impl Toolbar {
    /// Each name the toolbar holds, where a source writes it, and what it
    /// names.
    pub fn references(&self) -> Vec<(&'static str, &str, Names)> {
        let mut found = vec![("orientation", self.orientation.as_str(), Names::Prop)];
        if let Some(ends) = &self.ends {
            found.push(("ends", ends.as_str(), Names::Prop));
        }
        found
    }
}

/// `toolbar({ orientation, ends? })`, each field the name of a prop.
pub fn toolbar(lit: &Lit) -> Result<Toolbar, String> {
    let Lit::Call(helper, arguments) = lit else {
        return Err("`toolbar` is a call to `toolbar()`".to_owned());
    };
    let (true, [Lit::Object(fields)]) = (helper == "toolbar", arguments.as_slice()) else {
        return Err("`toolbar` is a call to `toolbar()` with an object".to_owned());
    };
    let mut orientation = None;
    let mut toolbar = Toolbar::default();
    for (key, value) in fields {
        match (key.as_str(), value) {
            ("ends", Lit::Text(name)) => toolbar.ends = Some(name.clone()),
            ("orientation", Lit::Text(name)) => orientation = Some(name.clone()),
            (key, _) => return Err(format!("toolbar: `{key}` is not a field it has")),
        }
    }
    toolbar.orientation =
        orientation.ok_or("toolbar: a toolbar names the prop that says which way it runs")?;
    Ok(toolbar)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text(value: &str) -> Lit {
        Lit::Text(value.to_owned())
    }

    #[test]
    fn reads_the_props_a_toolbar_runs_by() {
        let read = toolbar(&Lit::Call(
            "toolbar".to_owned(),
            vec![Lit::Object(vec![
                ("ends".to_owned(), text("stop-at-ends")),
                ("orientation".to_owned(), text("orientation")),
            ])],
        ))
        .unwrap();
        assert_eq!(read.ends.as_deref(), Some("stop-at-ends"));
        assert_eq!(read.orientation, "orientation");
        assert_eq!(
            read.references(),
            vec![
                ("orientation", "orientation", Names::Prop),
                ("ends", "stop-at-ends", Names::Prop)
            ]
        );
    }

    #[test]
    fn refuses_a_toolbar_that_does_not_say_which_way_it_runs() {
        assert_eq!(
            toolbar(&Lit::Call("toolbar".to_owned(), vec![Lit::Object(vec![])])).unwrap_err(),
            "toolbar: a toolbar names the prop that says which way it runs"
        );
    }
}
