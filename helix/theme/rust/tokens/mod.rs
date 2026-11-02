//! The token layer as typed expressions, and their values in each mode.
//!
//! **Each token's value is read into a typed expression**: a length of
//! `2.5rem` times the density seed, a color that is `light-dark()` of two
//! primitives, a mix, or a relative OKLCH color. `tokens.ts` writes each value
//! as calls to typed builders, such as `times(rem(2.5), density)`, which
//! `builder` reads as syntax; the primitives, seeds and modes a token
//! reaches are CSS, read as the shape the token reads them as. A value the
//! grammar does not admit is refused with a sentence, and every typed form is
//! held to print back as its source was written, so a registry that builds
//! has typed all of it. [`print`] writes each as the CSS `tokens.css` declares.
//!
//! **Evaluation is per mode, with the seeds at their defaults**: a color to
//! the sRGB a browser paints for it, mapped into gamut the way `paint.mjs`
//! maps it; a length to its ems, rems, and points; a duration to milliseconds.
//! [`native`] turns a value into what the React Native renderer takes, and
//! `helix system tokens` writes one module of those per mode.
//!
//! **Nothing here reads a file.** The command line reads `tokens.ts`,
//! `primitives.css`, `_modes.css` and the density stops in `base.css`, and
//! hands their text in, so the crate stays free of I/O for its WASM build.

mod builder;
mod eval;
mod expr;
mod native;
mod paint;
mod print;
mod read;
mod registry;
mod sheet;
mod syntax;

#[cfg(test)]
mod tests;

pub use builder::{parse as parse_builder, print::built as builder_of, Built};
pub use eval::{Curve, Drop, Effect, Length, Mode, Value};
pub use expr::{
    Channel, Color, Component, Easing, Expr, Families, Family, Filter, Filters, Kind, Layer, Math,
    Mix, Oklch, Op, Quantity, Shadow, Shape, Spring, Time, Unit, Var, Weight,
};
pub use native::{native, Native};
pub use paint::{to_hex, to_srgb, Lab, Polar};
pub use print::{expr as print, normalized};
pub use registry::{Declared, Registry, Token, Written};
pub use sheet::{declarations, declared_on_coarse, declared_under};
