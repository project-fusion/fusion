use super::*;
use crate::family::css::{emit, shipped};
use crate::family::ir::{styled, Family};
use crate::family::read::default_export;

/// A loader that knows the fragments given, by name.
fn loader<'a>(fragments: &'a [(&'a str, &'a str)]) -> impl FnMut(&str) -> Result<Lit, String> + 'a {
    move |name| {
        fragments
            .iter()
            .find(|(known, _)| *known == name)
            .ok_or_else(|| "no such module".to_owned())
            .and_then(|(_, source)| default_export(source))
    }
}

const PRINT: &str = "export default fragment('print-economy', { rules: [{ on: 'host', set: [['print-color-adjust', web('economy')]], when: { print: true } }] })";
const HIDDEN: &str = "export default fragment('visually-hidden', { set: [['block-size', '1px'], ['clip-path', web('inset(50%)')]] })";

fn compiled(table: &str, fragments: &[(&str, &str)]) -> Result<String, String> {
    let export = expand(&default_export(table)?, &mut loader(fragments))?;
    Ok(shipped(&emit(&Family::new(
        styled(&export)?,
        None,
        "b",
        "root",
    ))))
}

#[test]
fn reads_a_fragments_rules_and_declarations_where_they_are_taken_in() {
    assert_eq!(
        compiled(
            "export default family('b', { rules: [{ on: 'label', set: [['color', 'red'], include('visually-hidden')] }, include('print-economy')] })",
            &[("print-economy", PRINT), ("visually-hidden", HIDDEN)],
        )
        .unwrap(),
        ":host [part=\"label\"] {color: red;block-size: 1px;clip-path: inset(50%)}@media print {:host {print-color-adjust: economy}}"
    );
}

#[test]
fn refuses_a_fragment_taken_in_as_the_wrong_kind_or_named_for_another() {
    let fragments = [("print-economy", PRINT), ("visually-hidden", HIDDEN)];
    assert!(compiled(
        "export default family('b', { rules: [include('visually-hidden')] })",
        &fragments
    )
    .unwrap_err()
    .contains("is declarations"));
    assert!(compiled(
        "export default family('b', { rules: [{ on: 'host', set: [include('print-economy')] }] })",
        &fragments
    )
    .unwrap_err()
    .contains("is rules"));
    assert!(compiled(
        "export default family('b', { rules: [include('print')] })",
        &[("print", PRINT)]
    )
    .unwrap_err()
    .contains("exports the fragment `print-economy`"));
    assert!(compiled(
        "export default family('b', { rules: [include('../x')] })",
        &fragments
    )
    .unwrap_err()
    .contains("lowercase words"));
}

#[test]
fn takes_declarations_into_a_fragment_of_rules_and_nothing_deeper() {
    let field = "export default fragment('field', { rules: [{ on: 'label', set: [include('visually-hidden')], when: { part: { 'data-hidden': true } } }] })";
    let fragments = [("field", field), ("visually-hidden", HIDDEN)];
    assert_eq!(
        compiled(
            "export default family('b', { rules: [include('field')] })",
            &fragments
        )
        .unwrap(),
        ":host [part=\"label\"]:where([data-hidden]) {block-size: 1px;clip-path: inset(50%)}"
    );
    assert!(alone("field", &mut loader(&fragments)).is_ok());
    let nested = "export default fragment('nested', { rules: [include('print-economy')] })";
    assert!(compiled(
        "export default family('b', { rules: [include('nested')] })",
        &[("nested", nested), ("print-economy", PRINT)]
    )
    .unwrap_err()
    .contains("takes in rules"));
    let deeper = "export default fragment('deeper', { set: [include('visually-hidden')] })";
    assert!(compiled(
        "export default family('b', { rules: [{ on: 'host', set: [include('deeper')] }] })",
        &[("deeper", deeper), ("visually-hidden", HIDDEN)]
    )
    .unwrap_err()
    .contains("takes in another"));
}
