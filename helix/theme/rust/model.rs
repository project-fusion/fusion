//! The surface model, ported from `src/model.ts`: what a color token is for,
//! and what lands on what.
//!
//! **This is the foundation the components are built on rather than a record of
//! what they currently do.** The alternative was to enumerate pairs by scanning
//! `helix/styled` for inks and grounds used together, and it is the wrong direction
//! twice over: it makes the guarantee a description of today's stylesheets, and
//! it means a component pairing two tokens nobody intended would teach the
//! engine that the pairing is legitimate. The model says what is intended, the
//! engine solves for it, and a stylesheet that departs from it is wrong.
//!
//! **It is data, and that is exactly why it is worth asserting against the
//! oracle.** Nothing here searches or rounds, so a port cannot drift by a float;
//! it drifts by a typo in a token name, which produces a pair that is solved for
//! a ground nobody paints or an ink nobody emits. Neither compiler would say a
//! word. The lists are dumped from the TypeScript and compared name for name.

use std::sync::LazyLock;

/// A surface something is painted on.
///
/// `bounded` is the interesting field. Contrast is measured against a known
/// ground, and some grounds are not knowable when the theme is derived: text
/// over a photograph, or a scrim over whatever the reader scrolled under it.
/// Those pairs come back `unverifiable`, which is not a softer failure and is
/// not folded into one.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Ground {
    /// False when what sits behind it cannot be known at derivation time.
    pub bounded: bool,
    pub name: String,
}

/// What a pair has to reach, and why the two are not one number.
///
/// Text answers to the theme's contrast target, 4.5 by default because that is
/// what WCAG 2.1 AA asks of body text and what the European Accessibility Act
/// points at. A component is a border, a ring or a mark that has to be *seen*
/// rather than read, which WCAG 1.4.11 puts at 3:1.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Contrast {
    Component,
    Text,
}

impl Contrast {
    /// The word the TypeScript writes, which is what the oracle compares.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Component => "component",
            Self::Text => "text",
        }
    }
}

/// Something painted on a ground.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Ink {
    pub contrast: Contrast,
    pub grounds: Vec<String>,
    pub name: String,
}

/// The page's own ladder, from furthest back to nearest front.
pub const PAGE_SURFACES: [&str; 5] = [
    "color-background",
    "color-surface",
    "color-surface-raised",
    "color-surface-overlay",
    "color-surface-sunken",
];

/// Tinted grounds a quiet badge or a selected row sits on.
pub const TINTS: [&str; 2] = ["color-primary-subtle", "color-accent-subtle"];

/// Filled grounds, every one of which carries `foreground-on-accent`.
///
/// **The hover states are grounds too.** A filled button under a pointer is a
/// different color with the same text on it, so an ink solved against the
/// resting fill alone leaves the hovered half unmeasured. Six families times two
/// states is twelve grounds.
pub const FILLS: [&str; 12] = [
    "color-accent-surface",
    "color-accent-surface-hover",
    "color-danger-surface",
    "color-danger-surface-hover",
    "color-info-surface",
    "color-info-surface-hover",
    "color-primary-surface",
    "color-primary-surface-hover",
    "color-success-surface",
    "color-success-surface-hover",
    "color-warning-surface",
    "color-warning-surface-hover",
];

/// The four severities, which are inks on the page and fills of their own.
pub const STATUSES: [&str; 4] = ["danger", "info", "success", "warning"];

/// `foreground-subtle` is deliberately absent, and the measurement is why.
///
/// #124 solved the two quiet inks against every light ground and found the
/// readable range supports one quiet readable step and not two: `muted` and
/// `subtle` land three hundredths apart and no rearrangement inside the range
/// separates them. Emitting it here would be the engine claiming to have solved
/// something already measured as unsolvable, so the stylesheet keeps its own and
/// the engine does not pretend.
pub const NOT_EMITTED: [&str; 1] = ["color-foreground-subtle"];

fn bounded(name: &str) -> Ground {
    Ground {
        bounded: true,
        name: name.to_owned(),
    }
}

fn unbounded(name: &str) -> Ground {
    Ground {
        bounded: false,
        name: name.to_owned(),
    }
}

pub static GROUNDS: LazyLock<Vec<Ground>> = LazyLock::new(|| {
    let mut grounds: Vec<Ground> = PAGE_SURFACES
        .iter()
        .chain(TINTS.iter())
        .chain(FILLS.iter())
        .map(|name| bounded(name))
        .collect();
    grounds.push(bounded("color-surface-inverse"));
    /* Not bounded, and this is the honest case rather than a placeholder. A
    caption over a photograph has whatever the photograph is behind it, and no
    derivation can know that. The mitigation is a scrim the component owns, and
    the engine's job is to say it did not measure this rather than to imply it
    did. */
    grounds.push(unbounded("color-surface-media"));
    /* The scrim itself, which `Video` paints its own controls over. Translucent
    by definition, so what is behind it is the video: unbounded for the same
    reason as the surface above. */
    grounds.push(unbounded("color-overlay"));
    /* A field's fill is a percentage of the foreground mixed toward transparent,
    so what is behind it is whatever the control was dropped onto: a page, a
    card, a raised panel, a tinted band. The ink over it is measured against the
    grounds it actually composites over, which are already in `PAGE_SURFACES`,
    and the well only shifts that by the 5% it carries. */
    grounds.push(unbounded("color-well"));
    grounds
});

fn owned(names: &[&str]) -> Vec<String> {
    names.iter().map(|name| (*name).to_owned()).collect()
}

pub static INKS: LazyLock<Vec<Ink>> = LazyLock::new(|| {
    let pages = owned(&PAGE_SURFACES);
    let mut inks = vec![
        Ink {
            contrast: Contrast::Text,
            grounds: [
                pages.clone(),
                owned(&TINTS),
                owned(&["color-overlay", "color-well"]),
            ]
            .concat(),
            name: "color-foreground".to_owned(),
        },
        Ink {
            contrast: Contrast::Text,
            grounds: pages.clone(),
            name: "color-foreground-muted".to_owned(),
        },
        Ink {
            contrast: Contrast::Text,
            grounds: owned(&FILLS),
            name: "color-foreground-on-accent".to_owned(),
        },
        Ink {
            contrast: Contrast::Text,
            grounds: owned(&["color-surface-inverse"]),
            name: "color-foreground-inverse".to_owned(),
        },
        Ink {
            contrast: Contrast::Text,
            grounds: owned(&["color-surface-media"]),
            name: "color-foreground-media".to_owned(),
        },
        Ink {
            contrast: Contrast::Text,
            grounds: [pages.clone(), owned(&["color-primary-subtle"])].concat(),
            name: "color-primary".to_owned(),
        },
        Ink {
            contrast: Contrast::Text,
            grounds: [pages.clone(), owned(&["color-accent-subtle"])].concat(),
            name: "color-accent".to_owned(),
        },
    ];
    inks.extend(STATUSES.iter().map(|status| Ink {
        contrast: Contrast::Text,
        grounds: pages.clone(),
        name: format!("color-{status}"),
    }));
    /* The quiet ink of each tone, on the page ladder alone, like the neutral
    quiet ink: a muted line is running text, not a badge on a tint. */
    inks.extend(
        ["primary", "accent"]
            .iter()
            .chain(STATUSES.iter())
            .map(|tone| Ink {
                contrast: Contrast::Text,
                grounds: pages.clone(),
                name: format!("color-{tone}-muted"),
            }),
    );
    /* A ring has to be seen rather than read, so 3:1 under WCAG 1.4.11 and not
    the text target. It is in the model at all because it is the one mark whose
    absence makes a keyboard unusable. */
    inks.push(Ink {
        contrast: Contrast::Component,
        grounds: pages.clone(),
        name: "color-focus-ring".to_owned(),
    });
    /* **The one place the brand appears as itself.** Everywhere else it is
    solved: `primary` moves its lightness to clear 4.5 as text, and
    `primary-surface` moves further still to carry white on a fill. A mark is
    neither, and under WCAG 1.4.11 a graphic answers to 3:1, so it can sit far
    closer to the color the consumer actually typed. Which is also what makes it
    worth a token rather than a reuse of `primary`: a reader who picks a bright
    yellow and sees olive buttons has no way to find their own color anywhere on
    the page otherwise. */
    inks.push(Ink {
        contrast: Contrast::Component,
        grounds: pages,
        name: "color-brand-mark".to_owned(),
    });
    inks
});
