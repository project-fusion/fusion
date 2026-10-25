//! A stylesheet as the web build ships it, ported from
//! `fusion/scripts/build-styles.mjs`, `join-lines.mjs` and `tighten.mjs`.

/// A stylesheet as `build-styles` ships it: no comments, no indentation, the
/// lines joined, and the newlines a function's arguments were laid out on gone.
pub fn shipped(css: &str) -> String {
    let stripped = strip_comments(css);
    let lines: Vec<&str> = stripped
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect();
    tighten(&join_lines(&lines))
}

/// `stripComments` from `build-styles.mjs`: a quoted string is copied as it
/// stands, and a `/*!` comment survives.
fn strip_comments(css: &str) -> String {
    let characters: Vec<char> = css.chars().collect();
    let mut out = String::new();
    let mut index = 0;
    while index < characters.len() {
        let character = characters[index];
        if character == '"' || character == '\'' {
            out.push(character);
            index += 1;
            while index < characters.len() {
                if characters[index] == '\\' {
                    out.extend(characters[index..(index + 2).min(characters.len())].iter());
                    index += 2;
                    continue;
                }
                out.push(characters[index]);
                index += 1;
                if characters[index - 1] == character {
                    break;
                }
            }
            continue;
        }
        if character == '/' && characters.get(index + 1) == Some(&'*') {
            let keep = characters.get(index + 2) == Some(&'!');
            let mut stop = characters.len();
            let mut probe = index + 2;
            while probe + 1 < characters.len() {
                if characters[probe] == '*' && characters[probe + 1] == '/' {
                    stop = probe + 2;
                    break;
                }
                probe += 1;
            }
            if keep {
                out.extend(characters[index..stop].iter());
            }
            index = stop;
            continue;
        }
        out.push(character);
        index += 1;
    }
    out
}

/// `joinLines` from `join-lines.mjs`.
fn join_lines(lines: &[&str]) -> String {
    let mut out = String::new();
    for line in lines {
        let last = out.chars().last();
        if out.is_empty() || matches!(last, Some('{' | '}' | ';')) || line.starts_with('}') {
            out.push_str(line);
        } else {
            out.push('\n');
            out.push_str(line);
        }
    }
    out
}

/// `tighten` from `tighten.mjs`: outside quoted strings, the newlines after `(`
/// and before `)` go, the last `;` in a block goes, and every other newline
/// becomes a space.
fn tighten(css: &str) -> String {
    let mut out = String::new();
    let mut plain = String::new();
    let mut characters = css.chars().peekable();
    while let Some(character) = characters.next() {
        if character == '"' || character == '\'' {
            out.push_str(&tighten_plain(&plain));
            plain.clear();
            let mut quoted = String::from(character);
            while let Some(next) = characters.next() {
                if next == '\n' {
                    /* An unterminated string on one line is not a string to the
                    pattern in `tighten.mjs`, so it ends here as plain text. */
                    plain.push_str(&quoted);
                    plain.push(next);
                    quoted.clear();
                    break;
                }
                quoted.push(next);
                if next == '\\' {
                    if let Some(escaped) = characters.next() {
                        quoted.push(escaped);
                    }
                    continue;
                }
                if next == character {
                    break;
                }
            }
            out.push_str(&quoted);
            continue;
        }
        plain.push(character);
    }
    out.push_str(&tighten_plain(&plain));
    out
}

fn tighten_plain(text: &str) -> String {
    let text = text.replace("(\n", "(").replace("\n)", ")");
    let mut out = String::with_capacity(text.len());
    let characters: Vec<char> = text.chars().collect();
    let mut index = 0;
    while index < characters.len() {
        if characters[index] == ';' {
            let mut probe = index + 1;
            while probe < characters.len() && characters[probe].is_whitespace() {
                probe += 1;
            }
            if characters.get(probe) == Some(&'}') {
                index = probe;
                continue;
            }
        }
        out.push(characters[index]);
        index += 1;
    }
    out.replace('\n', " ")
}
