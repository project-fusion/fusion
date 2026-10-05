//! Templates, read for their elements: HTML, and the template syntaxes of Vue,
//! Svelte, Angular, and Lit.
//!
//! **Tolerant, and for one question.** A scan asks which elements a template
//! writes, with which attributes, under which parent, and on which line. A
//! reader that also understood each framework's expressions would be four
//! compilers; this one steps over expressions, keeps the tags, and says of
//! each attribute only what the syntax itself makes certain.
//!
//! **An attribute is checked only where the syntax says it is one.**
//!
//! - `emphasis="ghost"` is an attribute with a value, and both are checked.
//! - Lit's `tone=${...}` and `?disabled=${...}`, and Angular's `[attr.tone]`,
//!   are attributes whose value is decided at run time, so the name is
//!   checked and the value is not.
//! - Svelte's `items={...}`, Angular's `tone="{{...}}"` and `[items]`, Vue's
//!   `:items`, and Lit's `.items` set a property where the element has one,
//!   and an event or a directive is neither, so none of these is checked.

/// One element a template writes.
#[derive(Clone, Debug, PartialEq)]
pub struct Element {
    pub attributes: Vec<Attribute>,
    /// The line its opening tag starts on, counting from 1.
    pub line: usize,
    /// The element it sits in, by its position in the list.
    pub parent: Option<usize>,
    /// The tag, lowercased.
    pub tag: String,
    /// The opening tag's own text, for a finding's evidence.
    pub text: String,
}

/// One attribute, named as the element receives it.
#[derive(Clone, Debug, PartialEq)]
pub struct Attribute {
    pub name: String,
    pub value: Value,
}

/// What a template says about an attribute's value.
#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    /// Written out, so it is known: an empty string for a bare attribute.
    Literal(String),
    /// An attribute whose value is decided at run time.
    Bound,
    /// Maybe a property, or an event or a directive: none of the checks apply.
    Skip,
}

/// A `<style>` block, with the line it starts on.
#[derive(Clone, Debug, PartialEq)]
pub struct Style {
    pub line: usize,
    /// The language it is written in, where it names one: `scss`, `less`.
    pub lang: Option<String>,
    pub text: String,
}

/// What one template holds.
#[derive(Debug, Default)]
pub struct Template {
    /// The `helix-*` tags the module defines, where it is a module.
    pub defines: Vec<String>,
    pub elements: Vec<Element>,
    pub styles: Vec<Style>,
}

/// Elements HTML closes on their own, which never hold another.
const VOID: [&str; 14] = [
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source",
    "track", "wbr",
];

/// The longest opening tag kept as evidence, in characters.
const EVIDENCE: usize = 200;

/// Reads a template. `first` is the line the text starts on.
pub fn read(text: &str, first: usize) -> Template {
    let bytes = text.as_bytes();
    let lines: Vec<usize> = bytes
        .iter()
        .enumerate()
        .filter(|(_, byte)| **byte == b'\n')
        .map(|(at, _)| at)
        .collect();
    let line_of = |at: usize| first + lines.partition_point(|newline| *newline < at);
    let mut template = Template::default();
    let mut open: Vec<usize> = Vec::new();
    let mut at = 0;
    while let Some(found) = text[at..].find('<') {
        let start = at + found;
        let rest = &text[start..];
        if rest.starts_with("<!--") {
            at = rest.find("-->").map_or(bytes.len(), |end| start + end + 3);
            continue;
        }
        if rest.starts_with("<!") || rest.starts_with("<?") {
            at = rest.find('>').map_or(bytes.len(), |end| start + end + 1);
            continue;
        }
        if let Some(closing) = rest.strip_prefix("</") {
            let name: String = closing
                .chars()
                .take_while(|one| {
                    one.is_ascii_alphanumeric() || *one == '-' || *one == ':' || *one == '.'
                })
                .collect::<String>()
                .to_ascii_lowercase();
            if let Some(depth) = open
                .iter()
                .rposition(|index| template.elements[*index].tag == name)
            {
                open.truncate(depth);
            }
            at = rest.find('>').map_or(bytes.len(), |end| start + end + 1);
            continue;
        }
        let name: String = rest[1..]
            .chars()
            .take_while(|one| {
                one.is_ascii_alphanumeric() || *one == '-' || *one == ':' || *one == '.'
            })
            .collect();
        if name.is_empty() || !name.starts_with(|one: char| one.is_ascii_alphabetic()) {
            at = start + 1;
            continue;
        }
        let (attributes, end, closed) = attributes(text, start + 1 + name.len());
        let tag = name.to_ascii_lowercase();
        let opening = &text[start..end.min(text.len())];
        let element = Element {
            attributes,
            line: line_of(start),
            parent: open.last().copied(),
            tag: tag.clone(),
            text: opening.chars().take(EVIDENCE).collect(),
        };
        if tag == "style" || tag == "script" {
            let close = format!("</{tag}");
            let body_end = text[end..]
                .to_ascii_lowercase()
                .find(&close)
                .map_or(bytes.len(), |found| end + found);
            if tag == "style" {
                let lang = element
                    .attributes
                    .iter()
                    .find(|one| one.name == "lang")
                    .and_then(|one| match &one.value {
                        Value::Literal(lang) => Some(lang.to_ascii_lowercase()),
                        _ => None,
                    });
                template.styles.push(Style {
                    line: line_of(end),
                    lang,
                    text: text[end..body_end].to_owned(),
                });
            }
            at = text[body_end..]
                .find('>')
                .map_or(bytes.len(), |found| body_end + found + 1);
            continue;
        }
        let index = template.elements.len();
        template.elements.push(element);
        if !closed && !VOID.contains(&tag.as_str()) {
            open.push(index);
        }
        at = end;
    }
    template
}

/// MDX with its code samples blanked, newlines kept, so every line keeps its
/// number: a fenced block or an inline code span shows markup and renders
/// none.
pub fn without_code(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut fence: Option<&str> = None;
    for line in text.split_inclusive('\n') {
        let trimmed = line.trim_start();
        let opens = ["```", "~~~"]
            .into_iter()
            .find(|mark| trimmed.starts_with(mark));
        match (fence, opens) {
            (None, Some(mark)) => {
                fence = Some(mark);
                out.push_str(&blank(line));
            }
            (Some(open), Some(mark)) if open == mark => {
                fence = None;
                out.push_str(&blank(line));
            }
            (Some(_), _) => out.push_str(&blank(line)),
            (None, None) => out.push_str(&inline_code(line)),
        }
    }
    out
}

/// A line as spaces, its newline kept.
fn blank(line: &str) -> String {
    line.chars()
        .map(|one| if one == '\n' { one } else { ' ' })
        .collect()
}

/// A line with each inline code span blanked: a run of backticks to the next
/// run of the same length.
fn inline_code(line: &str) -> String {
    let chars: Vec<char> = line.chars().collect();
    let mut out: Vec<char> = chars.clone();
    let mut at = 0;
    while at < chars.len() {
        if chars[at] != '`' {
            at += 1;
            continue;
        }
        let run = chars[at..].iter().take_while(|one| **one == '`').count();
        let mut close = at + run;
        let mut found = None;
        while close < chars.len() {
            if chars[close] == '`' {
                let length = chars[close..].iter().take_while(|one| **one == '`').count();
                if length == run {
                    found = Some(close + length);
                    break;
                }
                close += length;
            } else {
                close += 1;
            }
        }
        match found {
            Some(end) => {
                for one in &mut out[at..end] {
                    *one = ' ';
                }
                at = end;
            }
            None => at += run,
        }
    }
    out.into_iter().collect()
}

/// Reads the attributes of the tag whose name ends at `at`, up to its `>`.
/// Returns them, where the tag ends, and whether it closed itself.
fn attributes(text: &str, mut at: usize) -> (Vec<Attribute>, usize, bool) {
    let bytes = text.as_bytes();
    let mut found = Vec::new();
    loop {
        while at < bytes.len() && bytes[at].is_ascii_whitespace() {
            at += 1;
        }
        if at >= bytes.len() {
            return (found, bytes.len(), false);
        }
        match bytes[at] {
            b'>' => return (found, at + 1, false),
            b'/' if bytes.get(at + 1) == Some(&b'>') => return (found, at + 2, true),
            b'/' => {
                at += 1;
                continue;
            }
            _ => {}
        }
        /* A Svelte spread or shorthand, `{...rest}` or `{value}`, is one token. */
        if bytes[at] == b'{' {
            at = balanced(bytes, at, b'{', b'}');
            continue;
        }
        let name_start = at;
        let ends = |at: usize| {
            bytes[at].is_ascii_whitespace()
                || matches!(bytes[at], b'=' | b'>')
                || (bytes[at] == b'/' && bytes.get(at + 1) == Some(&b'>'))
        };
        while at < bytes.len() && !ends(at) {
            at += 1;
        }
        let raw_name = &text[name_start..at];
        while at < bytes.len() && bytes[at].is_ascii_whitespace() {
            at += 1;
        }
        let mut raw_value = None;
        if at < bytes.len() && bytes[at] == b'=' {
            at += 1;
            while at < bytes.len() && bytes[at].is_ascii_whitespace() {
                at += 1;
            }
            let value_start = at;
            at = value_end(bytes, at);
            raw_value = Some(&text[value_start..at]);
        }
        if !raw_name.is_empty() {
            found.push(classify(raw_name, raw_value));
        }
    }
}

/// Where a balanced run that opens at `at` with `open` ends, quotes included.
fn balanced(bytes: &[u8], mut at: usize, open: u8, close: u8) -> usize {
    let mut depth = 0usize;
    let mut quote: Option<u8> = None;
    while at < bytes.len() {
        let one = bytes[at];
        match quote {
            Some(mark) => {
                if one == b'\\' {
                    at += 1;
                } else if one == mark {
                    quote = None;
                }
            }
            None => {
                if matches!(one, b'"' | b'\'' | b'`') {
                    quote = Some(one);
                } else if one == open {
                    depth += 1;
                } else if one == close {
                    depth -= 1;
                    if depth == 0 {
                        return at + 1;
                    }
                }
            }
        }
        at += 1;
    }
    bytes.len()
}

/// Where an attribute's value ends: a quoted string, an expression in braces,
/// or an unquoted run.
fn value_end(bytes: &[u8], at: usize) -> usize {
    match bytes.get(at) {
        Some(b'"' | b'\'') => {
            let quote = bytes[at];
            let mut end = at + 1;
            while end < bytes.len() && bytes[end] != quote {
                /* An expression inside the value may hold the same quote. */
                if bytes[end] == b'$' && bytes.get(end + 1) == Some(&b'{') {
                    end = balanced(bytes, end + 1, b'{', b'}');
                    continue;
                }
                end += 1;
            }
            (end + 1).min(bytes.len())
        }
        Some(b'{') => balanced(bytes, at, b'{', b'}'),
        Some(b'$') if bytes.get(at + 1) == Some(&b'{') => balanced(bytes, at + 1, b'{', b'}'),
        _ => {
            let mut end = at;
            while end < bytes.len() && !bytes[end].is_ascii_whitespace() && bytes[end] != b'>' {
                end += 1;
            }
            end
        }
    }
}

/// An attribute as the element receives it, from how the template wrote it.
fn classify(raw_name: &str, raw_value: Option<&str>) -> Attribute {
    let skip = |name: &str| Attribute {
        name: name.to_owned(),
        value: Value::Skip,
    };
    /* Events, property bindings, and directives, in each syntax. */
    if raw_name.starts_with(['@', '.', ':', '(', '*', '#'])
        || raw_name.starts_with("v-")
        || raw_name.contains(':')
    {
        return skip(raw_name);
    }
    if let Some(name) = raw_name.strip_prefix('?') {
        return Attribute {
            name: name.to_ascii_lowercase(),
            value: Value::Bound,
        };
    }
    if let Some(inner) = raw_name
        .strip_prefix('[')
        .and_then(|rest| rest.strip_suffix(']'))
    {
        return match inner.strip_prefix("attr.") {
            Some(name) => Attribute {
                name: name.to_ascii_lowercase(),
                value: Value::Bound,
            },
            None => skip(raw_name),
        };
    }
    let name = raw_name.to_ascii_lowercase();
    let Some(raw) = raw_value else {
        return Attribute {
            name,
            value: Value::Literal(String::new()),
        };
    };
    let unquoted = raw
        .strip_prefix('"')
        .and_then(|rest| rest.strip_suffix('"'))
        .or_else(|| {
            raw.strip_prefix('\'')
                .and_then(|rest| rest.strip_suffix('\''))
        });
    /* Lit interpolates into an attribute; Svelte and Angular set a property
    where the element has one. */
    let value = match unquoted {
        Some(text) if text.contains("${") => Value::Bound,
        Some(text) if text.contains('{') => Value::Skip,
        Some(text) => Value::Literal(text.to_owned()),
        None if raw.starts_with("${") => Value::Bound,
        None if raw.starts_with('{') => Value::Skip,
        None => Value::Literal(raw.to_owned()),
    };
    Attribute { name, value }
}

#[cfg(test)]
mod tests {
    use super::{read, without_code, Value};

    #[test]
    fn elements_keep_their_parent_line_and_attributes() {
        let template = read(
            "<main>\n  <helix-card tone=\"primary\" separation='outlined'>\n    <img src=a.png>\n    <span slot=\"header\">A</span>\n  </helix-card>\n</main>\n",
            1,
        );
        let tags: Vec<&str> = template
            .elements
            .iter()
            .map(|one| one.tag.as_str())
            .collect();
        assert_eq!(tags, ["main", "helix-card", "img", "span"]);
        let card = &template.elements[1];
        assert_eq!(card.line, 2);
        assert_eq!(
            card.attributes[0].value,
            Value::Literal("primary".to_owned())
        );
        assert_eq!(template.elements[3].parent, Some(1));
    }

    #[test]
    fn each_syntax_says_what_it_can() {
        let template = read(
            "<helix-button @click=${go} .items=${list} ?disabled=${off} tone=\"${tone}\" [attr.emphasis]=\"x\" [items]=\"y\" :label=\"z\" v-if=\"a\" {...rest} emphasis={kind} title=\"{{name}}\" label=Save></helix-button>",
            1,
        );
        let button = &template.elements[0];
        let summary: Vec<(String, Value)> = button
            .attributes
            .iter()
            .map(|one| (one.name.clone(), one.value.clone()))
            .collect();
        assert_eq!(
            summary,
            [
                ("@click".to_owned(), Value::Skip),
                (".items".to_owned(), Value::Skip),
                ("disabled".to_owned(), Value::Bound),
                ("tone".to_owned(), Value::Bound),
                ("emphasis".to_owned(), Value::Bound),
                ("[items]".to_owned(), Value::Skip),
                (":label".to_owned(), Value::Skip),
                ("v-if".to_owned(), Value::Skip),
                ("emphasis".to_owned(), Value::Skip),
                ("title".to_owned(), Value::Skip),
                ("label".to_owned(), Value::Literal("Save".to_owned())),
            ]
        );
    }

    #[test]
    fn mdx_code_samples_are_left_out() {
        let text = without_code(
            "<helix-card tone=\"primary\">\n```html\n<helix-tag tonee>\n```\nWrite `<helix-tag tonee>` once.\n</helix-card>\n",
        );
        let template = read(&text, 1);
        let tags: Vec<(&str, usize)> = template
            .elements
            .iter()
            .map(|one| (one.tag.as_str(), one.line))
            .collect();
        assert_eq!(tags, [("helix-card", 1)]);
        assert_eq!(text.lines().count(), 6);
    }

    #[test]
    fn style_blocks_are_kept_with_their_language() {
        let template = read(
            "<template><helix-tag/></template>\n<style scoped>\nhelix-tag::part(label) { color: red; }\n</style>\n<style lang=\"scss\">$x: 1;</style>",
            1,
        );
        assert_eq!(template.elements.len(), 2);
        assert_eq!(template.styles.len(), 2);
        assert_eq!(template.styles[0].line, 2);
        assert_eq!(template.styles[1].lang.as_deref(), Some("scss"));
    }
}
