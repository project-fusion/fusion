//! The audit screen, held identical to `helix`'s.
//!
//! **Two copies of one file, and a test that says so.** The screen is written
//! out in both crates rather than shared, for the reason `helix`'s
//! `component/mod.rs` gives: a crate holding it would tie the two release
//! trains together. What that decision cannot be allowed to cost is a quiet
//! divergence, where a key binding or a column changes in one and a reader who
//! learned one screen no longer knows the other. So the two files are compared
//! here, modulo exactly what is allowed to differ: the docblock, the import of
//! `Rule` and `Report`, and the product's name in the corner.
//!
//! Read off the tree rather than compiled in, because a source file is what
//! drifts; a test in this crate rather than a workspace rule because this crate
//! is the one with two things to compare and no product to answer to.

use std::path::Path;

/// One screen with everything allowed to differ taken out.
fn body(source: &str) -> String {
    source
        .lines()
        .filter(|line| !line.starts_with("//!"))
        .filter(|line| !line.starts_with("const PRODUCT: &str = "))
        .map(|line| line.replace("use crate::component::", "use crate::rules::"))
        .collect::<Vec<String>>()
        .join("\n")
}

#[test]
fn the_two_audit_screens_are_one_file() {
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let ours = std::fs::read_to_string(here.join("src/tui.rs")).expect("this crate's screen");
    let theirs = std::fs::read_to_string(here.join("../../helix/cli/src/component/tui.rs"))
        .expect("helix's screen");

    let (ours, theirs) = (body(&ours), body(&theirs));
    if ours != theirs {
        let first = ours
            .lines()
            .zip(theirs.lines())
            .position(|(one, two)| one != two)
            .map_or_else(|| "the lengths".to_owned(), |at| format!("line {}", at + 1));
        panic!(
            "fusion/cli/src/tui.rs and helix/cli/src/component/tui.rs differ at {first} of \
             their bodies. They are one screen written twice, and a change to one is a change \
             to both: copy it across, or say in each docblock why the two now differ."
        );
    }
}
