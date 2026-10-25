//! Running code somebody wrote outside the product that runs it.
//!
//! **A loader, and nothing about any world.** [`Loader`] reads a WebAssembly
//! component, pins it by its digest, and starts it in a fresh store under its
//! [`Limits`]. What a component exports and what it is lent belong to the
//! world it is built against, and each world is a crate of its own:
//! `fusion-plugin-rules` judges a payload, `fusion-plugin-tools` offers tools
//! to a model, and `fusion-plugin-sources` and `fusion-plugin-tracker` speak
//! the Agent Work Protocol. A world added later takes this crate and changes
//! nothing in it.
//!
//! **WASM rather than a linked crate or a binary on the path.** A plugin system
//! a user cannot extend without our build is a chokepoint, which eliminates
//! linking; a binary on the path is a release pipeline per platform and hands a
//! third party the whole machine, where reading a workspace is all the work
//! needs. A component is one artifact that runs everywhere, and it is sandboxed
//! by default, which is the property that matters when the thing being loaded
//! is somebody else's code pointed at somebody's own source.
//!
//! **The sandbox is a boundary rather than a claim, because the linker holds
//! only what a world lends.** A component asking for anything else fails to
//! start and is refused by name.
//!
//! **What a product decides stays the product's.** The publishers a host
//! keeps for its own plugins are [`Publishers`], a setting each product passes
//! in, as the name a model is offered a tool by is in the tools world.
//!
//! **The address guard is the other part, in [`net`].** A request the host
//! application makes for a plugin reaches only the public internet unless the
//! grant names more. It is its own feature, so a desktop shell takes it
//! without `wasmtime`.

#[cfg(feature = "loader")]
mod loader;
#[cfg(feature = "net")]
pub mod net;
mod publishers;

#[cfg(feature = "loader")]
pub use loader::*;
pub use publishers::Publishers;
/// The runtime every world's bindings are generated against, so an embedder
/// and the world crates name one version of it.
#[cfg(feature = "loader")]
pub use wasmtime;
