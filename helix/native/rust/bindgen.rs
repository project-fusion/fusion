//! `UniFFI`'s bindings generator, built from the version this crate links, so the
//! Swift and the Kotlin it writes call the library it is run against.
//! `scripts/engine.mjs` runs it.

fn main() {
    uniffi::uniffi_bindgen_main();
}
