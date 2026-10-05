//! Defaults, validation and the chroma policy: everything that happens before a
//! color is solved.
//!
//! The chroma policy is a value passed along rather than a function in scope,
//! because almost every phase downstream applies it.

use crate::derive::Cast;
use crate::intent::{
    to_oklch, Background, Brand, Chroma, Color, Font, Material, Motion, Neutral, PairingRequest,
    Scheme, Seed, Separation, Status, StatusSeed, ThemeIntent, STATUS_NAMES,
};
use crate::model::{Contrast, INKS};
use crate::oklch::{fit_to_gamut, shipped_contrast_ratio, Oklch, GAMUT_STEPS};

/// Why an intent was refused.
///
/// **`violations` is the only safety mechanism this module has, and it fails
/// *open* on non-finite numbers**: every `ratio < target` comparison against
/// `NaN` is false, so a theme derived from a `NaN` brand passes every check and
/// emits `#000000` everywhere. Bad input has to be rejected rather than
/// confidently approved.
///
/// The TypeScript throws `TypeError` for the first and `RangeError` for the
/// second. A `Result` here, because a library that panics on a value a consumer
/// typed is a library that decides how its caller handles bad input.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum IntentError {
    /// A number that is not a number, which is what fails open.
    NotFinite { label: String, value: String },
    /// A number outside the range it is meaningful in.
    OutOfRange { label: String, message: String },
    /// A color that is not one. The TypeScript carried `NaN` components here.
    Unreadable { label: String, value: String },
}

impl std::fmt::Display for IntentError {
    fn fmt(&self, out: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFinite { label, value } => {
                write!(out, "{label} must be a finite number, received {value}")
            }
            Self::OutOfRange { label, message } => write!(out, "{label} {message}"),
            Self::Unreadable { label, value } => {
                write!(
                    out,
                    "{label} is not a color this engine can read, received {value}"
                )
            }
        }
    }
}

impl std::error::Error for IntentError {}

/// The chroma policy, applied to everything this engine derives and to nothing
/// it is handed. A pinned color is a fact about the brand; a derived one is
/// this palette's opinion, and the policy is what that opinion is.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Policy {
    ceiling: f64,
    scale: f64,
}

impl Policy {
    /// `ceiling` absent is no ceiling, which the TypeScript writes as
    /// `Number.POSITIVE_INFINITY` and this writes the same way so the clamp
    /// below needs no branch.
    #[must_use]
    pub fn new(chroma: Chroma) -> Self {
        Self {
            ceiling: chroma.ceiling.unwrap_or(f64::INFINITY),
            scale: chroma.scale.unwrap_or(1.0),
        }
    }

    /// `max(0, min(ceiling, chroma * scale))`, in that order.
    ///
    /// Rust's `min` and `max` differ from JavaScript's on `NaN`: theirs
    /// propagate it and these return the other operand. It cannot arise, because
    /// [`resolve`] rejects a non-finite ceiling, scale or brand before anything
    /// reaches here, and that ordering is the reason it does.
    #[must_use]
    pub fn apply(self, chroma: f64) -> f64 {
        (chroma * self.scale).min(self.ceiling).max(0.0)
    }
}

/// An intent with every default filled in.
#[derive(Clone, Debug, PartialEq)]
pub struct Resolved {
    /// `None` when nobody named one, and that is not a missing default: an
    /// accent nobody named is the brand, so there is no seed to fill in.
    pub accent: Option<Seed>,
    pub background: Background,
    /// The brand for the scheme being derived. `None` when the intent names none
    /// for it, which makes the theme ink.
    pub brand: Option<Color>,
    pub chroma: Chroma,
    pub contrast_target: f64,
    pub density: f64,
    pub font: Font,
    pub material: Material,
    pub motion: Motion,
    pub namespace: String,
    pub neutral: Neutral,
    pub pairings: Vec<PairingRequest>,
    pub radius: f64,
    pub scheme: Scheme,
    pub separation: Separation,
    pub status: Status,
    pub tokens: Vec<(String, Color)>,
}

/// The pairs a theme is checked against, derived from the surface model.
///
/// **A hand-written list is a claim about the pairs on it rather than about a
/// theme.** A tag on a raised card, a hovered filled button, every status fill
/// and the focus ring go unmeasured, and an omission is not something reading
/// the list can show.
///
/// Derived, so adding a ground to an ink in the model adds its pairs everywhere
/// at once and there is no second place to remember.
#[must_use]
pub fn default_pairings(contrast_target: f64) -> Vec<PairingRequest> {
    INKS.iter()
        .flat_map(|ink| {
            ink.grounds.iter().map(move |ground| PairingRequest {
                background: ground.clone(),
                foreground: ink.name.clone(),
                /* A component mark answers to WCAG 1.4.11 at 3:1 rather than to
                the body text target, and pinning it to 3 rather than scaling it
                with `contrast_target` is deliberate: raising a theme to AAA
                raises what its text must reach, not what the specification asks
                of a ring. */
                target: if ink.contrast == Contrast::Component {
                    3.0
                } else {
                    contrast_target
                },
            })
        })
        .collect()
}

/// The defaults, and the one that is computed rather than constant.
///
/// `pairings` derives from the target the caller asked for, so a theme at AAA
/// checks its text against AAA rather than against the default the list was
/// built with. A constant could not have done that.
#[must_use]
pub fn defaults(intent: &ThemeIntent) -> Resolved {
    let contrast_target = intent.contrast_target.unwrap_or(4.5);
    let scheme = intent.scheme.unwrap_or_default();
    Resolved {
        /* **Unnamed, the accent is the brand, not a rotation off it.** The
        complement shipped here and in the stylesheet, and the stylesheet
        dropped it for reasons measured there: 180 degrees is the worst angle
        on the shipping seed, three from `warning`, and near hue 0 a complement
        at the brand's lightness cannot clear AA. The engine kept it, so
        `derive({ brand })` drew `tone="accent"` in a color the same page
        without a theme did not. A relation to the brand at 0 degrees is not
        the same thing either, since `settle` would rotate it out of the
        brand's way and hand back a near miss. */
        accent: intent.accent.clone(),
        background: intent.background.clone().unwrap_or_default(),
        brand: intent
            .brand
            .as_ref()
            .and_then(|brand| brand.for_scheme(scheme))
            .cloned(),
        chroma: intent.chroma.unwrap_or_default(),
        contrast_target,
        density: intent.density.unwrap_or(1.0),
        font: intent.font.clone().unwrap_or_default(),
        material: intent.material.unwrap_or_default(),
        motion: intent.motion.unwrap_or_default(),
        namespace: intent
            .namespace
            .clone()
            .unwrap_or_else(|| "helix".to_owned()),
        neutral: intent.neutral.unwrap_or_default(),
        pairings: intent
            .pairings
            .clone()
            .unwrap_or_else(|| default_pairings(contrast_target)),
        radius: intent.radius.unwrap_or(0.5),
        scheme,
        separation: intent.separation.unwrap_or_default(),
        status: intent.status.clone().unwrap_or_default(),
        tokens: intent.tokens.clone().unwrap_or_default(),
    }
}

fn finite(label: &str, value: f64) -> Result<(), IntentError> {
    if value.is_finite() {
        return Ok(());
    }
    Err(IntentError::NotFinite {
        label: label.to_owned(),
        value: format!("{value}"),
    })
}

fn range(label: &str, message: &str) -> IntentError {
    IntentError::OutOfRange {
        label: label.to_owned(),
        message: message.to_owned(),
    }
}

/// Fills in the defaults and refuses an intent that would silently produce a
/// theme reporting no violations.
///
/// # Errors
///
/// [`IntentError`] when a number is not finite, when one is outside the range it
/// is meaningful in, or when the brand is not a color this engine can read.
pub fn resolve(intent: &ThemeIntent) -> Result<Resolved, IntentError> {
    let resolved = defaults(intent);
    readable_brands(intent.brand.as_ref())?;
    finite("contrastTarget", resolved.contrast_target)?;
    finite("density", resolved.density)?;
    finite("radius", resolved.radius)?;
    /* 1 is "no contrast at all" and 21 is black on white. Anything outside that
    is not a target, it is a typo. */
    if !(1.0..=21.0).contains(&resolved.contrast_target) {
        return Err(range("contrastTarget", "must be between 1 and 21"));
    }
    if resolved.density <= 0.0 {
        return Err(range("density", "must be positive"));
    }
    if resolved.radius < 0.0 {
        return Err(range("radius", "must not be negative"));
    }

    /* The chroma policy gets the same guard for the same reason as everything
    above: a `NaN` ceiling makes every clamp against it return `NaN`, which
    produces a palette of `#000000` that reports no violations. */
    if let Some(ceiling) = resolved.chroma.ceiling {
        finite("chroma.ceiling", ceiling)?;
        if ceiling < 0.0 {
            return Err(range("chroma.ceiling", "must not be negative"));
        }
    }
    if let Some(scale) = resolved.chroma.scale {
        finite("chroma.scale", scale)?;
        if scale < 0.0 {
            return Err(range("chroma.scale", "must not be negative"));
        }
    }
    /* **A pinned status that cannot be read is refused here rather than ignored
    later.** Falling through and deriving the status instead is quieter and no
    better: a consumer who pinned a color and got a computed one back is never
    told. The brand is validated for the same reason two dozen lines up. */
    for name in STATUS_NAMES {
        if let Some(StatusSeed::Color(color)) = resolved.status.seed(name) {
            if to_oklch(color).is_none() {
                return Err(IntentError::Unreadable {
                    label: format!("status.{name}"),
                    value: color.to_string(),
                });
            }
        }
    }

    /* And a pinned accent, for the same reason: an unreadable color carries a
    `NaN` triple that `violations` compares against, every comparison is false,
    and the theme reports clean. Three seeds can be handed a color and all three
    are checked here, which is what makes the `expect` in each phase downstream a
    statement about this function rather than an assumption about its caller. */
    if let Some(Seed::Color(color)) = &resolved.accent {
        if to_oklch(color).is_none() {
            return Err(IntentError::Unreadable {
                label: "accent".to_owned(),
                value: color.to_string(),
            });
        }
    }

    /* **An accent related to a brand that is not there is refused.** Ink has no
    hue, so the angle would be measured from a direction that does not exist,
    and the accent would land wherever `atan2` happened to put a gray. */
    if matches!(resolved.accent, Some(Seed::Relation(_))) && resolved.brand.is_none() {
        return Err(range(
            "accent",
            "is related to the brand, and this theme names none for this scheme. Name the accent as a color",
        ));
    }

    /* **A page is refused where no ink can be read on it**, which is the one
    bound that is not a number somebody chose: black on a light page and white
    on a dark one are the strongest inks there are, so where they miss the
    target every ink does. Each page against its own scheme, so a dark color
    given for the light page is refused whichever scheme is derived. */
    for scheme in [Scheme::Light, Scheme::Dark] {
        let Some(color) = resolved.background.for_scheme(scheme) else {
            continue;
        };
        let label = match scheme {
            Scheme::Dark => "background.dark",
            Scheme::Light => "background.light",
        };
        let page = to_oklch(color).ok_or_else(|| IntentError::Unreadable {
            label: label.to_owned(),
            value: color.to_string(),
        })?;
        finite(&format!("{label}.lightness"), page.lightness)?;
        finite(&format!("{label}.chroma"), page.chroma)?;
        finite(&format!("{label}.hue"), page.hue)?;
        let ink = strongest_ink(scheme);
        let ratio = shipped_contrast_ratio(ink, fit_to_gamut(page, GAMUT_STEPS));
        if ratio < resolved.contrast_target {
            let ink_name = match scheme {
                Scheme::Dark => "white",
                Scheme::Light => "black",
            };
            return Err(range(
                label,
                &format!(
                    "leaves no ink that reaches the contrast target of {target}: {ink_name}, the strongest, reaches {ratio:.2} on it",
                    target = resolved.contrast_target,
                ),
            ));
        }
    }

    if let Some(allowance) = resolved.status.allowance {
        finite("status.allowance", allowance)?;
        if !(0.0..=180.0).contains(&allowance) {
            return Err(range(
                "status.allowance",
                "must be between 0 and 180 degrees",
            ));
        }
    }

    Ok(resolved)
}

/// Refuses every brand color given that cannot be read, whichever scheme is
/// derived.
///
/// **Both halves of a pair, as every page is in [`resolve`]**: a pair whose
/// dark half cannot be read is refused on a light derive too, so the file is
/// fixed before the half that fails is ever reached.
fn readable_brands(brand: Option<&Brand>) -> Result<(), IntentError> {
    match brand {
        Some(Brand::One(color)) => readable_brand("brand", color),
        Some(Brand::Each(pair)) => {
            for (label, color) in [("brand.light", &pair.light), ("brand.dark", &pair.dark)] {
                if let Some(color) = color {
                    readable_brand(label, color)?;
                }
            }
            Ok(())
        }
        None => Ok(()),
    }
}

/// Refuses a brand that is not a color, or one whose numbers are not numbers,
/// named by where it was given: `brand`, or `brand.light` and `brand.dark`.
fn readable_brand(label: &str, color: &Color) -> Result<(), IntentError> {
    let brand = to_oklch(color).ok_or_else(|| IntentError::Unreadable {
        label: label.to_owned(),
        value: color.to_string(),
    })?;

    finite(&format!("{label}.chroma"), brand.chroma)?;
    finite(&format!("{label}.hue"), brand.hue)?;
    finite(&format!("{label}.lightness"), brand.lightness)?;

    if brand.chroma < 0.0 {
        return Err(range(&format!("{label}.chroma"), "must not be negative"));
    }
    if !(0.0..=1.0).contains(&brand.lightness) {
        return Err(range(
            &format!("{label}.lightness"),
            "must be between 0 and 1",
        ));
    }
    Ok(())
}

/// The strongest ink a scheme has: black in light and white in dark.
#[must_use]
pub fn strongest_ink(scheme: Scheme) -> Oklch {
    Oklch {
        chroma: 0.0,
        hue: 0.0,
        lightness: if scheme == Scheme::Dark { 1.0 } else { 0.0 },
    }
}

/// The page given for the scheme being derived, where one is.
///
/// # Panics
///
/// If handed a [`Resolved`] whose page is unreadable, which [`resolve`]
/// refuses, so one cannot be built through it.
#[must_use]
pub fn page(resolved: &Resolved) -> Option<Oklch> {
    resolved
        .background
        .for_scheme(resolved.scheme)
        .map(|color| to_oklch(color).expect("resolve refused an unreadable page"))
}

/// The hue the neutral takes when there is no brand to take one from, which is
/// the hue the stylesheet's own `--helix-seed-neutral-hue` falls back to. At the
/// default chroma of 0 it changes no color, and it is the seed written out.
pub const INK_HUE: f64 = 258.0;

/// The brand as the consumer wrote it, and with the chroma policy applied, or
/// `None` for ink.
///
/// # Panics
///
/// If handed a [`Resolved`] whose brand is unreadable, which [`resolve`] refuses
/// and so cannot be constructed through it. Taking a `Resolved` rather than a
/// `ThemeIntent` is what makes that guarantee: the validation is the only way in.
#[must_use]
pub fn brand(resolved: &Resolved, policy: Policy) -> Option<(Oklch, Oklch)> {
    let raw = to_oklch(resolved.brand.as_ref()?).expect("resolve refused an unreadable brand");
    Some((
        raw,
        Oklch {
            chroma: policy.apply(raw.chroma),
            ..raw
        },
    ))
}

/// The neutral cast.
///
/// It takes the brand's hue when it is given none, and [`INK_HUE`] where there
/// is no brand either.
#[must_use]
pub fn neutral(resolved: &Resolved, policy: Policy) -> Cast {
    let hue = brand(resolved, policy).map_or(INK_HUE, |(_, brand)| brand.hue);
    /* Chroma 0 by default, which is what `primitives.css` settled on: a fixed
    chroma is a rising saturation as a surface darkens, and 0.008 reads navy
    across a dark page. */
    match (page(resolved), resolved.neutral.chroma) {
        /* **A page given, the grays take its cast**, so a cream page has warm
        cards on it where a gray card would read as a hole. Its own chroma and
        hue, and the chroma policy left out: the page is a color handed in,
        which the policy never touches, and the grays drawn from it have to
        match it. `neutral` still wins where it says anything. */
        (Some(page), None) => Cast {
            chroma: page.chroma,
            hue: resolved.neutral.hue.unwrap_or(page.hue),
        },
        (_, chroma) => Cast {
            chroma: policy.apply(chroma.unwrap_or(0.0)),
            hue: resolved.neutral.hue.unwrap_or(hue),
        },
    }
}
