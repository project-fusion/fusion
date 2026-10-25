//! The capability contracts: each platform service a machine's host calls,
//! defined once here, and the TypeScript interfaces core's implementations
//! are held to.
//!
//! **Layer 3 of the intermediate layer spec.** A capability is a service such
//! as moving focus or saying a message, which every platform provides its own
//! way. A machine's host module calls it through its contract, so a machine
//! runs unchanged on the web, on the server, under a test's fake, and in the
//! native adapter. The contracts are data here so the compiler can check what
//! a family's machines call, and a later port reads the same definitions.
//!
//! A contract that takes a part is generic over the platform's handle for one,
//! `N`: an element on the web and a host instance in React Native.

mod contracts;
mod emit;
#[cfg(test)]
mod tests;
pub mod types;

pub use contracts::CAPABILITIES;
pub use emit::{contract, types_module};

/// One capability's contract.
pub struct Capability {
    /// Its folder in core and the name its setter carries, in kebab case.
    pub name: &'static str,
    /// The interface's name.
    pub interface: &'static str,
    pub doc: &'static str,
    pub members: &'static [Member],
}

/// One function of a contract.
pub struct Member {
    pub name: &'static str,
    pub doc: &'static str,
    pub params: &'static [Param],
    pub returns: Ty,
}

/// One parameter of a function, or of a callback a function takes.
pub struct Param {
    pub name: &'static str,
    pub ty: Ty,
}

/// A type a contract uses.
#[derive(Clone, Copy)]
pub enum Ty {
    Boolean,
    /// A function the platform calls: its parameters and what it returns.
    Callback(&'static [Param], &'static Ty),
    /// A list, which the receiver reads and never changes.
    List(&'static Ty),
    /// The type or `null`.
    Maybe(&'static Ty),
    /// What a function gives once the platform has done it, as a write to
    /// the clipboard gives whether it wrote.
    Promise(&'static Ty),
    /// A type [`types`] defines, by its name.
    Named(&'static str),
    /// The platform's handle for a part.
    Node,
    Number,
    /// What stops something a function started.
    Stop,
    Text,
    Void,
}

impl Capability {
    /// Whether any member takes or gives a part.
    pub fn takes_nodes(&self) -> bool {
        self.members.iter().any(|member| {
            member.returns.has_node() || member.params.iter().any(|param| param.ty.has_node())
        })
    }
}

impl Ty {
    fn has_node(self) -> bool {
        match self {
            Self::Node => true,
            Self::Callback(params, returns) => {
                returns.has_node() || params.iter().any(|param| param.ty.has_node())
            }
            Self::List(item) | Self::Maybe(item) | Self::Promise(item) => item.has_node(),
            _ => false,
        }
    }

    /// Each name of a type [`types`] defines that this type uses, `Stop`
    /// included.
    fn named(self, into: &mut Vec<&'static str>) {
        match self {
            Self::Named(name) => into.push(name),
            Self::Stop => into.push("Stop"),
            Self::Callback(params, returns) => {
                returns.named(into);
                for param in params {
                    param.ty.named(into);
                }
            }
            Self::List(item) | Self::Maybe(item) | Self::Promise(item) => item.named(into),
            _ => {}
        }
    }
}
