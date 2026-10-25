use super::*;

#[test]
fn writes_a_contract_with_its_shared_types_imported() {
    let announce = CAPABILITIES
        .iter()
        .find(|one| one.name == "announce")
        .unwrap();
    let written = contract(announce);
    assert!(
        written.contains("import type { Urgency } from '../types.generated.js'"),
        "{written}"
    );
    assert!(
        written.contains("export interface Announce {\n"),
        "{written}"
    );
    assert!(
        written.contains("  readonly say: (message: string, urgency: Urgency) => void\n"),
        "{written}"
    );
}

#[test]
fn a_contract_that_takes_parts_is_generic_over_them() {
    let measure = CAPABILITIES
        .iter()
        .find(|one| one.name == "measure")
        .unwrap();
    let written = contract(measure);
    assert!(
        written.contains("export interface Measure<N> {"),
        "{written}"
    );
    assert!(
        written.contains("  readonly observe: (node: N, changed: (box: Rect) => void) => Stop\n"),
        "{written}"
    );
}

#[test]
fn every_named_type_is_written_once() {
    let shared = types_module();
    let mut named = Vec::new();
    for capability in CAPABILITIES {
        for member in capability.members {
            member.returns.named(&mut named);
            for param in member.params {
                param.ty.named(&mut named);
            }
        }
    }
    named.sort_unstable();
    named.dedup();
    for name in named {
        assert_eq!(
            shared.matches(&format!("export type {name} ")).count(),
            1,
            "`{name}` in {shared}"
        );
    }
}

#[test]
fn names_are_unique_and_sorted() {
    let names: Vec<&str> = CAPABILITIES.iter().map(|one| one.name).collect();
    let mut sorted = names.clone();
    sorted.sort_unstable();
    sorted.dedup();
    assert_eq!(names, sorted);
}

#[test]
fn comments_wrap_within_eighty_columns() {
    for capability in CAPABILITIES {
        for line in contract(capability).lines() {
            assert!(
                line.len() <= 80 || !line.trim_start().starts_with('*'),
                "{line}"
            );
        }
    }
}

#[test]
fn the_timers_read_the_time_of_day_beside_the_clock() {
    let timers = CAPABILITIES
        .iter()
        .find(|one| one.name == "timers")
        .unwrap();
    let written = contract(timers);
    assert!(
        written.contains("  readonly wall: () => number\n"),
        "{written}"
    );
}

#[test]
fn the_scroll_scrolls_to_an_offset_and_tells_where_a_part_stands() {
    let scroll = CAPABILITIES
        .iter()
        .find(|one| one.name == "scroll")
        .unwrap();
    let written = contract(scroll);
    assert!(
        written
            .contains("  readonly to: (node: N, x: number, y: number, smooth: boolean) => void\n"),
        "{written}"
    );
    assert!(
        written.contains(
            "  readonly observe: (node: N, changed: (scrolled: Scrolled) => void) => Stop\n"
        ),
        "{written}"
    );
    let types = types_module();
    assert!(
        types.contains("export type Ends = { end: boolean, start: boolean, };"),
        "{types}"
    );
}

#[test]
fn the_conditions_carry_the_window_its_safe_area_and_the_screen_reader() {
    let written = types_module();
    assert!(written.contains("insets: Insets"), "{written}");
    assert!(written.contains("screenReader: boolean"), "{written}");
    assert!(written.contains("window: Size"), "{written}");
    assert!(
        written.contains(
            "export type Insets = { bottom: number, left: number, right: number, top: number, };"
        ),
        "{written}"
    );
}

#[test]
fn the_clipboard_gives_whether_it_wrote() {
    let clipboard = CAPABILITIES
        .iter()
        .find(|one| one.name == "clipboard")
        .unwrap();
    let written = contract(clipboard);
    assert!(
        written.contains("export interface Clipboard {\n"),
        "{written}"
    );
    assert!(
        written.contains("  readonly write: (text: string) => Promise<boolean>\n"),
        "{written}"
    );
}
