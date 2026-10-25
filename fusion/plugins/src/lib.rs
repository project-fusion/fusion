//! Running a rule somebody wrote outside this repository.
//!
//! **A host, and nothing about what a rule reads.** What a plugin is handed is
//! a string and what it hands back is a string, so this crate knows what a
//! module is, what version of the world it speaks and what a finding looks like,
//! and never what a component or a workspace is. `helix component check` is the
//! first verb to take plugins and `fusion x prose check` is the same shape over
//! different input: a type here that named a manifest would have to be widened
//! or copied on the day the second one arrives.
//!
//! **WASM rather than a linked crate or a binary on the path.** A plugin system
//! a user cannot extend without our build is a chokepoint, which eliminates
//! linking; a binary on the path is a release pipeline per platform and hands a
//! third party the whole machine, where reading a workspace is all the work
//! needs. A module is one artifact that runs everywhere, and it is sandboxed by
//! default, which is the property that matters when the thing being loaded is
//! somebody else's code pointed at somebody's own source.
//!
//! **The sandbox is a boundary rather than a claim, because the linker is
//! empty.** Nothing is imported into a plugin: no filesystem, no clock, no
//! network. A module that asks for one fails to instantiate and is refused by
//! name. What it may read is what the host passes in the payload, which is a
//! request to widen the world rather than an escape hatch nobody can audit.
//!
//! **A tool is the second world, in [`tools`].** It is lent three host
//! functions, each checked against a grant, and runs under fuel, a deadline,
//! and a memory cap, because a tool works on a model's behalf and a rule only
//! judges what it is handed.

//!
//! **The address guard is the third part, in [`net`].** A request the host
//! application makes for a plugin, such as a declarative speech engine's, reaches only
//! the public internet unless the grant names more, and the command line and
//! the desktop shell resolve through one guard. It is its own feature, so the
//! shell takes it without `wasmtime`.

#[cfg(feature = "net")]
pub mod net;
#[cfg(feature = "wasm")]
mod rules;
#[cfg(feature = "wasm")]
pub mod tools;

#[cfg(feature = "wasm")]
pub use rules::*;
