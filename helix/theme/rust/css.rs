//! Rendering a derived theme as a CSS custom-property block.
//!
//! **The seeds are emitted beside the tokens, and that is what stops the two
//! derivations disagreeing.** `helix/styles` derives a ramp of its own from
//! `--helix-seed-*`, including the twenty-four series colors a chart reads, and
//! nothing in the engine reaches those. Emit the tokens alone and the buttons,
//! the tags and the surfaces move while every chart on the page stays the
//! original blue. The two name sets are held to each other, in both directions.
//!
//! Everything below the tokens is emitted **only where it was asked for**. An
//! omitted policy leaves the stylesheet's own defaults standing, which is not
//! the same as emitting a copy of them: a copy is a value this engine then owns,
//! and it stops tracking the stylesheet the moment either moves.

use crate::derive::theme::Theme;
use crate::intent::{Character, Mechanism, Weight};

/// The three durations a pace applies to. `instant` is 0 and is a statement.
const DURATIONS: [(&str, f64); 3] = [("fast", 120.0), ("normal", 200.0), ("slow", 320.0)];

/// What each mechanism means for an edge.
///
/// `fill` and `space` both come out as no edge and no lift, which is not a bug:
/// the difference between them lives in the surface colors and in `density`.
fn edge(mechanism: Mechanism) -> &'static str {
    match mechanism {
        Mechanism::Border => "1px",
        Mechanism::Fill | Mechanism::Shadow | Mechanism::Space => "0",
    }
}

/* Stated rather than referenced, because the emitted file has to stand on its
own: a consumer who takes the block and not the stylesheet still gets a lift. */
const SHADOW_IN_FLOW: &str = "0 4px 12px color-mix(in oklab, oklch(0.13 0 0) 10%, transparent)";
const SHADOW_FLOATING: &str = "0 12px 32px color-mix(in oklab, oklch(0.13 0 0) 14%, transparent)";

const SPRING: &str = "spring";

/// What a character does to the pace and to the three curves.
///
/// **Pace and curve together, because they are one decision.** A spring over
/// 120ms is a twitch and a soft curve over 120ms is a fade, so a character that
/// set the curve and left the duration alone would produce neither of the two
/// things it names.
struct Feel {
    decelerate: &'static str,
    emphasized: &'static str,
    pace: f64,
    standard: &'static str,
}

fn feel(character: Character) -> Feel {
    match character {
        Character::Gentle => Feel {
            decelerate: "cubic-bezier(0, 0, 0.2, 1)",
            emphasized: "cubic-bezier(0.4, 0, 0, 1.2)",
            pace: 1.35,
            standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        },
        /* **Not a pace and not a curve: the absence of both.** The curves are
        never emitted for it, the emission refusing to write curves nothing will
        run, so the three fields below are unreachable and are the standard ones
        rather than an invented set. */
        Character::Instant => Feel {
            decelerate: "cubic-bezier(0.4, 0, 0.2, 1)",
            emphasized: "cubic-bezier(0.4, 0, 0.2, 1)",
            pace: 0.0,
            standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        },
        /* **Constant speed, which is the one thing the other characters cannot
        be.** It is also the only curve character legible on a short travel,
        because constancy shows in the timing where an overshoot shows in the
        distance: a spring is one pixel past the finish on a dialog's rise and
        twelve on a drawer's slide. */
        Character::Precise => Feel {
            decelerate: "linear",
            emphasized: "linear",
            pace: 0.85,
            standard: "linear",
        },
        Character::Snappy => Feel {
            decelerate: "cubic-bezier(0, 0, 0.1, 1)",
            emphasized: "cubic-bezier(0.2, 0, 0, 1.2)",
            pace: 0.7,
            standard: "cubic-bezier(0.3, 0, 0.1, 1)",
        },
        Character::Springy => Feel {
            decelerate: SPRING,
            emphasized: SPRING,
            pace: 1.1,
            standard: SPRING,
        },
    }
}

/// The ramp, as steps away from the body size.
///
/// Negative steps are the UI ramp and go down a pixel each: 12 and 13 sit a
/// pixel apart because a label has to be smaller than its field and still be
/// read, which is a floor rather than a ratio. Positive steps are the display
/// ramp and compound by the scale.
const TEXT_STEPS: [(&str, i32); 7] = [
    ("2xl", 3),
    ("3xl", 4),
    ("lg", 1),
    ("md", 0),
    ("sm", -1),
    ("xl", 2),
    ("xs", -2),
];

/// Below this a label stops being small and starts being unreadable.
const TEXT_FLOOR: f64 = 11.0;

/// What each character does to the three weights, which move together.
fn weights(weight: Weight) -> [(&'static str, u32); 3] {
    match weight {
        Weight::Light => [("medium", 400), ("regular", 300), ("semibold", 500)],
        Weight::Regular => [("medium", 500), ("regular", 400), ("semibold", 600)],
        Weight::Strong => [("medium", 600), ("regular", 500), ("semibold", 700)],
    }
}

/// Renders a derived theme as a CSS custom-property block.
#[must_use]
pub fn to_css(theme: &Theme, selector: &str) -> String {
    let namespace = &theme.intent.namespace;
    let mut lines: Vec<String> = theme
        .tokens
        .iter()
        .map(|token| format!("  --{namespace}-{}: {};", token.name, token.hex))
        .collect();

    for (name, value) in &theme.seeds {
        lines.push(format!("  --{namespace}-{name}: {value};"));
    }

    /* **The separation policy, which is what makes the knob turn.** The audit
    that produced these tokens put every surface's edge and lift behind a hook
    defaulting to one of them, so a single declaration here reaches thirteen
    surfaces. */
    if let Some(surface) = theme.intent.separation.surface {
        lines.push(format!(
            "  --{namespace}-border-surface: {};",
            edge(surface)
        ));
        let shadow = if surface == Mechanism::Shadow {
            SHADOW_IN_FLOW
        } else {
            "none"
        };
        lines.push(format!("  --{namespace}-shadow-surface: {shadow};"));
    }
    if let Some(floating) = theme.intent.separation.floating {
        let mechanism = floating.into();
        lines.push(format!(
            "  --{namespace}-border-floating: {};",
            edge(mechanism)
        ));
        let shadow = if mechanism == Mechanism::Shadow {
            SHADOW_FLOATING
        } else {
            "none"
        };
        lines.push(format!("  --{namespace}-shadow-floating: {shadow};"));
    }

    font_faces(theme, namespace, &mut lines);
    motion(theme, namespace, &mut lines);
    text_ramp(theme, namespace, &mut lines);
    material(theme, namespace, &mut lines);

    format!("{selector} {{\n{}\n}}\n", lines.join("\n"))
}

/// **Families are emitted and the rest of the type system is not**, which is the
/// honest half of this: a consumer picks faces, where the size scale, the
/// weights, the leading and the tracking are a system rather than a choice.
///
/// **The body face is emitted as `font-sans`, which is the name the stylesheet
/// reads.** Nothing consumes `font-body`, so emitting that name sets a face no
/// word on the page takes. The intent field stays `body`, that being what a
/// consumer means; the token is what the token layer calls it.
fn font_faces(theme: &Theme, namespace: &str, lines: &mut Vec<String>) {
    let font = &theme.intent.font;
    if font.body.is_some() || font.display.is_some() || font.mono.is_some() {
        /* **The block names the faces and does not fetch them**, which is the
        line between a preview and an artifact. A builder trying a face on may
        reach for whatever host has it; a block a consumer pastes into their own
        stylesheet must not thereby acquire a dependency on a host they did not
        pick. */
        lines.push("  /* Assumes these faces are already loaded. */".to_owned());
    }
    if let Some(body) = &font.body {
        lines.push(format!("  --{namespace}-font-sans: {body};"));
    }
    if let Some(display) = font.display.as_ref().or(font.body.as_ref()) {
        lines.push(format!("  --{namespace}-font-display: {display};"));
    }
    if let Some(mono) = &font.mono {
        lines.push(format!("  --{namespace}-font-mono: {mono};"));
    }
}

fn motion(theme: &Theme, namespace: &str, lines: &mut Vec<String>) {
    let Some(character) = theme.intent.motion.character else {
        if let Some(pace) = theme.intent.motion.scale {
            durations(namespace, pace, lines);
        }
        return;
    };
    /* `instant` is 0 whatever the scale says, which is what makes it a statement
    rather than a very small duration. */
    let multiplier = if character == Character::Instant {
        0.0
    } else {
        feel(character).pace * theme.intent.motion.scale.unwrap_or(1.0)
    };
    durations(namespace, multiplier, lines);

    if character == Character::Instant {
        return;
    }
    /* The spring is a token rather than a literal, so it has to be written under
    whatever namespace this theme is emitting. A hardcoded
    `var(--helix-easing-...)` is correct for exactly one namespace and silently
    dead for every other, which is the gap `namespace` as an input closes. */
    let curves = feel(character);
    for (role, value) in [
        ("standard", curves.standard),
        ("emphasized", curves.emphasized),
        ("decelerate", curves.decelerate),
    ] {
        let rendered = if value == SPRING {
            format!("var(--{namespace}-easing-spring)")
        } else {
            value.to_owned()
        };
        lines.push(format!("  --{namespace}-easing-{role}: {rendered};"));
    }
}

fn durations(namespace: &str, multiplier: f64, lines: &mut Vec<String>) {
    for (step, ms) in DURATIONS {
        /* `Math.round` rounds half *up*, where Rust's `f64::round` rounds half
        away from zero. Every duration here is positive, so the two agree, and
        stating it is cheaper than discovering later that a negative scale is
        reachable. */
        lines.push(format!(
            "  --{namespace}-duration-{step}: {}ms;",
            (ms * multiplier).round()
        ));
    }
}

/// The ramp, emitted only where a base or a ratio was asked for, so a theme that
/// says nothing about size leaves the hand-picked scale standing rather than
/// replacing it with a generated one that rounds differently.
fn text_ramp(theme: &Theme, namespace: &str, lines: &mut Vec<String>) {
    let font = &theme.intent.font;
    if font.base.is_none() && font.scale.is_none() {
        if let Some(weight) = font.weight {
            emit_weights(namespace, weight, lines);
        }
        return;
    }
    let body = font.base.unwrap_or(14.0);
    let step = font.scale.unwrap_or(1.32);

    /* **Compounded from the rounded step, not from the base.** A designer builds
    a scale by taking the last round number and multiplying it, which is why real
    ramps are whole pixels the whole way up; compounding from the base and
    rounding once at the end produces a run that is a pixel off itself in the
    middle. Measured at 1.32: 18, 24, 32, 42 from the rounded chain against 19,
    25, 33, 44 from the base. */
    let mut above: Vec<f64> = Vec::with_capacity(4);
    for index in 0..4 {
        let from = if index == 0 { body } else { above[index - 1] };
        above.push((from * step).round());
    }

    for (name, distance) in TEXT_STEPS {
        let px = match usize::try_from(distance) {
            /* Negative steps are the UI ramp, a pixel apart with a floor under
            them; `try_from` failing *is* the sign test, so the cast that would
            lose it cannot be written. */
            Err(_) => TEXT_FLOOR.max(body + f64::from(distance)),
            Ok(0) => body,
            Ok(step) => above[step - 1],
        };
        lines.push(format!("  --{namespace}-text-{name}: {}rem;", px / 16.0));
    }
    if let Some(weight) = font.weight {
        emit_weights(namespace, weight, lines);
    }
}

fn emit_weights(namespace: &str, weight: Weight, lines: &mut Vec<String>) {
    for (name, value) in weights(weight) {
        lines.push(format!("  --{namespace}-weight-{name}: {value};"));
    }
}

fn material(theme: &Theme, namespace: &str, lines: &mut Vec<String>) {
    let material = &theme.intent.material;
    if let Some(blur) = material.blur {
        let backdrop = if blur == 0.0 {
            "none".to_owned()
        } else {
            format!("blur({blur}px)")
        };
        lines.push(format!("  --{namespace}-material-backdrop: {backdrop};"));
    }
    if let Some(opacity) = material.opacity {
        lines.push(format!(
            "  --{namespace}-material-translucent: color-mix(in oklab, \
             var(--{namespace}-color-surface) {}%, transparent);",
            (opacity * 100.0).round()
        ));
        /* **The scalar as well as the color**, because the two halves of
        material reach different things. The color is what a translucent
        *surface* is filled with; the scalar is what every wash drawn at its own
        strength gets multiplied by, which is how a chart's area and a faded
        group follow the same policy as a glass header. Emit one without the
        other and the flat half of the language is left behind. */
        lines.push(format!(
            "  --{namespace}-material-opacity: {};",
            crate::derive::seeds::trimmed(opacity, 3)
        ));
    }
}
