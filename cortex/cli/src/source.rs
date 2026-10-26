//! Where an episode came from, and how a note becomes episodes.
//!
//! **A source is an address, recorded on the episode's source node.** A file
//! is `file://` and its absolute path, and a paragraph adds `#` and its
//! number, so `forget notes/monday.md` finds every paragraph of that file from
//! any directory. Text from stdin is `stdin`, or the name `--source` gives it.

use std::path::Path;

/// The address of the file at `path`.
pub fn file(path: &Path) -> String {
    let absolute = std::path::absolute(path).unwrap_or_else(|_| path.to_path_buf());
    format!("file://{}", absolute.display())
}

/// The addresses `target` may name: itself, and the file it is a path to.
pub fn addresses(target: &str) -> Vec<String> {
    let mut named = vec![target.to_owned()];
    if !target.contains("://") {
        named.push(file(Path::new(target)));
    }
    named
}

/// Whether the address `uri` is `name` or one of its paragraphs.
pub fn names(uri: &str, name: &str) -> bool {
    uri == name
        || uri
            .strip_prefix(name)
            .is_some_and(|rest| rest.starts_with('#'))
}

/// An address as a person reads it: a file relative to this directory, and
/// the paragraph by its number.
pub fn display(uri: &str) -> String {
    let (base, paragraph) = match uri.rsplit_once('#') {
        Some((base, number)) if number.chars().all(|c| c.is_ascii_digit()) => (base, Some(number)),
        _ => (uri, None),
    };
    let shown = match base.strip_prefix("file://") {
        Some(path) => {
            let path = Path::new(path);
            std::env::current_dir()
                .ok()
                .and_then(|here| path.strip_prefix(here).ok().map(Path::to_path_buf))
                .unwrap_or_else(|| path.to_path_buf())
                .display()
                .to_string()
        }
        None => base.to_owned(),
    };
    match paragraph {
        Some(number) => format!("{shown}, paragraph {number}"),
        None => shown,
    }
}

/// The paragraphs of `text`: runs of lines between blank lines, each trimmed.
/// A paragraph that is only a Markdown heading is a title, and is left out.
pub fn paragraphs(text: &str) -> Vec<String> {
    let mut found = Vec::new();
    let mut lines: Vec<&str> = Vec::new();
    let mut close = |lines: &mut Vec<&str>| {
        let paragraph = lines.join("\n").trim().to_owned();
        lines.clear();
        let heading = !paragraph.contains('\n')
            && paragraph.trim_start_matches('#').starts_with(' ')
            && paragraph.starts_with('#');
        if !paragraph.is_empty() && !heading {
            found.push(paragraph);
        }
    };
    for line in text.lines() {
        if line.trim().is_empty() {
            close(&mut lines);
        } else {
            lines.push(line);
        }
    }
    close(&mut lines);
    found
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_note_is_its_paragraphs_without_its_title() {
        let note = "# Monday\n\nWe ship 0.12 on Thursday.\nDana writes the notes.\n\n\n#eng moved to Slack.\n";
        assert_eq!(
            paragraphs(note),
            [
                "We ship 0.12 on Thursday.\nDana writes the notes.",
                "#eng moved to Slack."
            ]
        );
        assert!(paragraphs("\n\n").is_empty());
    }

    #[test]
    fn a_file_names_each_of_its_paragraphs() {
        let monday = file(Path::new("notes/monday.md"));
        assert!(monday.starts_with("file:///"), "{monday}");
        assert!(addresses("notes/monday.md")
            .iter()
            .any(|name| names(&format!("{monday}#2"), name)));
        assert!(!names(&format!("{monday}x#2"), &monday));
        assert!(names("stdin#1", "stdin"));
        assert_eq!(display("slack:eng#3"), "slack:eng, paragraph 3");
        assert_eq!(
            display(&format!("{monday}#2")),
            "notes/monday.md, paragraph 2"
        );
    }
}
