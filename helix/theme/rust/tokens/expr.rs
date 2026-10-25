//! The typed expressions a token's value is read into.
//!
//! **Each shape is its own type, and a reference carries the shape it is read
//! as.** `var(--_helix-neutral-0)` in a color slot is a [`Var<Color>`], and its
//! fallback, where it has one, is a [`Color`] too, so a fallback of the wrong
//! shape is refused where it is read. The declaration a reference names is read
//! as the shape its reader takes, which is how one primitive such as
//! `--_helix-seed-neutral-chroma` is a number inside `calc()` and a channel of
//! `oklch()` where it is spread into one.

/// A reference to a custom property, and what to read where it is not set.
#[derive(Clone, Debug, PartialEq)]
pub struct Var<T> {
    /// The property's whole name, such as `--_helix-neutral-0`.
    pub name: String,
    /// What `var()` reads where the property is unset or invalid.
    pub fallback: Option<Box<T>>,
}

/// A declaration's value, in the shape it is read as.
#[derive(Clone, Debug, PartialEq)]
pub enum Expr {
    /// Components spread into `oklch()`, such as `--_helix-neutral-cast`.
    Channels(Vec<Channel>),
    Color(Color),
    Easing(Easing),
    Families(Families),
    Filters(Filters),
    /// A number or a length, whose dimension the arithmetic decides.
    Quantity(Quantity),
    Shadow(Shadow),
    Time(Time),
}

/// The shapes a value is read as, which is the type a reference names.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum Shape {
    Channels,
    Color,
    Easing,
    Families,
    Filters,
    Quantity,
    Shadow,
    Time,
}

/// A color.
#[derive(Clone, Debug, PartialEq)]
pub enum Color {
    /// `#` and its hex digits as written, without the `#`.
    Hex(String),
    /// `light-dark(<light>, <dark>)`.
    LightDark(Box<Color>, Box<Color>),
    /// `color-mix(in oklab, ...)`.
    Mix(Box<Mix>),
    /// `oklch(...)`, absolute or relative to an origin.
    Oklch(Box<Oklch>),
    Transparent,
    Var(Var<Color>),
}

/// `color-mix(in oklab, <first> <weight>, <second>)`, the one space the token
/// layer mixes in.
#[derive(Clone, Debug, PartialEq)]
pub struct Mix {
    pub first: Color,
    pub second: Color,
    pub weight: Weight,
}

/// Which side of a mix states its percentage. Stating both is refused.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Weight {
    /// Neither, so each takes half.
    Even,
    /// The first color's percentage, from 0 to 100.
    First(f64),
    /// The second color's percentage, from 0 to 100.
    Second(f64),
}

/// `oklch(<l> <c> <h>)`, or `oklch(from <origin> <l> <c> <h>)`.
#[derive(Clone, Debug, PartialEq)]
pub struct Oklch {
    pub origin: Option<Color>,
    /// Three once every spread reference is substituted.
    pub channels: Vec<Channel>,
}

/// One component of `oklch()`.
#[derive(Clone, Debug, PartialEq)]
pub enum Channel {
    Calc(Math),
    /// `clamp(<min>, <value>, <max>)`, each as the inside of `calc()`.
    Clamp(Box<[Math; 3]>),
    /// The origin's own `l`, `c` or `h`, in a relative color.
    Component(Component),
    Number(f64),
    /// A reference spread into the components, which may hold several.
    Var(Var<Vec<Channel>>),
}

/// The origin's components a relative color reads by name.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Component {
    Chroma,
    Hue,
    Lightness,
}

/// A number or a length, outside `calc()` or as a whole `calc()`.
#[derive(Clone, Debug, PartialEq)]
pub enum Quantity {
    Calc(Math),
    Length(f64, Unit),
    Number(f64),
    /// `round(<value>, <step>)`, to the nearest multiple of the step.
    Round(Box<Quantity>, Box<Quantity>),
    Var(Var<Quantity>),
}

/// The length units the token layer writes.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Unit {
    /// The font size of the element the value lands on.
    Em,
    /// A CSS pixel, which is a point on a device.
    Px,
    /// The root font size, 16 pixels.
    Rem,
}

/// The arithmetic inside `calc()`.
#[derive(Clone, Debug, PartialEq)]
pub enum Math {
    Binary(Box<Math>, Op, Box<Math>),
    Component(Component),
    Length(f64, Unit),
    Number(f64),
    Var(Var<Quantity>),
}

/// The four operators of `calc()`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Op {
    Add,
    Divide,
    Multiply,
    Subtract,
}

/// A duration.
#[derive(Clone, Debug, PartialEq)]
pub enum Time {
    Milliseconds(f64),
    Seconds(f64),
    Var(Var<Time>),
}

/// A timing function.
#[derive(Clone, Debug, PartialEq)]
pub enum Easing {
    /// `cubic-bezier(x1, y1, x2, y2)`.
    CubicBezier([f64; 4]),
    /// `linear(...)`, as its stops' outputs, evenly spaced.
    Linear(Vec<f64>),
    /// A spring, which CSS has no function for, written as the `linear()`
    /// curve that draws it.
    Spring(Box<Spring>),
    Var(Var<Easing>),
}

/// A spring's physics, and the curve a stylesheet draws it with.
///
/// **The curve is written beside the physics, and never computed from it.**
/// A `linear()` curve has no duration and a spring has no end, so the stops
/// are a reading of one spring over one length of time, and they are what
/// the stylesheet ships.
#[derive(Clone, Debug, PartialEq)]
pub struct Spring {
    /// The damping coefficient, in newton-seconds per meter.
    pub damping: f64,
    /// The mass, in kilograms.
    pub mass: f64,
    /// The stiffness, in newtons per meter.
    pub stiffness: f64,
    /// The `linear()` curve's outputs, evenly spaced.
    pub stops: Vec<f64>,
}

/// A `box-shadow`.
#[derive(Clone, Debug, PartialEq)]
pub enum Shadow {
    Layers(Vec<Layer>),
    None,
    Var(Var<Shadow>),
}

/// One shadow: its offsets, blur and spread, then its color.
#[derive(Clone, Debug, PartialEq)]
pub struct Layer {
    /// Two to four lengths.
    pub lengths: Vec<Quantity>,
    pub color: Option<Color>,
}

/// A `filter` or `backdrop-filter`.
#[derive(Clone, Debug, PartialEq)]
pub enum Filters {
    List(Vec<Filter>),
    Var(Var<Filters>),
}

/// One filter function.
#[derive(Clone, Debug, PartialEq)]
pub enum Filter {
    Blur(Quantity),
    Saturate(Quantity),
}

/// A `font-family` list.
#[derive(Clone, Debug, PartialEq)]
pub enum Families {
    List(Vec<Family>),
    Var(Var<Families>),
}

/// One family in a list.
#[derive(Clone, Debug, PartialEq)]
pub enum Family {
    /// An unquoted name, as the words it is written in, such as `system-ui`.
    Named(Vec<String>),
    /// A quoted name, such as `"Segoe UI"`.
    Quoted(String),
}

/// What a token is, which decides what the native renderer takes for it.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Kind {
    Color,
    Easing,
    Family,
    Filter,
    Length,
    Number,
    Shadow,
    Time,
}

/// A shape a reference resolves to, and how to find it in a declaration.
pub trait Shaped: Sized {
    /// The shape a reference of this type reads its declaration as.
    const SHAPE: Shape;

    /// This shape's value, where `expr` holds one.
    fn within(expr: &Expr) -> Option<&Self>;
}

macro_rules! shaped {
    ($type:ty, $variant:ident) => {
        impl Shaped for $type {
            const SHAPE: Shape = Shape::$variant;

            fn within(expr: &Expr) -> Option<&Self> {
                match expr {
                    Expr::$variant(value) => Some(value),
                    _ => None,
                }
            }
        }
    };
}

shaped!(Vec<Channel>, Channels);
shaped!(Color, Color);
shaped!(Easing, Easing);
shaped!(Families, Families);
shaped!(Filters, Filters);
shaped!(Quantity, Quantity);
shaped!(Shadow, Shadow);
shaped!(Time, Time);
