//! Where each condition is written in a rule's selector, which its weight in
//! the cascade follows.

use crate::family::ir::Condition;

/// Where a condition is written in the selector.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Scope {
    /// Inside `:host()`.
    Host,
    /// On the target: a part, the host itself, or a slotted child.
    Target,
    /// Around the rule, as an `@media` or an `@container` query, or
    /// `@starting-style`.
    Media,
    /// Before the target, as the part it is drawn inside.
    Within,
}

/// Where `condition` is written. A `:not()` is written where what it holds
/// is.
pub fn scope(condition: &Condition) -> Scope {
    match condition {
        Condition::Not { condition } => scope(condition),
        Condition::Container { .. }
        | Condition::Entering
        | Condition::Media { .. }
        | Condition::Window { .. } => Scope::Media,
        Condition::Within { .. } => Scope::Within,
        Condition::Also { .. }
        | Condition::Child { .. }
        | Condition::Holds { .. }
        | Condition::Part { .. }
        | Condition::Place { .. }
        | Condition::Pseudo { .. } => Scope::Target,
        Condition::Absent { .. }
        | Condition::Attribute { .. }
        | Condition::Defined
        | Condition::Dir { .. }
        | Condition::Disabled { .. }
        | Condition::Filled { .. }
        | Condition::HostOfType { .. }
        | Condition::HostPlace { .. }
        | Condition::OneOf { .. }
        | Condition::State { .. } => Scope::Host,
    }
}
