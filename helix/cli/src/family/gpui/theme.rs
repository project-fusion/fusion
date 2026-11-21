//! The theme module: each token as a field of a `Theme` struct, with a
//! constructor for each mode, and the helpers the element modules call.
//!
//! **A field's type follows the token's kind**, as the native theme names
//! it: a color is an `Hsla`, a length in pixels or rems an `AbsoluteLength`,
//! a duration a `Duration`, a weight or a number an `f32`, a timing function
//! its four control points, and a font family the first family the text
//! system holds. A token of another kind, or a length in ems or `calc()`, has
//! no field yet, and the module's header names it.

use std::fmt::Write as _;

use fusion_helix_theme::tokens::Native;

use super::{field, header};
use crate::family::tokens::Values;

/// What a field holds, as the element modules check a token they read.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    Color,
    Easing,
    Family,
    Length,
    Number,
    Time,
}

/// The tokens a theme module holds, each by its name with its kind.
#[derive(Debug, Default)]
pub struct Tokens {
    pub fields: Vec<(String, Kind)>,
    /// Each token left out, with why.
    pub left: Vec<String>,
    modes: Vec<(&'static str, Vec<(String, String)>)>,
}

impl Tokens {
    /// The fields of `values`, and each mode's Rust expression for each.
    pub fn new(values: &Values) -> Self {
        let mut tokens = Self::default();
        for (mode, entries) in &values.modes {
            let mut written = Vec::new();
            for (name, value) in entries {
                let Some((_, kind)) = values.kinds.iter().find(|(one, _)| one == name) else {
                    continue;
                };
                match expression(kind, value) {
                    Ok((kind, rust)) => {
                        if *mode == "light" {
                            tokens.fields.push((name.clone(), kind));
                        }
                        written.push((name.clone(), rust));
                    }
                    Err(why) => {
                        if *mode == "light" {
                            tokens.left.push(format!("`{name}`: {why}"));
                        }
                    }
                }
            }
            tokens.modes.push((mode, written));
        }
        tokens
    }

    /// The kind of the token `name`, where the theme holds it.
    pub fn kind(&self, name: &str) -> Option<Kind> {
        self.fields
            .iter()
            .find(|(one, _)| one == name)
            .map(|(_, kind)| *kind)
    }
}

/// The theme module, opening with `source`.
pub fn module(tokens: &Tokens, source: &str) -> String {
    let mut out = header(source, &tokens.left);
    out.push_str(
        "use std::time::{Duration, Instant};\n\n\
         use gpui::{AbsoluteLength, App, BoxShadow, ElementId, Global, Hsla, Pixels, Rgba, SharedString, Window};\n\n",
    );
    out.push_str(
        "/// Each token's value in one mode.\n#[derive(Clone, Debug)]\npub struct Theme {\n",
    );
    for (name, kind) in &tokens.fields {
        let _ = writeln!(
            out,
            "    /// `{name}`.\n    pub {}: {},",
            field(name),
            rust_type(*kind)
        );
    }
    out.push_str("}\n\nimpl Global for Theme {}\n\nimpl Theme {\n");
    for (mode, written) in &tokens.modes {
        let _ = writeln!(
            out,
            "    /// The tokens in {mode} mode. `cx` picks each font family the text system holds.\n    pub fn {mode}(cx: &App) -> Self {{\n        Self {{"
        );
        for (name, rust) in written {
            let _ = writeln!(out, "            {}: {rust},", field(name));
        }
        out.push_str("        }\n    }\n\n");
    }
    out.truncate(out.trim_end().len());
    out.push_str("\n}\n\n");
    out.push_str(RUNTIME);
    out
}

/// What the element modules call that a runtime crate would hold: reading
/// the theme, picking a font, and drawing an outline as a ring.
const RUNTIME: &str = r#"/// Reads the theme an app sets as a global with `cx.set_global(Theme::light(cx))`.
pub trait ActiveTheme {
    /// The theme in use.
    fn theme(&self) -> &Theme;
}

impl ActiveTheme for App {
    fn theme(&self) -> &Theme {
        self.global::<Theme>()
    }
}

/// The first of `families` the text system holds, or the system's own font.
fn family(families: &[&str], cx: &App) -> SharedString {
    let held = cx.text_system().all_font_names();
    for family in families {
        if matches!(*family, "sans-serif" | "system-ui") {
            break;
        }
        if held.iter().any(|one| one == family) {
            return SharedString::new((*family).to_owned());
        }
    }
    SharedString::new_static(".SystemUIFont")
}

/// What the transition driver holds for one property of one part: where
/// the last move started, where it is going, and when it began.
struct Easing {
    from: Hsla,
    to: Hsla,
    start: Option<Instant>,
}

impl Easing {
    /// The color shown at `now`.
    fn at(&self, now: Instant, duration: Duration, curve: [f32; 4]) -> Hsla {
        let Some(start) = self.start else {
            return self.to;
        };
        let progress = (now.duration_since(start).as_secs_f32() / duration.as_secs_f32()).min(1.0);
        mix(self.from, self.to, bezier(curve, progress))
    }
}

/// `target`, eased from the color the part showed before it changed, over
/// `duration` along `curve`, as a CSS transition moves a color. The part's
/// element `id` and `property` name the move. A first render shows `target`
/// at once, and so does every render while `cx.reduce_motion()` holds, which
/// the app sets from the system setting and its Motion Toggle.
pub fn eased_color(
    window: &mut Window,
    cx: &mut App,
    id: &ElementId,
    property: &'static str,
    target: Hsla,
    duration: Duration,
    curve: [f32; 4],
) -> Hsla {
    let reduced = cx.reduce_motion();
    let state = window.with_element_namespace(id.clone(), |window| {
        window.use_keyed_state(property, cx, |_, _| Easing {
            from: target,
            to: target,
            start: None,
        })
    });
    let now = Instant::now();
    let (shown, moving) = state.update(cx, |easing, _| {
        if easing.to != target {
            let shown = easing.at(now, duration, curve);
            easing.from = shown;
            easing.to = target;
            easing.start = (!reduced && !duration.is_zero()).then_some(now);
        }
        if easing
            .start
            .is_some_and(|start| reduced || now.duration_since(start) >= duration)
        {
            easing.start = None;
        }
        (easing.at(now, duration, curve), easing.start.is_some())
    });
    if moving {
        window.request_animation_frame();
    }
    shown
}

/// `from` mixed with `amount` of `to`, in sRGB with premultiplied alpha, as
/// CSS interpolates a color, so a fill fades to transparent without darkening.
fn mix(from: Hsla, to: Hsla, amount: f32) -> Hsla {
    let (a, b) = (from.to_rgb(), to.to_rgb());
    let alpha = a.a + (b.a - a.a) * amount;
    let channel = |x: f32, y: f32| {
        let value = x * a.a + (y * b.a - x * a.a) * amount;
        if alpha > 0.0 { value / alpha } else { 0.0 }
    };
    Rgba {
        r: channel(a.r, b.r),
        g: channel(a.g, b.g),
        b: channel(a.b, b.b),
        a: alpha,
    }
    .into()
}

/// How far along a `cubic-bezier(x1, y1, x2, y2)` curve is at `progress`.
fn bezier([x1, y1, x2, y2]: [f32; 4], progress: f32) -> f32 {
    let sample = |p1: f32, p2: f32, t: f32| {
        let inverse = 1.0 - t;
        3.0 * p1 * inverse * inverse * t + 3.0 * p2 * inverse * t * t + t * t * t
    };
    let (mut low, mut high, mut t) = (0.0_f32, 1.0_f32, progress);
    for _ in 0..32 {
        let x = sample(x1, x2, t);
        if (x - progress).abs() < 1e-5 {
            break;
        }
        if x < progress {
            low = t;
        } else {
            high = t;
        }
        t = (low + high) / 2.0;
    }
    sample(y1, y2, t)
}

/// An outline `width` wide in `color`, drawn as a shadow with a spread so the
/// layout does not move. GPUI draws no outline of its own.
pub fn ring(width: Pixels, color: Hsla) -> BoxShadow {
    BoxShadow {
        color,
        offset: gpui::point(gpui::px(0.), gpui::px(0.)),
        blur_radius: gpui::px(0.),
        spread_radius: width,
        inset: false,
    }
}
"#;

/// The Rust type of a field of `kind`.
fn rust_type(kind: Kind) -> &'static str {
    match kind {
        Kind::Color => "Hsla",
        Kind::Easing => "[f32; 4]",
        Kind::Family => "SharedString",
        Kind::Length => "AbsoluteLength",
        Kind::Number => "f32",
        Kind::Time => "Duration",
    }
}

/// A token's kind and its value as a Rust expression.
fn expression(kind: &str, value: &Native) -> Result<(Kind, String), String> {
    match (kind, value) {
        ("color", Native::Text(hex)) => Ok((Kind::Color, color(hex)?)),
        ("length", Native::Number(points)) => Ok((
            Kind::Length,
            format!("AbsoluteLength::Pixels(gpui::px({}))", float(*points)),
        )),
        ("length", Native::Text(text)) => Ok((Kind::Length, length(text)?)),
        ("time", Native::Number(ms)) => Ok((
            Kind::Time,
            format!("Duration::from_secs_f64({})", float(ms / 1000.0)),
        )),
        ("number", Native::Number(number)) => Ok((Kind::Number, float(*number))),
        ("easing", Native::Text(text)) => Ok((Kind::Easing, easing(text)?)),
        ("family", Native::Text(text)) => Ok((Kind::Family, families(text))),
        (other, _) => Err(format!(
            "a `{other}` token has no field in the GPUI theme yet"
        )),
    }
}

/// `#rrggbb` or `#rrggbbaa` as an `Hsla`.
pub fn color(hex: &str) -> Result<String, String> {
    let digits = hex
        .strip_prefix('#')
        .ok_or_else(|| format!("`{hex}` is no hex color"))?;
    let digits = match digits.len() {
        6 => format!("{digits}ff"),
        8 => digits.to_owned(),
        _ => return Err(format!("`{hex}` is no hex color")),
    };
    Ok(format!("gpui::rgba(0x{}).into()", digits.to_lowercase()))
}

/// A length in rems or pixels as an `AbsoluteLength`.
pub fn length(text: &str) -> Result<String, String> {
    if let Some(number) = text.strip_suffix("rem") {
        let number: f64 = number
            .parse()
            .map_err(|_| format!("`{text}` is no length"))?;
        return Ok(format!(
            "AbsoluteLength::Rems(gpui::rems({}))",
            float(number)
        ));
    }
    if let Some(number) = text.strip_suffix("px") {
        let number: f64 = number
            .parse()
            .map_err(|_| format!("`{text}` is no length"))?;
        return Ok(format!(
            "AbsoluteLength::Pixels(gpui::px({}))",
            float(number)
        ));
    }
    if text == "0" {
        return Ok("AbsoluteLength::Pixels(gpui::px(0.))".to_owned());
    }
    Err(format!(
        "`{text}` is a length GPUI resolves only against a font size, which the spike does not track"
    ))
}

/// `cubic-bezier(a, b, c, d)` as its four control points.
fn easing(text: &str) -> Result<String, String> {
    let inner = text
        .strip_prefix("cubic-bezier(")
        .and_then(|rest| rest.strip_suffix(')'))
        .ok_or_else(|| format!("`{text}` is no cubic Bézier curve"))?;
    let points: Vec<String> = inner
        .split(',')
        .map(|one| {
            one.trim()
                .parse::<f64>()
                .map(float)
                .map_err(|_| format!("`{text}` is no cubic Bézier curve"))
        })
        .collect::<Result<_, _>>()?;
    Ok(format!("[{}]", points.join(", ")))
}

/// A CSS font family list as the first family the text system holds.
fn families(text: &str) -> String {
    let names: Vec<String> = text
        .split(',')
        .map(|one| format!("{:?}", one.trim().trim_matches(['"', '\''])))
        .collect();
    format!("family(&[{}], cx)", names.join(", "))
}

/// A number as an `f32` literal.
pub fn float(number: f64) -> String {
    let text = format!("{number}");
    if text.contains('.') || text.contains('e') {
        text
    } else {
        format!("{text}.0")
    }
}
