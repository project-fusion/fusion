//! The attributes a node of the part tree may carry, by kind of node.
//!
//! **Closed, and defined once.** Every output reads these names: the web
//! element sets them, and the native runtime draws them. An attribute the
//! table does not name would compile and mean nothing on one platform or both,
//! so the reader refuses it. Adding one means adding a row to
//! [`attributes`], and an output that reads it.
//!
//! **A role is a closed set too**, since each one needs a native meaning:
//! a role a phone cannot announce has to be named in [`kinds::ROLES`] before
//! a source uses it, with what a phone announces for it. **So is the kind of
//! element a box is**, in [`kinds::ELEMENTS`], with the tag the web draws.
//!
//! **Attributes that read each other are held together** in [`node`]: a
//! shape and its geometry, a heading and its level, a range and its reading,
//! and, in [`layer`], a layer's placement and its anchor.

mod attributes;
pub mod kinds;
pub mod layer;
mod node;
mod shapes;
mod written;

pub use attributes::attribute;
pub use node::{node, tree};
