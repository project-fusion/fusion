//! A component built on a headless one registers everything it renders, under
//! its own prefix.
//!
//! **The failure the headless-tier guide opens with.** A headless component
//! renders other families with an interpolated tag, `acme-listbox` for a class
//! whose `tier` is `acme-`, and nothing registers that tag for you. Register
//! `acme-combobox` without `acme-listbox` and the panel renders an undefined
//! element: an inert inline box, no error, and a combobox that seems not to
//! open. A subclass that never sets `tier` renders Helix's own children
//! instead, which `tier` reports.
//!
//! **What a Helix class renders is read from its package's manifest**, the
//! `helix.renders` each tier publishes, and followed through each child in
//! turn: Combobox renders Listbox, and Listbox renders Option. The tags a
//! project registers are read from its own sources, an `@customElement` or a
//! `customElements.define` with a literal name.

use crate::component::text::line_of;
use crate::component::{Context, Finding, Report};

pub fn run(context: &Context) -> Report {
    let mut findings = Vec::new();
    let mut checked = 0;
    let unit = "components built on a Helix one";

    let Some(installed) = context.installed() else {
        return Report {
            checked,
            findings,
            notes: vec!["no Helix package's manifest in node_modules, so what a Helix class renders is unknown".to_owned()],
            unit,
        };
    };
    let project = context.project();

    for extension in &project.extensions {
        /* The headless tier's own classes keep its prefix on purpose. Every
        other class, Helix's styled tier included, renders under the prefix it
        sets. */
        if installed
            .classes
            .get(&extension.class)
            .is_some_and(|one| one.package == "@fusion.dev/helix-headless")
        {
            continue;
        }
        let (base, tier) = project.grounded(extension, context.installed());
        let children = installed.renders(base);
        /* With no prefix the children are Helix's own, which `tier` reports. */
        let Some(prefix) = tier.filter(|_| !children.is_empty()) else {
            continue;
        };
        checked += 1;
        let module = &project.modules[extension.module];
        let line = line_of(&module.text, extension.at);
        for child in &children {
            let tag = format!("{prefix}{child}");
            if project.defined.contains_key(&tag) {
                continue;
            }
            findings.push(Finding {
                detail: format!(
                    "{base} renders `<{tag}>` with the prefix {} sets, and an unregistered custom element is an inert inline box with no error. Subclass the Helix {child} and register it as `{tag}`.",
                    extension.class
                ),
                file: format!("{}:{line}", context.relative(&module.path)),
                message: format!(
                    "{} renders `<{tag}>`, which nothing in the project registers",
                    extension.class
                ),
            });
        }
    }

    Report {
        checked,
        findings,
        notes: Vec::new(),
        unit,
    }
}
