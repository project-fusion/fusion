//! A member one element writes on another stays off the public surface.
//!
//! **A parent's bookkeeping on its children is not API.** Toolbar moves its
//! tab stop through each control's `focusable`, Listbox marks the option the
//! keys are on with `active`, and a playlist tells an entry it is `current`.
//! Published, each of those prints a row on the reference page, reaches the
//! framework typings, and invites a consumer to write a value the parent
//! overwrites on its next update. Twenty-three such members were public on
//! October 25, 2026, on top of the group settings already marked `@internal`.
//!
//! **What the rule reads is the sentence that says so.** A property with no
//! attribute whose doc block says a parent writes it, `Written by the list`
//! or `coordination between elements`, carries `@internal`. A member that is
//! written by a parent and also mirrors state a page reads, such as a list
//! row's `selected`, stays public and says why in a sentence beginning
//! `Public because`, which is the phrase the library already uses for a public
//! member that needs a reason.

use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::component::text::line_of;
use crate::component::{sources, Context, Finding, Report};

/// A doc block, the decorators under it, and the member they declare.
static MEMBER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?s)  /\*\*((?:[^*]|\*[^/])*)\*/\n((?:  @\w+\([^\n]*\)\n)+)  (?:override )?(?:declare )?(?:readonly )?(\w+)\b",
    )
    .expect("a literal pattern compiles")
});

/// A sentence saying another element writes the member.
static WRITTEN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?i)\bwritten by (?:the |a |its )?(?:root|parent|list|group|set|playlist|tree|tabs|toolbar|listbox|menu|accordion|carousel|tour|lightbox|table|feed|field|frame|control|component|owner)\b|coordination\s+between\s+elements|set by the component that owns|\ba parent sets\b|\bthe parent (?:sets|writes|updates)\b",
    )
    .expect("a literal pattern compiles")
});

/// The reason a written member stays public.
static PUBLIC: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"Public\s+because").expect("a literal pattern compiles"));

/// What one module publishes that a parent writes, as findings.
pub fn judge(code: &str, file: &str) -> (usize, Vec<Finding>) {
    let mut checked = 0;
    let mut findings = Vec::new();
    for found in MEMBER.captures_iter(code) {
        let doc = &found[1];
        let decorators = &found[2];
        if !decorators.contains("@property(") || !decorators.contains("attribute: false") {
            continue;
        }
        checked += 1;
        if doc.contains("@internal") || PUBLIC.is_match(doc) || !WRITTEN.is_match(doc) {
            continue;
        }
        let at = found.get(3).map_or(0, |one| one.start());
        findings.push(Finding {
            detail: "Begin its doc block with `@internal`, so it leaves the manifest, the typings \
                     and the declaration files. Where a page reads it as well, say why in a \
                     sentence beginning `Public because`."
                .to_owned(),
            file: format!("{file}:{}", line_of(code, at)),
            message: format!(
                "`{}` is written by another element and is public",
                &found[3]
            ),
        });
    }
    (checked, findings)
}

pub fn run(context: &Context) -> Report {
    let mut checked = 0;
    let mut findings = Vec::new();
    for tier in context.settings.roots(&context.root) {
        let mut files = Vec::new();
        sources(&tier, &mut files);
        for file in files {
            let Ok(text) = fs::read_to_string(&file) else {
                continue;
            };
            let (counted, found) = judge(&text, &context.relative(&file));
            checked += counted;
            findings.extend(found);
        }
    }
    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit: "properties with no attribute",
    }
}

#[cfg(test)]
mod tests {
    use super::judge;

    fn member(doc: &str) -> String {
        format!("export class Item {{\n  /**\n   * {doc}\n   */\n  @property({{ attribute: false }})\n  focusable = true\n}}\n")
    }

    fn messages(code: &str) -> Vec<String> {
        judge(code, "item.ts")
            .1
            .into_iter()
            .map(|one| one.message)
            .collect()
    }

    #[test]
    fn a_member_a_parent_writes_is_internal() {
        assert_eq!(
            messages(&member(
                "Whether it holds the tab stop. No attribute: it is coordination between elements."
            )),
            ["`focusable` is written by another element and is public"]
        );
        assert!(messages(&member(
            "@internal Whether it holds the tab stop. Written by the toolbar."
        ))
        .is_empty());
    }

    /// A row's `selected` is written by its list and is the row's state too.
    #[test]
    fn a_written_member_a_page_reads_says_why_it_is_public() {
        assert!(messages(&member(
            "Whether the row is selected. Written by the list. Public because a page reads it."
        ))
        .is_empty());
    }

    #[test]
    fn a_member_with_an_attribute_or_no_such_sentence_is_left_alone() {
        assert!(messages(&member("Whether it is open.")).is_empty());
        let attributed = "export class Item {\n  /**\n   * Written by the list.\n   */\n  @property({ type: Boolean })\n  current = false\n}\n";
        assert!(messages(attributed).is_empty());
    }
}
