//! Defaults, validation and the chroma policy: everything that happens before a
//! colour is solved.
//!
//! This was the first forty lines of `deriveTheme` and three helpers beside it.
//! Pulling it out makes one thing explicit that the closure hid: the policy is
//! captured by almost every phase downstream, so it is a value passed along
//! rather than a function that happens to be in scope.

use crate::derive::Cast;
use crate::intent::{
    to_oklch, Chroma, Color, Font, From, Material, Motion, Neutral, PairingRequest, Relation,
    Scheme, Seed, Separation, Status, StatusSeed, ThemeIntent, STATUS_NAMES,
};
use crate::model::{Contrast, INKS};
use crate::oklch::Oklch;

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
    /// A colour that is not one. The TypeScript carried `NaN` components here.
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
                    "{label} is not a colour this engine can read, received {value}"
                )
            }
        }
    }
}

impl std::error::Error for IntentError {}

/// The chroma policy, applied to everything this engine derives and to nothing
/// it is handed. A pinned colour is a fact about the brand; a derived one is
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
    pub accent: Seed,
    pub brand: Color,
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
/// **This replaced ten hand-written pairs, which were a claim about ten pairs
/// rather than about a theme.** A tag on a raised card, a hovered filled button,
/// every status fill and the focus ring were all unmeasured, and none of them
/// was ever going to be noticed by reading a list that did not mention them.
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
    Resolved {
        accent: intent.accent.clone().unwrap_or(Seed::Relation(Relation {
            allowance: None,
            chroma: None,
            from: From::Brand,
            rotate: 180.0,
        })),
        brand: intent.brand.clone(),
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
        scheme: intent.scheme.unwrap_or_default(),
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
/// is meaningful in, or when the brand is not a colour this engine can read.
pub fn resolve(intent: &ThemeIntent) -> Result<Resolved, IntentError> {
    let resolved = defaults(intent);
    let brand = to_oklch(&resolved.brand).ok_or_else(|| IntentError::Unreadable {
        label: "brand".to_owned(),
        value: resolved.brand.to_string(),
    })?;

    finite("brand.chroma", brand.chroma)?;
    finite("brand.hue", brand.hue)?;
    finite("brand.lightness", brand.lightness)?;
    finite("contrastTarget", resolved.contrast_target)?;
    finite("density", resolved.density)?;
    finite("radius", resolved.radius)?;

    if brand.chroma < 0.0 {
        return Err(range("brand.chroma", "must not be negative"));
    }
    if !(0.0..=1.0).contains(&brand.lightness) {
        return Err(range("brand.lightness", "must be between 0 and 1"));
    }
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
    later.** The TypeScript carried the `NaN` triple into the palette; the port
    would have fallen through and derived the status instead, which is quieter
    and no better: a consumer who pinned a colour and got a computed one back was
    never told. The brand is validated for the same reason two dozen lines up. */
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

    /* And a pinned accent, for the same reason and by the same reading: the
    TypeScript carries the `NaN` triple, `violations` compares against it and
    every comparison is false, so the theme reports clean. Three seeds can be
    handed a colour and all three are checked here, which is what makes the
    `expect` in each phase downstream a statement about this function rather
    than an assumption about its caller. */
    if let Seed::Color(color) = &resolved.accent {
        if to_oklch(color).is_none() {
            return Err(IntentError::Unreadable {
                label: "accent".to_owned(),
                value: color.to_string(),
            });
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

/// The brand, with the policy applied, and the neutral cast derived from it.
///
/// Together because the neutral takes the brand's hue when it is given none, so
/// the two are one step rather than two that happen to run in order.
///
/// # Panics
///
/// If handed a [`Resolved`] whose brand is unreadable, which [`resolve`] refuses
/// and so cannot be constructed through it. Taking a `Resolved` rather than a
/// `ThemeIntent` is what makes that guarantee: the validation is the only way in.
#[must_use]
pub fn brand_and_neutral(resolved: &Resolved, policy: Policy) -> (Oklch, Oklch, Cast) {
    let raw = to_oklch(&resolved.brand).expect("resolve refused an unreadable brand");
    let brand = Oklch {
        chroma: policy.apply(raw.chroma),
        ..raw
    };
    /* Chroma 0 by default, which is what `primitives.css` settled on and wrote
    down: a fixed chroma is a rising saturation as a surface darkens, so the
    0.008 this engine used to hardcode read navy across a dark page. The two
    files disagreed on the value and nothing compared them. */
    let neutral = Cast {
        chroma: policy.apply(resolved.neutral.chroma.unwrap_or(0.0)),
        hue: resolved.neutral.hue.unwrap_or(brand.hue),
    };
    (raw, brand, neutral)
}
