//! The derivations that compute a list, which a `repeat` draws a copy of
//! what it holds for each entry of.

/// Each derivation that returns a list, by its name, and the function in
/// core's derivations that computes it. **Closed, and defined once**, as
/// [`super::DERIVATIONS`] is: a list is read only by a repeat's `each`, and
/// a list derivation anywhere else is refused.
pub const LIST_DERIVATIONS: &[(&str, &str)] = &[
    ("breadcrumb-fold-items", "breadcrumbFoldItems"),
    ("kbd-key-list", "kbdKeyList"),
    ("pin-input-cells", "pinInputCells"),
];

/// Whether `function`, a function in core's derivations, returns a list.
pub fn is_list(function: &str) -> bool {
    LIST_DERIVATIONS
        .iter()
        .any(|(_, listed)| *listed == function)
}
