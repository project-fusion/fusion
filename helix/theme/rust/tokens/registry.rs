//! Every token typed, with each declaration it reaches typed as the shape its
//! readers take it as, and each held to print back as it was written.

use std::collections::BTreeMap;

use super::builder::{self, Built};
use super::eval::{Evaluation, Fault, Mode, Value};
use super::expr::{Expr, Kind, Math, Op, Quantity, Shape};
use super::print;
use super::read::Reader;

/// A token's value as it is written: builder calls, as `tokens.ts` writes
/// them, or CSS, as a stylesheet does.
#[derive(Clone, Debug, PartialEq)]
pub enum Written {
    Builder(String),
    Css(String),
}

/// A value ready to read: builder calls already parsed, or CSS.
#[derive(Clone, Debug)]
enum Source {
    Built(Built),
    Css(String),
}

impl Source {
    fn read(&self, reader: &mut Reader, shape: Shape) -> Result<Expr, String> {
        match self {
            Self::Built(built) => reader.read_built(built, shape),
            Self::Css(text) => reader.read(text, shape),
        }
    }

    /// Whether this is the CSS `initial`, the guaranteed-invalid value.
    fn initial(&self) -> bool {
        matches!(self, Self::Css(text) if text.trim() == "initial")
    }
}

/// A declaration a reference names, as its shape reads it.
#[derive(Clone, Debug, PartialEq)]
pub enum Declared {
    /// Declared `initial`: the guaranteed-invalid value.
    Invalid,
    Typed(Expr),
}

/// One semantic token.
#[derive(Clone, Debug, PartialEq)]
pub struct Token {
    /// The name after `--helix-`, such as `color-foreground`.
    pub name: String,
    pub kind: Kind,
    pub expr: Expr,
    /// The value as CSS, which is what `tokens.css` declares.
    pub css: String,
}

/// The token layer, typed.
#[derive(Debug)]
pub struct Registry {
    typed: BTreeMap<(String, Shape), Declared>,
    tokens: Vec<Token>,
}

/// What each category's tokens are read as, in the order tried, and the kind
/// they must come out as where the category decides it. `leading` holds
/// multiples and one length, and `material` a color, a filter, lengths, and an
/// opacity, so for those two the value decides.
fn category(name: &str) -> Option<(&'static [Shape], Option<Kind>)> {
    let prefix = name.split('-').next().unwrap_or_default();
    Some(match prefix {
        "border" | "radii" | "size" | "space" | "text" | "tracking" => {
            (&[Shape::Quantity], Some(Kind::Length))
        }
        "color" | "scrollbar" => (&[Shape::Color], Some(Kind::Color)),
        "duration" => (&[Shape::Time], Some(Kind::Time)),
        "easing" => (&[Shape::Easing], Some(Kind::Easing)),
        "font" => (&[Shape::Families], Some(Kind::Family)),
        "layer" | "opacity" | "weight" => (&[Shape::Quantity], Some(Kind::Number)),
        "leading" => (&[Shape::Quantity], None),
        "material" => (&[Shape::Color, Shape::Filters, Shape::Quantity], None),
        "shadow" => (&[Shape::Shadow], Some(Kind::Shadow)),
        _ => return None,
    })
}

impl Registry {
    /// Types every token, `(name after --helix-, CSS value)` in their order,
    /// over the custom properties `declarations` holds, which are the
    /// primitives, the seeds and the modes.
    ///
    /// # Errors
    ///
    /// One sentence per token or declaration that cannot be typed, or whose
    /// typed form does not print back as it was written.
    pub fn new(
        declarations: &[(String, String)],
        tokens: &[(String, String)],
    ) -> Result<Self, Vec<String>> {
        let written: Vec<(String, Written)> = tokens
            .iter()
            .map(|(name, value)| (name.clone(), Written::Css(value.clone())))
            .collect();
        Self::written(declarations, &written)
    }

    /// Types every token, `(name after --helix-, value)` in their order, each
    /// written as builder calls or as CSS, over the custom properties
    /// `declarations` holds.
    ///
    /// # Errors
    ///
    /// One sentence per token or declaration that cannot be read or typed, or
    /// whose typed form does not print back as it was written.
    pub fn written(
        declarations: &[(String, String)],
        tokens: &[(String, Written)],
    ) -> Result<Self, Vec<String>> {
        let mut refusals = Vec::new();
        let mut sources: BTreeMap<String, Source> = declarations
            .iter()
            .map(|(name, value)| (name.clone(), Source::Css(value.clone())))
            .collect();
        let mut entries = Vec::new();
        for (name, written) in tokens {
            let source = match written {
                Written::Builder(text) => match builder::parse(text) {
                    Ok(built) => Source::Built(built),
                    Err(why) => {
                        refusals.push(format!("`--helix-{name}`: {why}"));
                        continue;
                    }
                },
                Written::Css(text) => Source::Css(text.clone()),
            };
            sources.insert(format!("--helix-{name}"), source.clone());
            entries.push((name, source));
        }
        let declared = |name: &str| sources.contains_key(name);
        let mut reader = Reader::new(&declared);
        let mut typed = BTreeMap::new();
        let mut read = Vec::new();
        for (name, source) in &entries {
            match first_reading(&mut reader, name, source) {
                Ok((expr, shape, expected)) => {
                    let key = (format!("--helix-{name}"), shape);
                    typed.insert(key, Declared::Typed(expr.clone()));
                    read.push((*name, source, expr, expected));
                }
                Err(why) => refusals.push(format!("`--helix-{name}`: {why}")),
            }
        }
        let pending = std::mem::take(&mut reader.references);
        reach(&mut reader, &sources, pending, &mut typed, &mut refusals);
        let mut registry = Self {
            typed,
            tokens: Vec::new(),
        };
        for (name, source, expr, expected) in read {
            held(&format!("--helix-{name}"), &expr, source, &mut refusals);
            match registry.kind(&expr, expected) {
                Ok(kind) => registry.tokens.push(Token {
                    name: name.clone(),
                    kind,
                    css: print::expr(&expr),
                    expr,
                }),
                Err(why) => refusals.push(format!("`--helix-{name}`: {why}")),
            }
        }
        if refusals.is_empty() {
            Ok(registry)
        } else {
            Err(refusals)
        }
    }

    /// Every token, in the order the layer declares them.
    pub fn tokens(&self) -> &[Token] {
        &self.tokens
    }

    /// How many declarations other than the tokens were typed to read them,
    /// counting one read as two shapes twice.
    pub fn typed_declarations(&self) -> usize {
        self.typed
            .keys()
            .filter(|(name, _)| !name.starts_with("--helix-"))
            .count()
    }

    /// The declaration `name` names, as `shape` reads it, where it is declared.
    pub fn declared(&self, name: &str, shape: Shape) -> Option<&Declared> {
        self.typed.get(&(name.to_owned(), shape))
    }

    /// What `token` holds in `mode`.
    ///
    /// # Errors
    ///
    /// A sentence where the token is the guaranteed-invalid value in that
    /// mode, or a step of it cannot be evaluated.
    pub fn evaluate(&self, token: &Token, mode: Mode) -> Result<Value, String> {
        Evaluation {
            registry: self,
            mode,
        }
        .token(&token.expr, token.kind)
        .map_err(|fault| match fault {
            Fault::Invalid => format!(
                "`--helix-{}` is the guaranteed-invalid value in {mode:?}",
                token.name
            ),
            Fault::Refused(why) => format!("`--helix-{}` in {mode:?}: {why}", token.name),
        })
    }

    /// A token's kind: its category's, or its value's where the category
    /// admits more than one.
    fn kind(&self, expr: &Expr, expected: Option<Kind>) -> Result<Kind, String> {
        let found = match expr {
            Expr::Channels(_) => return Err("a token is not a list of components".to_owned()),
            Expr::Color(_) => Kind::Color,
            Expr::Easing(_) => Kind::Easing,
            Expr::Families(_) => Kind::Family,
            Expr::Filters(_) => Kind::Filter,
            Expr::Quantity(quantity) => self.dimension(quantity, &mut Vec::new())?,
            Expr::Shadow(_) => Kind::Shadow,
            Expr::Time(_) => Kind::Time,
        };
        /* A bare `0` is a length as well as a number, as CSS reads it. */
        let zero = *expr == Expr::Quantity(Quantity::Number(0.0));
        match expected {
            Some(Kind::Length) if zero => Ok(Kind::Length),
            Some(kind) if kind != found => Err(format!(
                "its category holds {kind:?} tokens, and its value is a {found:?}"
            )),
            _ => Ok(found),
        }
    }

    /// Whether a quantity is a number or a length, through its references.
    fn dimension(&self, quantity: &Quantity, trail: &mut Vec<String>) -> Result<Kind, String> {
        match quantity {
            Quantity::Calc(math) => self.arithmetic(math, trail),
            Quantity::Length(..) => Ok(Kind::Length),
            Quantity::Number(_) => Ok(Kind::Number),
            Quantity::Round(value, _) => self.dimension(value, trail),
            Quantity::Var(var) => {
                if trail.contains(&var.name) {
                    return Err(format!("`{}` resolves through itself", var.name));
                }
                if let Some(Declared::Typed(Expr::Quantity(declared))) =
                    self.declared(&var.name, Shape::Quantity)
                {
                    trail.push(var.name.clone());
                    let kind = self.dimension(declared, trail);
                    trail.pop();
                    return kind;
                }
                match &var.fallback {
                    Some(fallback) => self.dimension(fallback, trail),
                    None => Err(format!("`{}` holds no number or length", var.name)),
                }
            }
        }
    }

    fn arithmetic(&self, math: &Math, trail: &mut Vec<String>) -> Result<Kind, String> {
        match math {
            Math::Binary(left, op, right) => {
                let left = self.arithmetic(left, trail)?;
                let right = self.arithmetic(right, trail)?;
                match (left, op, right) {
                    (Kind::Number, _, Kind::Number) => Ok(Kind::Number),
                    (Kind::Length, Op::Add | Op::Subtract, Kind::Length)
                    | (Kind::Length, Op::Multiply | Op::Divide, Kind::Number)
                    | (Kind::Number, Op::Multiply, Kind::Length) => Ok(Kind::Length),
                    _ => Err("a `calc()` mixes a number and a length".to_owned()),
                }
            }
            Math::Component(_) | Math::Number(_) => Ok(Kind::Number),
            Math::Length(..) => Ok(Kind::Length),
            Math::Var(var) => self.dimension(&Quantity::Var(var.clone()), trail),
        }
    }
}

/// Types each declaration the references in `pending` reach, as the shape
/// each was read as, and the declarations those reach in turn.
fn reach(
    reader: &mut Reader,
    sources: &BTreeMap<String, Source>,
    mut pending: Vec<(String, Shape)>,
    typed: &mut BTreeMap<(String, Shape), Declared>,
    refusals: &mut Vec<String>,
) {
    while let Some((name, shape)) = pending.pop() {
        let Some(source) = sources.get(&name) else {
            continue;
        };
        if typed.contains_key(&(name.clone(), shape)) {
            continue;
        }
        if source.initial() {
            typed.insert((name, shape), Declared::Invalid);
            continue;
        }
        match source.read(reader, shape) {
            Ok(expr) => {
                held(&name, &expr, source, refusals);
                typed.insert((name, shape), Declared::Typed(expr));
                pending.append(&mut reader.references);
            }
            Err(why) => refusals.push(format!("`{name}`, read as {shape:?}: {why}")),
        }
    }
}

/// A token read as the first shape its category admits that reads it.
fn first_reading(
    reader: &mut Reader,
    name: &str,
    source: &Source,
) -> Result<(Expr, Shape, Option<Kind>), String> {
    let (shapes, expected) = category(name).ok_or_else(|| {
        let prefix = name.split('-').next().unwrap_or_default();
        format!("the category `{prefix}` has no shape its tokens are read as")
    })?;
    let mut why = Vec::new();
    for shape in shapes {
        match source.read(reader, *shape) {
            Ok(expr) => return Ok((expr, *shape, expected)),
            Err(sentence) => why.push(sentence),
        }
    }
    Err(why.join("; "))
}

/// Refuses a typed form that does not print back as its source was written:
/// as the same builder calls, or as the same CSS up to whitespace.
fn held(name: &str, expr: &Expr, source: &Source, refusals: &mut Vec<String>) {
    let (written, printed, same) = match source {
        Source::Built(built) => {
            let printed = builder::print::built(expr);
            (built.to_string(), printed.to_string(), printed == *built)
        }
        Source::Css(text) => {
            let (written, printed) = (print::normalized(text), print::expr(expr));
            let same = written == printed;
            (written, printed, same)
        }
    };
    if !same {
        refusals.push(format!(
            "`{name}` is written `{written}` and its typed form prints `{printed}`"
        ));
    }
}
