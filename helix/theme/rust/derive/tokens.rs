//! Assembling the token list, and the pinned overrides applied on top of it.
//!
//! The order here is not presentation. It decides what a reader of the emitted
//! file sees first, and, for a pinned token that names something already in the
//! list, which entry gets replaced. So it is written out in one place rather
//! than accumulated by each phase, which is also what makes the list assertable
//! as a list: a token silently missing is a token nobody notices is missing.

use crate::derive::accent::{seeded, settle};
use crate::derive::emphasis::{chosen, emphasis, ink, Emphasis};
use crate::derive::fills::{filled_grounds, hover_of, on_fill, on_ink, status_fills, Fill};
use crate::derive::inks::{neutral_inks, NeutralInks};
use crate::derive::marks::{brand_mark, focus_ring, inverse};
use crate::derive::quiet::quiet;
use crate::derive::resolve::{Policy, Resolved};
use crate::derive::status::{statuses, StatusColor, REFERENCE_CHROMA};
use crate::derive::surfaces::{ladder, surfaces_on};
use crate::derive::{resolve, token, Cast, DerivedToken, Deriving, Origin};
use crate::intent::{to_oklch, Seed};
use crate::oklch::Oklch;

/// Everything a derivation computed, kept because the caller needs more than the
/// token list: `pairings` measures against these and `collisions` compares them.
pub struct Derived {
    pub accent: Emphasis,
    /// The brand with the chroma policy applied, or `None` for ink.
    pub brand: Option<Oklch>,
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
    let named = resolve::brand(resolved, policy);
    let brand = named.map(|(_, brand)| brand);
    let neutral = resolve::neutral(resolved, policy);
    let ctx = Deriving {
        contrast_target: resolved.contrast_target,
        policy,
        scheme: resolved.scheme,
        surfaces: surfaces_on(
            resolved.scheme,
            resolve::page(resolved),
            neutral,
            ladder(resolved.separation.surface),
        ),
    };

    let phases = Phases::run(resolved, &ctx, named, neutral);
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
/// "which colors does this intent imply", and [`assemble`] is "what does the
/// emitted file call them, and in what order". A change to one is almost never a
/// change to the other.
struct Phases {
    accent: Emphasis,
    accent_origin: Origin,
    fills: Vec<(&'static str, Fill)>,
    foreground_inverse: Oklch,
    inks: NeutralInks,
    on_accent: Oklch,
    on_primary: Oklch,
    on_status: Oklch,
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
        named: Option<(Oklch, Oklch)>,
        neutral: Cast,
    ) -> Self {
        let primary = named.map_or_else(|| ink(neutral, ctx), |(_, brand)| chosen(brand, ctx));
        /* **Ink counts as an ordinary brand's loudness, as far as the statuses
        go.** `harmony` pulls a status toward the palette's own loudness, and ink
        has none to pull toward: taken as a brand at chroma 0, the default
        `harmony` puts every status at its floor, 0.55 of its own chroma, on a
        page with nothing else colored on it. */
        let loudness = named.map_or(REFERENCE_CHROMA, |(_, brand)| brand.chroma);
        let statuses = statuses(&resolved.status, loudness, primary.raw, ctx);

        /* An accent the intent does not name is the primary's own five colors,
        the brand's or the ink's, so it is the primary by construction. A solve
        would only land near it. */
        let (accent, accent_origin) = match &resolved.accent {
            None => (primary, Origin::Derived),
            Some(wanted) => {
                let (seed, pinned) = seeded(wanted, named.map(|(raw, _)| raw), ctx.policy);
                let bound = match wanted {
                    Seed::Color(_) => 0.0,
                    Seed::Relation(relation) => relation.allowance.unwrap_or(45.0),
                };
                let settled = settle(seed, pinned, bound, primary.raw, &statuses, ctx);
                let accent = if pinned {
                    chosen(settled, ctx)
                } else {
                    emphasis(settled, ctx)
                };
                let origin = if pinned {
                    Origin::Pinned
                } else {
                    Origin::Related
                };
                (accent, origin)
            }
        };

        let fills = status_fills(&statuses, ctx);
        /* **An ink role carries the page, and every colored one the
        near-white**, which is solved without the ink fills in its list: a light
        ink fill in the dark would drag it toward a gray that reads on nothing. */
        let primary_ink = named.is_none();
        let accent_ink = primary_ink && resolved.accent.is_none();
        let grounds = filled_grounds(
            (!primary_ink).then_some(primary.filled),
            (!accent_ink).then_some(accent.filled),
            &fills,
        );
        let colored = on_fill(&grounds, resolved.contrast_target);
        let on_primary = if primary_ink {
            on_ink(
                primary.filled,
                ctx.surfaces.raw_background,
                resolved.contrast_target,
            )
        } else {
            colored
        };
        let (surface_inverse, foreground_inverse) =
            inverse(neutral, resolved.scheme, resolved.contrast_target);

        Self {
            accent,
            accent_origin,
            fills,
            foreground_inverse,
            inks: neutral_inks(ctx.surfaces, neutral, resolved.contrast_target),
            on_accent: if accent_ink { on_primary } else { colored },
            on_primary,
            on_status: colored,
            primary,
            statuses,
            surface_inverse,
        }
    }
}

/// Each tone's quiet ink, after the tones themselves.
///
/// Derived from the tone as it came out rather than as it was asked for, so a
/// pinned status quietens the color the consumer pinned, and `Derived` whatever
/// the tone's own origin, since nobody supplied this one.
fn quiet_inks(
    primary: &Emphasis,
    accent: &Emphasis,
    statuses: &[StatusColor],
    ctx: &Deriving,
) -> Vec<DerivedToken> {
    let ground = Some(ctx.surfaces.background());
    let named = [("primary", primary.raw), ("accent", accent.raw)]
        .into_iter()
        .chain(statuses.iter().map(|status| (status.name, status.color)));
    named
        .map(|(name, ink)| {
            token(
                &format!("color-{name}-muted"),
                quiet(ink, ctx),
                Origin::Derived,
                ground,
            )
        })
        .collect()
}

/// Names the colors, in the order the emitted file carries them.
fn assemble(
    resolved: &Resolved,
    ctx: &Deriving,
    brand: Option<Oklch>,
    phases: &Phases,
) -> Vec<DerivedToken> {
    let Phases {
        accent,
        accent_origin,
        fills,
        foreground_inverse,
        inks,
        on_accent,
        on_primary,
        on_status,
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
        /* **The labels, one per role, under the names the stylesheet reads.**
        Every component that puts text on a fill reads
        `--helix-color-foreground-on-` and the fill's role, so an engine naming
        those colors anything else leaves a themed page on the stock ones. The
        token layer has 135 names and this has a handful, so the handful moved.
        Each is measured against its own role's fill, and the status label
        against the first status's. */
        against("color-foreground-on-primary", *on_primary, primary.filled),
        against("color-foreground-on-accent", *on_accent, accent.filled),
        token(
            "color-foreground-on-status",
            *on_status,
            Origin::Derived,
            fills.first().map(|(_, fill)| fill.rest),
        ),
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

    tokens.extend(quiet_inks(primary, accent, statuses, ctx));

    /* **The grounds the model says exist.** A filled danger button, a hovered
    filled anything, the inverse pair a toast uses and the ring a keyboard
    depends on: a ground or an ink the stylesheet has and the engine does not is
    a themed page keeping the stock color exactly where it matters most. */
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
    /* Ink is its own ring and its own mark: it already clears every page
    surface at the text target, so there is nothing nearer to solve toward. */
    tokens.push(token(
        "color-focus-ring",
        brand.map_or(primary.raw, |brand| focus_ring(brand, ctx)),
        Origin::Derived,
        ground,
    ));
    tokens.push(token(
        "color-brand-mark",
        brand.map_or(primary.raw, |brand| {
            brand_mark(brand, &ctx.surfaces.solved_against())
        }),
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
