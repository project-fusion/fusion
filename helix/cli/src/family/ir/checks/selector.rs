//! A written-out selector, located where it can be and ranked as a browser
//! ranks it, so the overlap check can judge a pair it holds.

use super::{meets, place, Drawn, Node, Place};
use crate::family::ir::Rule;

/// Why two rules, one or both with a written-out selector, may compete, or
/// `None` where every selector in them is located and none ties with the
/// other rule on one node.
pub fn judged(first: &Rule, second: &Rule, drawn: &[Drawn]) -> Option<String> {
    let each = |rule: &Rule| -> Vec<(Option<Place>, [u32; 3])> {
        match &rule.selector {
            Some(selector) => split(selector, ',')
                .into_iter()
                .map(|one| (locate(one), specificity(one)))
                .collect(),
            None => vec![(place(rule), rule.specificity)],
        }
    };
    for (one, rank) in each(first) {
        for (other, other_rank) in each(second) {
            match (&one, &other) {
                (Some(a), Some(b)) if rank == other_rank && meets(a, b, first, second, drawn) => {
                    return Some(
                        "a written-out selector, located on one node at the same specificity, so the drawing follows where the groups stand"
                            .to_owned(),
                    );
                }
                (Some(_), Some(_)) => {}
                _ => {
                    return Some(
                        "a written-out selector that cannot be located, so nothing proves they never meet".to_owned(),
                    )
                }
            }
        }
    }
    None
}

/// The node a selector's last compound is on: a `[part]`, a `slot`, the
/// children `::slotted()` names, or the host, with a pseudo-element after.
fn locate(selector: &str) -> Option<Place> {
    let last = split(selector.trim(), ' ')
        .into_iter()
        .flat_map(|word| split(word, '>'))
        .flat_map(|word| split(word, '~'))
        .flat_map(|word| split(word, '+'))
        .rfind(|word| !word.trim().is_empty())?
        .trim();
    let inner = ["::before", "::after", "::backdrop"]
        .into_iter()
        .find(|pseudo| last.contains(pseudo))
        .map(str::to_owned);
    if let Some(start) = last.find("::slotted(") {
        let argument = &last[start + "::slotted(".len()..];
        let tag: String = argument
            .chars()
            .take_while(|character| {
                character.is_ascii_alphanumeric() || *character == '-' || *character == '*'
            })
            .collect();
        let region = attribute(&last[..start], "slot", "name").unwrap_or_else(|| "*".to_owned());
        let tag = if tag.is_empty() { "*".to_owned() } else { tag };
        return Some(Place {
            inner,
            node: Node::Slotted(region, tag),
        });
    }
    if let Some(part) = attribute(last, "", "part") {
        let exact = !last.contains("[part~=");
        return Some(Place {
            inner,
            node: Node::Part(part, exact),
        });
    }
    if last.starts_with("slot") {
        let region = attribute(last, "slot", "name").unwrap_or_else(|| "default".to_owned());
        return Some(Place {
            inner,
            node: Node::Slot(region),
        });
    }
    if last.starts_with(":host") && !last.contains("::") {
        return Some(Place {
            inner,
            node: Node::Host,
        });
    }
    None
}

/// The value of `[name="value"]` or `[name~="value"]` in a compound that
/// starts with `tag`, where `tag` is empty or the compound's own.
fn attribute(compound: &str, tag: &str, name: &str) -> Option<String> {
    if !compound.starts_with(tag) {
        return None;
    }
    let open = [format!("[{name}=\""), format!("[{name}~=\"")]
        .into_iter()
        .find_map(|open| compound.find(&open).map(|at| at + open.len()))?;
    let rest = &compound[open..];
    rest.find('"').map(|close| rest[..close].to_owned())
}

/// `text` split at `separator` where it stands outside brackets and quotes.
fn split(text: &str, separator: char) -> Vec<&str> {
    let mut parts = Vec::new();
    let (mut depth, mut quoted, mut start) = (0_i32, false, 0);
    for (at, character) in text.char_indices() {
        match character {
            '"' => quoted = !quoted,
            '(' | '[' if !quoted => depth += 1,
            ')' | ']' if !quoted => depth -= 1,
            _ if character == separator && depth == 0 && !quoted => {
                parts.push(&text[start..at]);
                start = at + character.len_utf8();
            }
            _ => {}
        }
    }
    parts.push(&text[start..]);
    parts
}

/// `[ids, classes, types]` of one selector, as a browser counts it: `:is()`,
/// `:not()` and `:has()` as their most specific argument, `:where()` as
/// nothing, `:host()` and `::slotted()` as themselves and their argument.
pub fn specificity(selector: &str) -> [u32; 3] {
    let characters: Vec<char> = selector.chars().collect();
    let mut count = [0_u32; 3];
    let mut at = 0;
    let word = |from: usize| -> usize {
        let mut end = from;
        while end < characters.len()
            && (characters[end].is_ascii_alphanumeric()
                || characters[end] == '-'
                || characters[end] == '_')
        {
            end += 1;
        }
        end
    };
    let argument = |from: usize| argument(&characters, from);
    let most = |argument: &str| -> [u32; 3] {
        split(argument, ',')
            .into_iter()
            .map(specificity)
            .max()
            .unwrap_or([0, 0, 0])
    };
    let add = |count: &mut [u32; 3], other: [u32; 3]| {
        for (one, more) in count.iter_mut().zip(other) {
            *one += more;
        }
    };
    while at < characters.len() {
        match characters[at] {
            '#' => {
                count[0] += 1;
                at = word(at + 1);
            }
            '.' => {
                count[1] += 1;
                at = word(at + 1);
            }
            '[' => {
                count[1] += 1;
                at = characters[at..]
                    .iter()
                    .position(|character| *character == ']')
                    .map_or(characters.len(), |end| at + end + 1);
            }
            ':' if characters.get(at + 1) == Some(&':') => {
                let end = word(at + 2);
                let name: String = characters[at + 2..end].iter().collect();
                let (inside, next) = argument(end);
                count[2] += 1;
                if name == "slotted" || name == "part" {
                    add(&mut count, most(&inside));
                }
                at = next;
            }
            ':' => {
                let end = word(at + 1);
                let name: String = characters[at + 1..end].iter().collect();
                let (inside, next) = argument(end);
                match name.as_str() {
                    "is" | "not" | "has" => add(&mut count, most(&inside)),
                    "where" => {}
                    "host" | "host-context" => {
                        count[1] += 1;
                        add(&mut count, most(&inside));
                    }
                    _ => count[1] += 1,
                }
                at = next;
            }
            character if character.is_ascii_alphabetic() => {
                count[2] += 1;
                at = word(at);
            }
            _ => at += 1,
        }
    }
    count
}

/// The parenthesized argument at `from`, and where it ends.
fn argument(characters: &[char], from: usize) -> (String, usize) {
    if characters.get(from) != Some(&'(') {
        return (String::new(), from);
    }
    let mut depth = 0;
    let mut end = from;
    while end < characters.len() {
        match characters[end] {
            '(' => depth += 1,
            ')' => {
                depth -= 1;
                if depth == 0 {
                    break;
                }
            }
            _ => {}
        }
        end += 1;
    }
    (
        characters[from + 1..end.min(characters.len())]
            .iter()
            .collect(),
        end + 1,
    )
}
