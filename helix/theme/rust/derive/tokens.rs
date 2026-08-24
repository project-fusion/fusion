//! Assembling the token list, and the pinned overrides applied on top of it.
//!
//! The order here is not presentation. It decides what a reader of the emitted
//! file sees first, and, for a pinned token that names something already in the
//! list, which entry gets replaced. So it is written out in one place rather
//! than accumulated by each phase, which is also what makes the list assertable
//! as a list: a token silently missing is a token nobody notices is missing.

use crate::derive::accent::{seeded, settle};
use crate::derive::emphasis::{emphasis, Emphasis};
use crate::derive::fills::{filled_grounds, hover_of, on_accent, status_fills, Fill};
use crate::derive::inks::{neutral_inks, NeutralInks};
use crate::derive::marks::{brand_mark, focus_ring, inverse};
use crate::derive::resolve::{Policy, Resolved};
use crate::derive::status::{statuses, StatusColor};
use crate::derive::surfaces::{ladder, surfaces};
use crate::derive::{resolve, token, Cast, DerivedToken, Deriving, Origin};
use crate::intent::{to_oklch, Seed};
use crate::oklch::Oklch;

/// Everything a derivation computed, kept because the caller needs more than the
/// token list: `pairings` measures against these and `collisions` compares them.
pub struct Derived {
    pub accent: Emphasis,
    pub brand: Oklch,
    pub ctx: Deriving,
    pub neutral: Cast,
    pub primary: Emphasis,
    pub status_fills: Vec<(&'static str, Fill)>,
    pub statuses: Vec<StatusColor>,
    pub tokens: Vec<DerivedToken>,
}

/// Runs every phase in order and assembles the tokens.
///
/// # Panics
///
/// If handed a [`Resolved`] whose brand or accent is unreadable, which
/// [`resolve::resolve`] refuses, so one cannot be built through it.
#[must_use]
pub fn derive_tokens(resolved: &Resolved) -> Derived {
    let policy = Policy::new(resolved.chroma);
    let (raw_brand, brand, neutral) = resolve::brand_and_neutral(resolved, policy);
    let ctx = Deriving {
        contrast_target: resolved.contrast_target,
        policy,
        scheme: resolved.scheme,
        surfaces: surfaces(
            resolved.scheme,
            neutral,
            ladder(resolved.separation.surface),
        ),
    };

    let phases = Phases::run(resolved, &ctx, raw_brand, brand, neutral);
    let tokens = assemble(resolved, &ctx, brand, &phases);

    Derived {
        accent: phases.accent,
        brand,
        ctx,
        neutral,
        primary: phases.primary,
        status_fills: phases.fills,
        statuses: phases.statuses,
        tokens,
    }
}

/// What the color phases produced, before any of it is named.
///
/// Split from the assembly because the two answer different questions: this is
/// "which colours does this intent imply", and [`assemble`] is "what does the
/// emitted file call them, and in what order". A change to one is almost never a
/// change to the other, and holding both in one function is what let the
/// 615-line original hide each behind the other.
struct Phases {
    accent: Emphasis,
    accent_origin: Origin,
    fills: Vec<(&'static str, Fill)>,
    foreground_inverse: Oklch,
    inks: NeutralInks,
    on_accent: Oklch,
    primary: Emphasis,
    statuses: Vec<StatusColor>,
    surface_inverse: Oklch,
}

impl Phases {
    /// The order is the dependency order and cannot be rearranged: the accent
    /// settles against the statuses, so the statuses have to have spent their
    /// own allowances first, and the fills are taken from both.
    fn run(
        resolved: &Resolved,
        ctx: &Deriving,
        raw_brand: Oklch,
        brand: Oklch,
        neutral: Cast,
    ) -> Self {
        let primary = emphasis(brand, ctx);
        let statuses = statuses(&resolved.status, brand.chroma, primary.raw, ctx);

        let (seed, pinned) = seeded(&resolved.accent, raw_brand, ctx.policy);
        let bound = match &resolved.accent {
            Seed::Color(_) => 0.0,
            Seed::Relation(relation) => relation.allowance.unwrap_or(45.0),
        };
        let accent = emphasis(
            settle(seed, pinned, bound, primary.raw, &statuses, ctx),
            ctx,
        );

        let fills = status_fills(&statuses, ctx);
        let grounds = filled_grounds(primary.filled, accent.filled, &fills);
        let (surface_inverse, foreground_inverse) =
            inverse(neutral, resolved.scheme, resolved.contrast_target);

        Self {
            accent,
            accent_origin: if pinned {
                Origin::Pinned
            } else {
                Origin::Related
            },
            fills,
            foreground_inverse,
            inks: neutral_inks(ctx.surfaces, neutral, resolved.contrast_target),
            on_accent: on_accent(&grounds, resolved.contrast_target),
            primary,
            statuses,
            surface_inverse,
        }
    }
}

/// Names the colours, in the order the emitted file carries them.
fn assemble(
    resolved: &Resolved,
    ctx: &Deriving,
    brand: Oklch,
    phases: &Phases,
) -> Vec<DerivedToken> {
    let Phases {
        accent,
        accent_origin,
        fills,
        foreground_inverse,
        inks,
        on_accent,
        primary,
        statuses,
        surface_inverse,
    } = phases;
    let ground = Some(ctx.surfaces.background());
    let plain = |name: &str, raw: Oklch| token(name, raw, Origin::Derived, None);
    let against = |name: &str, raw: Oklch, on: Oklch| token(name, raw, Origin::Derived, Some(on));

    let mut tokens = vec![
        plain("color-background", ctx.surfaces.raw_background),
        plain("color-surface", ctx.surfaces.raw_surface),
        token("color-border", inks.border, Origin::Derived, ground),
        token("color-foreground", inks.foreground, Origin::Derived, ground),
        token(
            "color-foreground-muted",
            inks.muted,
            Origin::Derived,
            ground,
        ),
        plain("color-surface-raised", ctx.surfaces.raw_raised),
        plain("color-surface-overlay", ctx.surfaces.raw_overlay),
        plain("color-surface-sunken", ctx.surfaces.raw_sunken),
        token("color-primary", primary.raw, Origin::Derived, ground),
        /* **`foreground-on-accent`, which is the name the stylesheet reads.**
        This emitted `color-primary-foreground` and nothing consumed it: every
        component putting text on the brand asks for
        `--helix-color-foreground-on-accent`, so the engine and the token layer
        were naming the same color differently and a themed page kept the stock
        one. The token layer has 135 names and this has a handful, so the handful
        moved. */
        against("color-foreground-on-accent", *on_accent, primary.filled),
        plain("color-primary-hover", primary.hover),
        plain("color-primary-active", primary.active),
        plain("color-primary-subtle", primary.subtle),
        plain("color-primary-surface", primary.filled),
        token("color-accent", accent.raw, *accent_origin, ground),
        token("color-accent-hover", accent.hover, *accent_origin, None),
        token("color-accent-active", accent.active, *accent_origin, None),
        token("color-accent-subtle", accent.subtle, *accent_origin, None),
        token("color-accent-surface", accent.filled, *accent_origin, None),
    ];

    for status in statuses {
        let origin = if status.pinned {
            Origin::Pinned
        } else {
            Origin::Derived
        };
        tokens.push(token(
            &format!("color-{}", status.name),
            status.color,
            origin,
            ground,
        ));
    }

    /* **The grounds the model says exist, which the engine never emitted.** A
    filled danger button, a hovered filled anything, the inverse pair a toast
    uses and the ring a keyboard depends on: each was a ground or an ink the
    stylesheet had and the engine did not, so a themed page kept the stock one
    exactly where it mattered most. */
    tokens.push(plain(
        "color-primary-surface-hover",
        hover_of(primary.filled),
    ));
    tokens.push(plain("color-accent-surface-hover", hover_of(accent.filled)));
    for (name, fill) in fills {
        tokens.push(plain(&format!("color-{name}-surface"), fill.rest));
        tokens.push(plain(
            &format!("color-{name}-surface-hover"),
            hover_of(fill.rest),
        ));
    }
    tokens.push(plain("color-surface-inverse", *surface_inverse));
    tokens.push(against(
        "color-foreground-inverse",
        *foreground_inverse,
        *surface_inverse,
    ));
    tokens.push(token(
        "color-focus-ring",
        focus_ring(brand, ctx),
        Origin::Derived,
        ground,
    ));
    tokens.push(token(
        "color-brand-mark",
        brand_mark(brand, &ctx.surfaces.solved_against()),
        Origin::Derived,
        ground,
    ));

    pin(resolved, &mut tokens);
    tokens
}

/// Applies the pinned overrides.
///
/// Last, so a pinned token wins, and recorded as `pinned` so a reader of the
/// emitted file can tell a decision from a computation. **Appended when it names
/// nothing already emitted**, which is what lets a consumer add a token of their
/// own rather than only override one of ours.
fn pin(resolved: &Resolved, tokens: &mut Vec<DerivedToken>) {
    for (name, color) in &resolved.tokens {
        let Some(value) = to_oklch(color) else {
            /* Unlike the brand, the accent and the statuses, a pinned token that
            cannot be read is skipped rather than refused. It is not an input to
            any derivation, so it cannot make a check pass by accident: nothing
            is solved against it, and `pairings` reports the pair naming it as
            `unverifiable`, which is the honest answer. Refusing an entire theme
            over one unreadable extra would be the louder mistake. */
            continue;
        };
        let pinned = token(name, value, Origin::Pinned, None);
        if let Some(at) = tokens.iter().position(|existing| existing.name == *name) {
            tokens[at] = pinned;
        } else {
            tokens.push(pinned);
        }
    }
}
