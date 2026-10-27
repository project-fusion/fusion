//! The runtime a project draws with when its `runtime` names none: Helix's.
//!
//! **Helix's runtime is the default provider.** A design system built on the
//! compiler draws its native components with `@fusion.dev/helix-native`
//! unless its `runtime` names another package that exports the same names.

/// The module the native components import the runtime from.
pub const NATIVE: &str = "@fusion.dev/helix-native";

/// The type of the event a native handler hears, which the runtime exports.
pub const EVENT_TYPE: &str = "HelixEvent";

/// The component an app wraps itself in, which draws each layer on a phone.
pub const LAYER_HOST: &str = "HelixRoot";
