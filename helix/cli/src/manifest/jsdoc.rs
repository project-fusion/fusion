//! The prose above a declaration, as the manifest carries it.
//!
//! **A doc block is API here, not decoration.** The reference pages are
//! generated from these, so what a component says about itself is the sentence
//! a consumer reads, and getting it wrong by a line break changes a published
//! page. That is why this is held to the analyzer's output character for
//! character rather than to a plausible rendering.
//!
//! **The block's own line breaks are kept.** A paragraph wrapped at ninety
//! columns in the source arrives wrapped at ninety columns in the manifest:
//! the analyzer strips the frame and nothing else, so a description is the text
//! somebody wrote with the `*` gutter taken off.
//!
//! **Tags are not description.** Everything from the first `@tag` belongs to
//! another field, `@summary` to `summary` and `@csspart` to a part, so the
//! description ends where the tags begin.
//!
//! **Except `@description`, which says it is one.** A component whose block
//! opens with `@summary` writes the rest under an explicit tag, and that tag's
//! text is the description: taking the prose above it instead left every such
//! class describing itself with nothing, which is most of the library.

/// The frame stripped from a block comment, leaving what was written inside it.
fn undressed(comment: &str) -> String {
    let inner = comment
        .strip_prefix("/**")
        .or_else(|| comment.strip_prefix("/*"))
        .unwrap_or(comment);
    let inner = inner.strip_suffix("*/").unwrap_or(inner);
    let mut lines: Vec<String> = Vec::new();
    for line in inner.lines() {
        let trimmed = line.trim_start();
        /* The gutter, and only where it is one: a line reading `*` alone is a
        blank line inside the block, and one reading `* text` is that text.
        A line with no gutter at all is kept as it was written, which is how
        the first line of the block arrives when text follows the opener. */
        let without = trimmed
            .strip_prefix("* ")
            .or_else(|| trimmed.strip_prefix('*'))
            .unwrap_or(trimmed);
        lines.push(without.trim_end().to_owned());
    }
    while lines.first().is_some_and(String::is_empty) {
        lines.remove(0);
    }
    while lines.last().is_some_and(String::is_empty) {
        lines.pop();
    }
    lines.join("\n")
}

/// Whether a line opens a block tag, which is where the description stops.
fn is_a_tag(line: &str) -> bool {
    line.starts_with('@') && line.len() > 1
}

/// What a doc block says, split into its description and its tags.
#[derive(Clone, Debug, Default)]
pub struct Documented {
    /// The prose, with the block's own line breaks kept.
    pub description: Option<String>,
    /// Each tag as its name and the rest of the line, continuations joined.
    pub tags: Vec<(String, String)>,
}

/// Read a block comment the way the manifest reads it.
pub fn read(comment: &str) -> Documented {
    let body = undressed(comment);
    let mut description: Vec<&str> = Vec::new();
    let mut tags: Vec<(String, String)> = Vec::new();
    for line in body.lines() {
        if is_a_tag(line) {
            let mut parts = line[1..].splitn(2, char::is_whitespace);
            let name = parts.next().unwrap_or_default().to_owned();
            tags.push((name, parts.next().unwrap_or_default().trim().to_owned()));
            continue;
        }
        if let Some(last) = tags.last_mut() {
            /* A tag's text runs on until the next tag, which is how a long
            `@description` is written. **Blank lines included**: they are the
            paragraph breaks inside it, and dropping them ran three
            paragraphs of a component's own description together, which the
            diff caught as a two-character difference in six hundred. */
            last.1.push('\n');
            last.1.push_str(line);
            continue;
        }
        description.push(line);
    }
    while description.last().is_some_and(|one| one.trim().is_empty()) {
        description.pop();
    }
    /* The tag wins where there is one, being the author saying which part of
    the block is the description rather than leaving it to position. */
    let tagged = tags
        .iter()
        .find(|(name, _)| name == "description")
        .map(|(_, text)| text.trim().to_owned())
        .filter(|one| !one.is_empty());
    let above = if description.is_empty() {
        None
    } else {
        Some(description.join("\n"))
    };
    /* Trimmed at the end rather than as they are gathered, so a blank line
    between two tags leaves nothing behind on the one above. */
    for tag in &mut tags {
        tag.1 = tag.1.trim().to_owned();
    }
    Documented {
        description: tagged.or(above),
        tags,
    }
}

/// One entry a tag declares: a part, a slot, a state, a property or an event.
#[derive(Debug, Default)]
pub struct Entry {
    pub name: String,
    pub description: Option<String>,
    /// The braced type an `@event` carries, which no other tag has.
    pub type_text: Option<String>,
}

/// Read a tag's text as `name - description`, with an optional braced type.
///
/// **The dash is the separator and only the first one is.** A description
/// reading "Fired before the source is edited - and not after" keeps its own
/// dash, so splitting on every one would cut a sentence in half.
///
/// **A name is optional, because the default slot has none.** `@slot - The
/// messages.` describes the unnamed slot, which the manifest carries with an
/// empty name rather than leaving out.
pub fn entry(text: &str) -> Entry {
    let text = text.trim();
    let (type_text, rest) = match text.strip_prefix('{') {
        Some(after) => match after.split_once('}') {
            Some((written, rest)) => (Some(written.trim().to_owned()), rest.trim()),
            None => (None, text),
        },
        None => (None, text),
    };
    /* A leading dash is the unnamed slot, whose text opens with the separator
    because there is no name in front of it to separate from. The manifest
    carries that slot with an empty name rather than leaving it out. */
    let (name, description) = if let Some(description) = rest.strip_prefix("- ") {
        ("", Some(description.trim()))
    } else {
        match rest.split_once(" - ") {
            Some((name, description)) => (name.trim(), Some(description.trim())),
            /* No dash at all: the whole of it is the name, which is how a part
            with nothing to say about it is written. */
            None => (rest, None),
        }
    };
    Entry {
        description: description.map(str::to_owned).filter(|one| !one.is_empty()),
        name: name.trim().to_owned(),
        type_text,
    }
}

#[cfg(test)]
mod tests {
    use super::{entry, read};

    /// The frame comes off and nothing else moves.
    ///
    /// A paragraph wrapped at ninety columns in the source is wrapped at ninety
    /// columns in the manifest, because the reference pages are generated from
    /// these and a line break is a published difference.
    #[test]
    fn the_gutter_comes_off_and_the_line_breaks_stay() {
        let read = read("/**\n * One line\n * wrapped here.\n *\n * And a second.\n */");
        assert_eq!(
            read.description.as_deref(),
            Some("One line\nwrapped here.\n\nAnd a second.")
        );
    }

    #[test]
    fn a_tag_ends_the_description() {
        let read = read("/**\n * Prose.\n *\n * @since 0.1.0\n */");
        assert_eq!(read.description.as_deref(), Some("Prose."));
        assert_eq!(read.tags, vec![("since".to_owned(), "0.1.0".to_owned())]);
    }

    /// **The tag wins, and this is most of the library.**
    ///
    /// A component block opens with `@summary` and writes the rest under an
    /// explicit `@description`, so taking the prose above it instead left every
    /// such class describing itself with nothing.
    #[test]
    fn an_explicit_description_tag_is_the_description() {
        let read = read("/**\n * @summary A thing.\n *\n * @description\n * The long of it.\n */");
        assert_eq!(read.description.as_deref(), Some("The long of it."));
    }

    /// **Blank lines inside a tag are paragraph breaks, not padding.**
    ///
    /// Dropping them ran three paragraphs of a component's own description
    /// together, which the diff caught as two characters in six hundred.
    #[test]
    fn a_tags_own_paragraphs_survive() {
        let read = read("/**\n * @description\n * One.\n *\n * Two.\n *\n * @since 0.1.0\n */");
        assert_eq!(read.description.as_deref(), Some("One.\n\nTwo."));
        /* And the blank line before the next tag leaves nothing behind. */
        assert_eq!(read.tags.last().map(|one| one.1.as_str()), Some("0.1.0"));
    }

    /// The dash is the separator and only the first one is.
    #[test]
    fn a_description_keeps_its_own_dashes() {
        let one = entry("editor - The pane - and not the frame.");
        assert_eq!(one.name, "editor");
        assert_eq!(
            one.description.as_deref(),
            Some("The pane - and not the frame.")
        );
    }

    /// An event carries a braced type and nothing else does.
    #[test]
    fn an_event_reads_its_type_from_the_braces() {
        let one = entry("{HelixCaretEvent} helix-caret - Fired when the cursor moves.");
        assert_eq!(one.type_text.as_deref(), Some("HelixCaretEvent"));
        assert_eq!(one.name, "helix-caret");
    }

    /// The default slot has no name, and the manifest carries it with an empty
    /// one rather than leaving it out.
    #[test]
    fn the_default_slot_has_no_name() {
        let one = entry("- The messages.");
        assert_eq!(one.name, "");
        assert_eq!(one.description.as_deref(), Some("The messages."));
    }
}
