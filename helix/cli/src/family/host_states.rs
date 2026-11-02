//! The keys a runtime's machines write under `host: { states: { … } }`.
//!
//! **A machine's host state is keyed by the name the intermediate form says**,
//! which is hyphenated, `check-mark`. A rule reads that name, so a key in
//! camelCase, `checkMark`, is a state no rule hears, and the part draws nothing
//! with no error at any step. [`faults`] reads a machine's source for such keys.
//! The interactions a rule reads under their own names, as `focusVisible`, are
//! the exception, and a computed key is the source's own binding.

/// The states a rule reads in camelCase, as the interactions it names.
const INTERACTIONS: &[&str] = &["focusVisible", "focusWithin", "formDisabled"];

/// Each camelCase key `source` writes under a part named `host`, as `line N: key`.
#[must_use]
pub fn faults(source: &str) -> Vec<String> {
    let mut found = Vec::new();
    let mut from = 0;
    while let Some(at) = source[from..].find("host:") {
        let start = from + at + "host:".len();
        from = start;
        if let Some(block) = states_block(&source[start..]) {
            for (key, offset) in keys(block.1) {
                if key.chars().any(char::is_uppercase) && !INTERACTIONS.contains(&key.as_str()) {
                    let line = source[..start + block.0 + offset].matches('\n').count() + 1;
                    found.push(format!(
                        "line {line}: the host state `{key}` is in camelCase, which no rule reads. \
                         Key it by its hyphenated name."
                    ));
                }
            }
        }
    }
    found
}

/// Where `{ states: { … } }` opens `text`, and what its inner braces hold.
fn states_block(text: &str) -> Option<(usize, &str)> {
    let rest = text.trim_start().strip_prefix('{')?;
    let rest = rest.trim_start().strip_prefix("states:")?;
    let rest = rest.trim_start().strip_prefix('{')?;
    let open = text.len() - rest.len();
    let mut depth = 1;
    for (at, letter) in rest.char_indices() {
        match letter {
            '{' | '[' | '(' => depth += 1,
            '}' | ']' | ')' => {
                depth -= 1;
                if depth == 0 {
                    return Some((open, &rest[..at]));
                }
            }
            _ => {}
        }
    }
    None
}

/// The keys of an object's body at its own depth, each with where it stands.
/// A computed key has no name to read, and a value is skipped.
fn keys(body: &str) -> Vec<(String, usize)> {
    let mut found = Vec::new();
    let mut depth = 0;
    let mut at_key = true;
    for (at, letter) in body.char_indices() {
        match letter {
            '{' | '[' | '(' => depth += 1,
            '}' | ']' | ')' => depth -= 1,
            ',' if depth == 0 => at_key = true,
            _ if depth == 0 && at_key && !letter.is_whitespace() => {
                at_key = false;
                let word: String = body[at..]
                    .chars()
                    .take_while(|one| {
                        one.is_alphanumeric() || *one == '_' || *one == '-' || *one == '\''
                    })
                    .collect();
                found.push((word.trim_matches('\'').to_owned(), at));
            }
            _ => {}
        }
    }
    found
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_a_camel_case_key() {
        let source = "x\nreturn { parts: { host: { states: { checkMark: on } } } }";
        let found = faults(source);
        assert_eq!(found.len(), 1, "{found:?}");
        assert!(found[0].starts_with("line 2: the host state `checkMark`"));
    }

    #[test]
    fn refuses_a_shorthand_key_past_another() {
        let found = faults("host: { states: { 'check-mark': a, dropAfter } }");
        assert_eq!(found.len(), 1, "{found:?}");
    }

    #[test]
    fn takes_hyphens_computed_keys_and_interactions() {
        let source = "host: { states: { 'check-mark': a, [state]: b, focusVisible, selected: c } }";
        assert_eq!(faults(source), Vec::<String>::new());
    }

    #[test]
    fn leaves_a_value_and_another_part_alone() {
        let source =
            "host: { states: { open: isOpen({ fooBar: 1 }) } }, list: { states: { fooBar: 1 } }";
        assert_eq!(faults(source), Vec::<String>::new());
    }

    #[test]
    fn leaves_a_host_with_no_states_alone() {
        assert_eq!(
            faults("host: { view: { fooBar: 1 } }"),
            Vec::<String>::new()
        );
    }
}
