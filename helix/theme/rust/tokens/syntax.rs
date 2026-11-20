//! A CSS value as component values: the tokens of CSS Syntax 3 that a token's
//! value is written in, with each function's arguments nested inside it.
//!
//! **A subset, and it refuses the rest.** The token layer writes numbers,
//! dimensions, percentages, hex colors, identifiers, quoted family names,
//! functions, parentheses, commas, and the four `calc()` operators. Anything else, such as a
//! URL or an escape, is refused with a sentence naming it, so a value the
//! typing cannot read never reaches it as something it misread.

/// One component value.
#[derive(Clone, Debug, PartialEq)]
pub enum Node {
    /// `,` at the level it is written.
    Comma,
    /// A number with a unit, such as `0.25rem` or `120ms`.
    Dimension(f64, String),
    /// A function and its arguments, whitespace and commas included. A bare
    /// `(` is a function with no name.
    Function(String, Vec<Node>),
    /// `#` and the characters after it, without the `#`.
    Hash(String),
    /// A name, such as `transparent`, `l` or `ui-sans-serif`.
    Ident(String),
    /// A number with no unit.
    Number(f64),
    /// One of `+`, `-`, `*` and `/` standing on its own.
    Operator(char),
    /// A number followed by `%`, as written: `5` for `5%`.
    Percentage(f64),
    /// A quoted string, without its quotes.
    Quoted(String),
    /// Whitespace between two components, however much of it was written.
    Space,
}

/// The component values of `text`, with whitespace at either end and around a
/// function's parentheses dropped.
///
/// # Errors
///
/// A sentence when `text` holds a character outside the subset, an unclosed
/// function or string, or a `)` with nothing open.
pub fn parse(text: &str) -> Result<Vec<Node>, String> {
    let characters: Vec<char> = text.chars().collect();
    let mut at = 0;
    let nodes = list(&characters, &mut at, text)?;
    if at < characters.len() {
        return Err(format!("`{text}` closes a parenthesis it never opened"));
    }
    Ok(nodes)
}

/// Reads components until the end of the text or a `)`, which it leaves.
fn list(characters: &[char], at: &mut usize, text: &str) -> Result<Vec<Node>, String> {
    let mut nodes = Vec::new();
    while let Some(&character) = characters.get(*at) {
        if character == ')' {
            break;
        }
        if character.is_whitespace() {
            while characters.get(*at).is_some_and(|one| one.is_whitespace()) {
                *at += 1;
            }
            nodes.push(Node::Space);
            continue;
        }
        nodes.push(component(characters, at, text)?);
    }
    trim(&mut nodes);
    Ok(nodes)
}

/// Drops whitespace at either end, which is never part of a value.
fn trim(nodes: &mut Vec<Node>) {
    while nodes.last() == Some(&Node::Space) {
        nodes.pop();
    }
    if nodes.first() == Some(&Node::Space) {
        nodes.remove(0);
    }
}

fn component(characters: &[char], at: &mut usize, text: &str) -> Result<Node, String> {
    let character = characters[*at];
    let next = characters.get(*at + 1).copied();
    let after = characters.get(*at + 2).copied();
    if starts_number(character, next, after) {
        return number(characters, at, text);
    }
    if starts_ident(character, next) {
        let name = ident(characters, at);
        if characters.get(*at) == Some(&'(') {
            *at += 1;
            let arguments = list(characters, at, text)?;
            if characters.get(*at) != Some(&')') {
                return Err(format!("`{text}` leaves `{name}(` unclosed"));
            }
            *at += 1;
            return Ok(Node::Function(name, arguments));
        }
        return Ok(Node::Ident(name));
    }
    *at += 1;
    match character {
        '(' => {
            let arguments = list(characters, at, text)?;
            if characters.get(*at) != Some(&')') {
                return Err(format!("`{text}` leaves a `(` unclosed"));
            }
            *at += 1;
            Ok(Node::Function(String::new(), arguments))
        }
        ',' => Ok(Node::Comma),
        '+' | '-' | '*' | '/' => Ok(Node::Operator(character)),
        '#' => Ok(Node::Hash(ident(characters, at))),
        '"' | '\'' => quoted(characters, at, character, text),
        other => Err(format!(
            "`{text}` holds `{other}`, which no token value is written with"
        )),
    }
}

/// Whether a number starts here: a digit, a `.` and a digit, or a sign before
/// either.
fn starts_number(character: char, next: Option<char>, after: Option<char>) -> bool {
    let digit = |one: Option<char>| one.is_some_and(|one| one.is_ascii_digit());
    match character {
        '0'..='9' => true,
        '.' => digit(next),
        '+' | '-' => digit(next) || (next == Some('.') && digit(after)),
        _ => false,
    }
}

/// Whether a name starts here: a letter, `_`, or a `-` before either or before
/// another `-`.
fn starts_ident(character: char, next: Option<char>) -> bool {
    let letter = |one: char| one.is_ascii_alphabetic() || one == '_';
    letter(character) || (character == '-' && next.is_some_and(|one| letter(one) || one == '-'))
}

fn ident(characters: &[char], at: &mut usize) -> String {
    let start = *at;
    while characters
        .get(*at)
        .is_some_and(|one| one.is_ascii_alphanumeric() || *one == '-' || *one == '_')
    {
        *at += 1;
    }
    characters[start..*at].iter().collect()
}

fn number(characters: &[char], at: &mut usize, text: &str) -> Result<Node, String> {
    let start = *at;
    if matches!(characters[*at], '+' | '-') {
        *at += 1;
    }
    while characters
        .get(*at)
        .is_some_and(|one| one.is_ascii_digit() || *one == '.')
    {
        *at += 1;
    }
    let digits: String = characters[start..*at].iter().collect();
    let value = digits
        .parse::<f64>()
        .map_err(|_| format!("`{text}` writes `{digits}`, which is not a number"))?;
    if characters.get(*at) == Some(&'%') {
        *at += 1;
        return Ok(Node::Percentage(value));
    }
    if characters.get(*at).is_some_and(char::is_ascii_alphabetic) {
        return Ok(Node::Dimension(value, ident(characters, at)));
    }
    Ok(Node::Number(value))
}

fn quoted(characters: &[char], at: &mut usize, quote: char, text: &str) -> Result<Node, String> {
    let start = *at;
    while let Some(&one) = characters.get(*at) {
        if one == quote {
            *at += 1;
            return Ok(Node::Quoted(characters[start..*at - 1].iter().collect()));
        }
        if one == '\\' {
            return Err(format!("`{text}` escapes a character in a string"));
        }
        *at += 1;
    }
    Err(format!("`{text}` leaves a string unclosed"))
}

/// Splits on commas at this level, dropping the whitespace around each part.
pub fn commas(nodes: &[Node]) -> Vec<Vec<Node>> {
    let mut parts = vec![Vec::new()];
    for node in nodes {
        if *node == Node::Comma {
            parts.push(Vec::new());
        } else if let Some(last) = parts.last_mut() {
            last.push(node.clone());
        }
    }
    for part in &mut parts {
        trim(part);
    }
    parts
}

/// Splits on whitespace at this level.
pub fn words(nodes: &[Node]) -> Vec<Node> {
    nodes
        .iter()
        .filter(|node| **node != Node::Space)
        .cloned()
        .collect()
}

/// A number as CSS writes it: the shortest text that reads back as the same
/// number, with no exponent.
pub fn number_text(value: f64) -> String {
    format!("{value}")
}

/// Component values written back out, for a sentence that quotes them.
pub fn source(nodes: &[Node]) -> String {
    nodes.iter().map(node_source).collect()
}

fn node_source(node: &Node) -> String {
    match node {
        Node::Comma => ", ".to_owned(),
        Node::Dimension(value, unit) => format!("{}{unit}", number_text(*value)),
        Node::Function(name, arguments) => format!("{name}({})", source(arguments)),
        Node::Hash(digits) => format!("#{digits}"),
        Node::Ident(name) => name.clone(),
        Node::Number(value) => number_text(*value),
        Node::Operator(operator) => operator.to_string(),
        Node::Percentage(value) => format!("{}%", number_text(*value)),
        Node::Quoted(text) => format!("\"{text}\""),
        Node::Space => " ".to_owned(),
    }
}
