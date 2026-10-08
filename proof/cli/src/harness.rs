//! The document an HTML entry is pictured in.
//!
//! **Each line here is a lesson, and each was learned from a picture that
//! lied.**
//!
//! - **The stylesheets come before the harness style.** A design system's sheet
//!   may set `color-scheme` and a `body` background at the same specificity as
//!   the harness, so source order decides. Linked last, the page's own scheme
//!   and ground took over.
//! - **The scheme is declared here as well as emulated by the driver.** Emulated
//!   only, 182 dark pictures were the light rendering under a dark name, because
//!   a page declaring `color-scheme: light` beats a preference. Declared only, a
//!   page whose own sheet declares `light dark` asks the preference, and the
//!   pictures were light renderings on black.
//! - **The ground and the ink are both set.** A page with no stylesheet takes
//!   the user agent's ink, and headless Chromium kept it black in dark: the
//!   first dark retake wrote 8 pictures in a single color.
//! - **Scripts load with `defer`.** Loaded eagerly, a component upgraded before
//!   the data element after it existed and rendered nothing.
//!
//! **The harness style carries an id**, so the driver can rewrite it for the
//! next shot on the same page: one navigation per entry for every shot.

use std::fmt::Write as _;

use crate::config::{Harness, Shot};

/// The `id` of the harness's own `<style>`, which the driver rewrites between
/// shots.
pub const STYLE_ID: &str = "proof-harness";

/// The harness rules for one shot: the declared scheme, a fixed ground and ink,
/// an inset so a component drawing to its own edge is not cropped, and the
/// shot's width on `body`.
pub fn css(harness: &Harness, shot: &Shot) -> String {
    let scheme = shot.scheme;
    format!(
        ":root{{color-scheme:{}}}body{{margin:0;padding:{}px;background:{};color:{};width:{}px;box-sizing:border-box}}",
        scheme.as_str(),
        harness.padding,
        harness.ground.for_scheme(scheme),
        harness.ink.for_scheme(scheme),
        shot.width
    )
}

/// The document for one entry, styled for its first shot.
pub fn document(
    title: &str,
    styles: &[String],
    scripts: &[String],
    harness: Option<&str>,
    body: &str,
) -> String {
    let mut out = String::from("<!doctype html><meta charset=\"utf-8\"><title>");
    out.push_str(&escape(title));
    out.push_str("</title>");
    for href in styles {
        let _ = write!(out, "<link rel=\"stylesheet\" href=\"{}\">", escape(href));
    }
    if let Some(rules) = harness {
        let _ = write!(out, "<style id=\"{STYLE_ID}\">{rules}</style>");
    }
    for src in scripts {
        let _ = write!(out, "<script defer src=\"{}\"></script>", escape(src));
    }
    out.push_str(body);
    out
}

fn escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Scheme;

    fn shot(width: u32, scheme: Scheme) -> Shot {
        serde_json::from_value(serde_json::json!({
            "name": "s", "width": width, "scheme": scheme.as_str()
        }))
        .unwrap()
    }

    /// Character for character what Fusion's `check-visual.mjs` wrote, which
    /// is what its 609 baselines were taken under.
    #[test]
    fn the_harness_is_the_one_the_baselines_were_taken_under() {
        assert_eq!(
            css(&Harness::default(), &shot(640, Scheme::Light)),
            ":root{color-scheme:light}body{margin:0;padding:24px;background:#fff;color:#000;width:640px;box-sizing:border-box}"
        );
        assert_eq!(
            css(&Harness::default(), &shot(390, Scheme::Dark)),
            ":root{color-scheme:dark}body{margin:0;padding:24px;background:#000;color:#fff;width:390px;box-sizing:border-box}"
        );
    }

    #[test]
    fn stylesheets_come_first_and_scripts_are_deferred() {
        let page = document(
            "styled/card",
            &["/frame.css".to_string()],
            &["/frame.js".to_string()],
            Some("body{}"),
            "<helix-card></helix-card>",
        );
        assert_eq!(
            page,
            "<!doctype html><meta charset=\"utf-8\"><title>styled/card</title>\
             <link rel=\"stylesheet\" href=\"/frame.css\">\
             <style id=\"proof-harness\">body{}</style>\
             <script defer src=\"/frame.js\"></script><helix-card></helix-card>"
        );
    }
}
