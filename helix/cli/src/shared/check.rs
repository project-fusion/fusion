//! One module, read for what only the web has.
//!
//! **Parsed with oxc, as `helix scan` reads a module**, so `{a < b}` is never
//! read as a tag. A finding names what only the web has and what a page that
//! runs on both writes in its place.

use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Expression, IdentifierReference, ImportDeclaration, JSXAttribute, JSXAttributeItem,
    JSXAttributeName, JSXAttributeValue, JSXElementName, JSXOpeningElement, ObjectPropertyKind,
    PropertyKey,
};
use oxc_ast_visit::{walk, Visit};
use oxc_parser::Parser;
use oxc_span::SourceType;

use super::platforms::{key, Platforms};

/// One thing only the web has, where the module writes it.
#[derive(Debug, PartialEq, Eq)]
pub struct Finding {
    pub line: usize,
    pub column: usize,
    /// What kind of web-only code it is, such as `dom-element`.
    pub kind: &'static str,
    pub message: String,
}

/// The browser's globals, which a phone does not have.
const GLOBALS: [&str; 7] = [
    "customElements",
    "document",
    "getComputedStyle",
    "localStorage",
    "sessionStorage",
    "ShadowRoot",
    "window",
];

/// The style properties React Native takes. Any other is the web's alone.
const NATIVE_STYLE: &[&str] = &[
    "alignContent",
    "alignItems",
    "alignSelf",
    "aspectRatio",
    "backfaceVisibility",
    "backgroundColor",
    "blockSize",
    "borderBlockColor",
    "borderBlockEndColor",
    "borderBlockStartColor",
    "borderBottomColor",
    "borderBottomEndRadius",
    "borderBottomLeftRadius",
    "borderBottomRightRadius",
    "borderBottomStartRadius",
    "borderBottomWidth",
    "borderColor",
    "borderCurve",
    "borderEndColor",
    "borderEndEndRadius",
    "borderEndStartRadius",
    "borderEndWidth",
    "borderLeftColor",
    "borderLeftWidth",
    "borderRadius",
    "borderRightColor",
    "borderRightWidth",
    "borderStartColor",
    "borderStartEndRadius",
    "borderStartStartRadius",
    "borderStartWidth",
    "borderStyle",
    "borderTopColor",
    "borderTopEndRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderTopStartRadius",
    "borderTopWidth",
    "borderWidth",
    "bottom",
    "boxShadow",
    "boxSizing",
    "color",
    "columnGap",
    "cursor",
    "direction",
    "display",
    "elevation",
    "end",
    "filter",
    "flex",
    "flexBasis",
    "flexDirection",
    "flexGrow",
    "flexShrink",
    "flexWrap",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "gap",
    "height",
    "includeFontPadding",
    "inset",
    "insetBlock",
    "insetBlockEnd",
    "insetBlockStart",
    "insetInline",
    "insetInlineEnd",
    "insetInlineStart",
    "isolation",
    "inlineSize",
    "justifyContent",
    "left",
    "letterSpacing",
    "lineHeight",
    "margin",
    "marginBlock",
    "marginBlockEnd",
    "marginBlockStart",
    "marginBottom",
    "marginEnd",
    "marginHorizontal",
    "marginInline",
    "marginInlineEnd",
    "marginInlineStart",
    "marginLeft",
    "marginRight",
    "marginStart",
    "marginTop",
    "marginVertical",
    "maxBlockSize",
    "maxHeight",
    "maxInlineSize",
    "maxWidth",
    "minBlockSize",
    "minHeight",
    "minInlineSize",
    "minWidth",
    "mixBlendMode",
    "objectFit",
    "opacity",
    "outlineColor",
    "outlineOffset",
    "outlineStyle",
    "outlineWidth",
    "overflow",
    "overlayColor",
    "padding",
    "paddingBlock",
    "paddingBlockEnd",
    "paddingBlockStart",
    "paddingBottom",
    "paddingEnd",
    "paddingHorizontal",
    "paddingInline",
    "paddingInlineEnd",
    "paddingInlineStart",
    "paddingLeft",
    "paddingRight",
    "paddingStart",
    "paddingTop",
    "paddingVertical",
    "pointerEvents",
    "position",
    "resizeMode",
    "right",
    "rowGap",
    "shadowColor",
    "shadowOffset",
    "shadowOpacity",
    "shadowRadius",
    "start",
    "textAlign",
    "textAlignVertical",
    "textDecorationColor",
    "textDecorationLine",
    "textDecorationStyle",
    "textShadowColor",
    "textShadowOffset",
    "textShadowRadius",
    "textTransform",
    "tintColor",
    "top",
    "transform",
    "transformOrigin",
    "userSelect",
    "verticalAlign",
    "width",
    "writingDirection",
    "zIndex",
];

/// The stylesheet languages an import can name.
const SHEETS: [&str; 5] = [".css", ".less", ".sass", ".scss", ".styl"];

/// Whether a file is meant for both platforms: any module whose name does not
/// end in a platform's extension, such as `.web.tsx` or `.native.tsx`.
pub fn shared(name: &str) -> bool {
    ![".web.", ".native.", ".ios.", ".android."]
        .iter()
        .any(|mark| name.contains(mark))
}

/// What only the web has in `text`, parsed as `kind` says. `None` where it does
/// not parse.
pub fn check(text: &str, kind: SourceType, platforms: &Platforms) -> Option<Vec<Finding>> {
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, text, kind).parse();
    if parsed.fatal_error {
        return None;
    }
    let mut reader = Reader {
        findings: Vec::new(),
        lines: text
            .bytes()
            .enumerate()
            .filter(|(_, byte)| *byte == b'\n')
            .map(|(at, _)| at)
            .collect(),
        platforms,
    };
    reader.visit_program(&parsed.program);
    reader
        .findings
        .sort_by_key(|finding| (finding.line, finding.column));
    Some(reader.findings)
}

struct Reader<'p> {
    findings: Vec<Finding>,
    lines: Vec<usize>,
    platforms: &'p Platforms,
}

impl Reader<'_> {
    fn add(&mut self, at: u32, kind: &'static str, message: String) {
        let line = self.lines.partition_point(|newline| *newline < at as usize);
        let start = if line == 0 {
            0
        } else {
            self.lines[line - 1] + 1
        };
        self.findings.push(Finding {
            column: at as usize - start + 1,
            kind,
            line: line + 1,
            message,
        });
    }

    /// One attribute on an element. `tag` is a Helix tag's name, or `None` on
    /// any other element.
    fn attribute(&mut self, attribute: &JSXAttribute<'_>, tag: Option<&str>) {
        let JSXAttributeName::Identifier(name) = &attribute.name else {
            return;
        };
        let at = attribute.span.start;
        let name = name.name.as_str();
        if name == "className" || name == "class" {
            self.add(at, "class-name", format!("`{name}` names a CSS class, which a phone does not have. Set a Helix element's own props."));
            return;
        }
        if name == "style" {
            self.style(attribute.value.as_ref(), at, tag);
            return;
        }
        let Some(tag) = tag.and_then(|tag| self.platforms.tags.get(tag).map(|one| (tag, one)))
        else {
            return;
        };
        let (tag, about) = tag;
        if let Some(event) = name
            .strip_prefix("on")
            .filter(|event| event.starts_with("helix-"))
        {
            if about.web_events.contains(event) {
                self.add(
                    at,
                    "web-only-event",
                    format!(
                        "`{tag}` sends `{event}` on the web alone. Hear it in a `.web.tsx` file."
                    ),
                );
            }
        } else if about.omitted.contains(&key(name)) {
            self.add(
                at,
                "web-only-prop",
                format!("`{name}` on `{tag}` is the web's alone. Set it in a `.web.tsx` file."),
            );
        }
    }

    /// A `style` attribute: a string is CSS, and an object's keys are checked
    /// against what React Native takes. A custom property is read on a phone
    /// where it is a hook of the Helix element it is set on.
    fn style(&mut self, value: Option<&JSXAttributeValue<'_>>, at: u32, tag: Option<&str>) {
        let expression = match value {
            Some(JSXAttributeValue::StringLiteral(_)) => {
                self.add(
                    at,
                    "web-style",
                    "`style` written as a string is CSS. Write a Helix element's props.".to_owned(),
                );
                return;
            }
            Some(JSXAttributeValue::ExpressionContainer(container)) => {
                container.expression.as_expression()
            }
            _ => None,
        };
        let Some(Expression::ObjectExpression(object)) = expression else {
            return;
        };
        for property in &object.properties {
            let ObjectPropertyKind::ObjectProperty(property) = property else {
                continue;
            };
            let name = match &property.key {
                PropertyKey::StaticIdentifier(name) => name.name.as_str(),
                PropertyKey::StringLiteral(name) => name.value.as_str(),
                _ => continue,
            };
            if name.starts_with("--") {
                let hook = tag
                    .and_then(|tag| self.platforms.tags.get(tag))
                    .is_some_and(|about| about.native && about.hooks.contains(name));
                if !hook {
                    let on = tag.map_or_else(
                        || "the element it is on".to_owned(),
                        |tag| format!("`{tag}`"),
                    );
                    self.add(property.span.start, "web-style", format!("`{name}` is not a hook of {on}, so a phone does not read it. Set it in a `.web.tsx` file, or set one of the element's own hooks."));
                }
            } else if !NATIVE_STYLE.contains(&name) {
                self.add(property.span.start, "web-style", format!("`{name}` is a style only the web has. Set it in a `.web.tsx` file, or use a Helix element's props."));
            }
        }
    }
}

/// The DOM elements a phone draws as the web does: a fieldset, which disables
/// the controls inside it, and a raw vector with its shapes.
const DRAWN_TAGS: &[&str] = &[
    "circle", "ellipse", "fieldset", "g", "legend", "line", "path", "polygon", "polyline", "rect",
    "svg",
];

impl<'a> Visit<'a> for Reader<'_> {
    fn visit_import_declaration(&mut self, it: &ImportDeclaration<'a>) {
        let source = it.source.value.as_str();
        if SHEETS.iter().any(|sheet| source.ends_with(sheet)) {
            self.add(it.span.start, "css-import", format!("`{source}` is a stylesheet, which a phone does not load. Import it from a `.web.tsx` file."));
        }
        walk::walk_import_declaration(self, it);
    }

    fn visit_identifier_reference(&mut self, it: &IdentifierReference<'a>) {
        let name = it.name.as_str();
        let element = name.starts_with("HTML") && name.ends_with("Element");
        if element || GLOBALS.contains(&name) {
            self.add(it.span.start, "dom-global", format!("`{name}` is the browser's, and a phone does not have it. Use it in a `.web.tsx` file."));
        }
    }

    fn visit_jsx_opening_element(&mut self, it: &JSXOpeningElement<'a>) {
        let tag = match &it.name {
            JSXElementName::Identifier(identifier) => Some(identifier.name.as_str()),
            _ => None,
        };
        let helix = tag.filter(|tag| tag.starts_with("helix-"));
        match (tag, helix) {
            (Some(tag), None) if DRAWN_TAGS.contains(&tag) => {}
            (Some(tag), None) => {
                self.add(it.span.start, "dom-element", format!("`<{tag}>` is a DOM element, which a phone does not draw. Use a Helix element, such as `helix-flex` for a box or `helix-text` for words."));
            }
            (_, Some(tag)) => match self.platforms.tags.get(tag) {
                Some(about) if !about.native => {
                    let family = about.family.clone();
                    self.add(it.span.start, "web-only-family", format!("{family} is drawn on the web alone. Use `<{tag}>` in a `.web.tsx` file."));
                }
                _ => {}
            },
            _ => {}
        }
        /* A component's own props, such as React Native's `style`, are its
        own business: only an element the page writes as a tag is judged. */
        let attributes = if tag.is_some() {
            &it.attributes[..]
        } else {
            &[]
        };
        for item in attributes {
            if let JSXAttributeItem::Attribute(attribute) = item {
                self.attribute(attribute, helix);
            }
        }
        walk::walk_jsx_opening_element(self, it);
    }
}
