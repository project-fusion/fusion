//! Two answers, compared word by word.

use serde::Serialize;

/// A run of words both answers share, or one answer alone holds.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "op", content = "text", rename_all = "snake_case")]
pub enum Change {
    Same(String),
    Removed(String),
    Added(String),
}

/// The changes that turn `before` into `after`, by the longest run of words
/// they share.
pub fn words(before: &str, after: &str) -> Vec<Change> {
    let old: Vec<&str> = before.split_whitespace().collect();
    let new: Vec<&str> = after.split_whitespace().collect();
    // `common[i][j]` is the longest run shared by `old[i..]` and `new[j..]`.
    let mut common = vec![vec![0_usize; new.len() + 1]; old.len() + 1];
    for i in (0..old.len()).rev() {
        for j in (0..new.len()).rev() {
            common[i][j] = if old[i] == new[j] {
                common[i + 1][j + 1] + 1
            } else {
                common[i + 1][j].max(common[i][j + 1])
            };
        }
    }
    let mut changes: Vec<Change> = Vec::new();
    let mut push = |change: Change| {
        let joined = match (changes.last_mut(), &change) {
            (Some(Change::Same(run)), Change::Same(word))
            | (Some(Change::Removed(run)), Change::Removed(word))
            | (Some(Change::Added(run)), Change::Added(word)) => {
                run.push(' ');
                run.push_str(word);
                true
            }
            _ => false,
        };
        if !joined {
            changes.push(change);
        }
    };
    let (mut i, mut j) = (0, 0);
    while i < old.len() || j < new.len() {
        if i < old.len() && j < new.len() && old[i] == new[j] {
            push(Change::Same(old[i].to_owned()));
            i += 1;
            j += 1;
        } else if i < old.len() && (j == new.len() || common[i + 1][j] >= common[i][j + 1]) {
            push(Change::Removed(old[i].to_owned()));
            i += 1;
        } else {
            push(Change::Added(new[j].to_owned()));
            j += 1;
        }
    }
    changes
}

/// The changes as one line: removed words in `[-…-]`, added in `{+…+}`.
pub fn line(changes: &[Change]) -> String {
    changes
        .iter()
        .map(|change| match change {
            Change::Same(text) => text.clone(),
            Change::Removed(text) => format!("[-{text}-]"),
            Change::Added(text) => format!("{{+{text}+}}"),
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_changed_word_is_removed_and_added() {
        let changes = words(
            "Sam reviews the migration.",
            "Sam reviews the schema migration first.",
        );
        assert_eq!(
            line(&changes),
            "Sam reviews the [-migration.-] {+schema migration first.+}"
        );
        assert_eq!(line(&words("same", "same")), "same");
        assert_eq!(words("", "new"), [Change::Added("new".into())]);
    }
}
