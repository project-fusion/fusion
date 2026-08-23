//! Helix theme derivation.
//!
//! **The crate is the implementation and `@helix-io/theme` becomes a wrapper
//! over it**, which is what 142 decided and why this is a move rather than a
//! second engine. A Rust derivation *beside* the TypeScript one is wrong on day
//! one rather than eventually: both searches here are bisections, so iteration
//! count and float arithmetic are the answer rather than an implementation
//! detail, and two implementations disagree by construction.
//!
//! The port lands one module at a time and the TypeScript stays alive as the
//! oracle while it does. `oracle.json` is generated from the TypeScript engine
//! by the bless and asserted here byte for byte, so a regression is measured
//! on every `cargo test` rather than assumed from a reading of both files. The
//! TypeScript goes when the crate answers for all of it.
pub mod css;
pub mod derive;
pub mod intent;
pub mod model;
pub mod oklch;

#[cfg(feature = "serde")]
mod wire;

#[cfg(any(feature = "wasm", test))]
mod shape;

#[cfg(feature = "wasm")]
mod wasm;

#[cfg(test)]
mod bless;

#[cfg(test)]
mod oracle;
