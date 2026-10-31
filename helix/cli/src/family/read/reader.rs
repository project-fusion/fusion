//! The reading itself: each expression a table may hold, read into a
//! [`Lit`], with the names, spreads and rules functions a style table
//! written with `styles()` adds.

use oxc_ast::ast::{
    ArrayExpression, ArrayExpressionElement, ArrowFunctionExpression, BindingPattern, Expression,
    ObjectPropertyKind, Statement, VariableDeclarationKind,
};
use oxc_span::{GetSpan, Span};

use super::{callee, line, refused, Lit, Reader, LINED};

impl<'a> Reader<'a, '_> {
    fn refused(&self, span: Span, what: &str) -> String {
        refused(span, self.source, what)
    }

    fn line(&self, span: Span) -> usize {
        line(span, self.source)
    }

    /// An array, with a named array spread into it in a rules function.
    fn array(&mut self, array: &'a ArrayExpression<'a>) -> Result<Lit, String> {
        let mut read = Vec::with_capacity(array.elements.len());
        for element in &array.elements {
            match element {
                ArrayExpressionElement::SpreadElement(spread) if self.styles => {
                    match self.spread_name(&spread.argument, spread.span)? {
                        Lit::Array(items) => read.extend(items),
                        _ => {
                            return Err(self.refused(
                                spread.span,
                                "a spread of anything but an array into an array",
                            ))
                        }
                    }
                }
                element => match element.as_expression() {
                    Some(inner) => read.push(self.read(inner)?),
                    None => return Err(self.refused(element.span(), "a spread or a hole")),
                },
            }
        }
        Ok(Lit::Array(read))
    }

    pub(super) fn read(&mut self, expression: &'a Expression<'a>) -> Result<Lit, String> {
        match expression {
            Expression::StringLiteral(text) => Ok(Lit::Text(text.value.display().to_string())),
            Expression::NumericLiteral(number) => Ok(Lit::Number(number.value)),
            Expression::BooleanLiteral(flag) => Ok(Lit::Bool(flag.value)),
            Expression::NullLiteral(_) => Ok(Lit::Null),
            Expression::ParenthesizedExpression(inner) => self.read(&inner.expression),
            Expression::ArrayExpression(array) => self.array(array),
            Expression::ObjectExpression(object) => {
                let mut fields: Vec<(String, Lit)> = Vec::new();
                for property in &object.properties {
                    let (read, span) = match property {
                        ObjectPropertyKind::ObjectProperty(property) => {
                            let Some(key) = property.key.static_name() else {
                                return Err(self.refused(property.span, "a computed key"));
                            };
                            if property.computed {
                                return Err(self.refused(property.span, "a computed key"));
                            }
                            /* A `headless.tsx` source's part tree, read with
                            the keys before it, which type what it reads. */
                            let value = if self.jsx && key == "render" {
                                super::jsx::render(&property.value, &fields, self.source)?
                            } else {
                                self.read(&property.value)?
                            };
                            let key = key.display().to_string();
                            (vec![(key, value)], property.span)
                        }
                        ObjectPropertyKind::SpreadProperty(spread) => {
                            (self.spreads(&spread.argument, spread.span)?, spread.span)
                        }
                    };
                    for (key, value) in read {
                        if fields.iter().any(|(held, _)| *held == key) {
                            /* In a rules function a key written twice is
                            refused: JavaScript keeps the first position and
                            the last value, which no reader should have to
                            model. */
                            if self.styles {
                                return Err(self.refused(
                                    span,
                                    &format!("the key `{key}` a second time in one object"),
                                ));
                            }
                            /* A later field of the same name replaces an
                            earlier one, as the object the module builds
                            holds only the later. */
                            fields.retain(|(held, _)| *held != key);
                        }
                        fields.push((key, value));
                    }
                }
                Ok(Lit::Object(fields))
            }
            Expression::TSAsExpression(cast) => self.read(&cast.expression),
            Expression::TSSatisfiesExpression(cast) => self.read(&cast.expression),
            Expression::CallExpression(call) => {
                let Some(name) = callee(&call.callee) else {
                    return Err(self.refused(call.span, "a call to anything but a helper"));
                };
                let mut arguments = Vec::with_capacity(call.arguments.len());
                for (index, argument) in call.arguments.iter().enumerate() {
                    /* `styles(headless, ...)` names the module it styles. */
                    if let (0, "styles", Some(Expression::Identifier(module))) =
                        (index, name.as_str(), argument.as_expression())
                    {
                        if let Some(path) = self.scope.imports.get(module.name.as_str()) {
                            arguments.push(Lit::Call(
                                "import".to_owned(),
                                vec![Lit::Text(path.clone())],
                            ));
                            continue;
                        }
                    }
                    match argument.as_expression() {
                        Some(inner) => arguments.push(self.read(inner)?),
                        None => return Err(self.refused(argument.span(), "a spread argument")),
                    }
                }
                let lined = self.styles && LINED.contains(&name.as_str());
                let call = Lit::Call(name, arguments);
                Ok(if lined {
                    Lit::At(self.line(expression.span()), Box::new(call))
                } else {
                    call
                })
            }
            Expression::StaticMemberExpression(member) => match &member.object {
                Expression::Identifier(object) if !member.optional => Ok(Lit::Member(
                    object.name.to_string(),
                    member.property.name.to_string(),
                )),
                _ => Err(self.refused(member.span, "a property of anything but a name")),
            },
            Expression::ArrowFunctionExpression(arrow) => self.arrowed(arrow),
            Expression::Identifier(name) if self.names_everywhere || self.styles => {
                self.named(&name.name, name.span)
            }
            Expression::Identifier(name) => Err(self.refused(name.span, "a name")),
            other => {
                Err(self.refused(other.span(), "an expression the compiler would have to run"))
            }
        }
    }

    /// `({ a, b }) => body`: one parameter that destructures names as they
    /// are spelled, and a body that is an expression or `const`s before one
    /// `return`. Everything in it is read as a rules function's.
    fn arrowed(&mut self, arrow: &'a ArrowFunctionExpression<'a>) -> Result<Lit, String> {
        let refuse =
            |reader: &Self| reader.refused(arrow.span, "a function but `({ name, ... }) => [...]`");
        let ([parameter], None) = (arrow.params.items.as_slice(), &arrow.params.rest) else {
            return Err(refuse(self));
        };
        let BindingPattern::ObjectPattern(pattern) = &parameter.pattern else {
            return Err(refuse(self));
        };
        if pattern.rest.is_some() || parameter.initializer.is_some() {
            return Err(refuse(self));
        }
        let names = pattern
            .properties
            .iter()
            .map(|property| match (&property.value, property.shorthand) {
                (BindingPattern::BindingIdentifier(name), true) => Ok(name.name.to_string()),
                _ => Err(self.refused(
                    property.span,
                    "a name the rules function is given under another name",
                )),
            })
            .collect::<Result<Vec<_>, _>>()?;
        let outer = (self.scope.clone(), self.styles);
        self.styles = true;
        let body = self.body(arrow, &names);
        (self.scope, self.styles) = outer;
        Ok(Lit::Arrow(names, Box::new(body?)))
    }

    /// The arrow's body: its expression, or the `return` after its `const`s,
    /// each of which is in scope for what follows it.
    fn body(
        &mut self,
        arrow: &'a ArrowFunctionExpression<'a>,
        given: &[String],
    ) -> Result<Lit, String> {
        if let Some(expression) = arrow.get_expression() {
            return self.read(expression);
        }
        let Some(body) = arrow.get_function_body() else {
            return Err(self.refused(arrow.span, "a function with no body"));
        };
        let Some((last, declarations)) = body.statements.split_last() else {
            return Err(self.refused(body.span, "a rules function that returns nothing"));
        };
        for statement in declarations {
            let Statement::VariableDeclaration(declaration) = statement else {
                return Err(self.refused(
                    statement.span(),
                    "a statement but `const` before the rules function's `return`",
                ));
            };
            if declaration.kind != VariableDeclarationKind::Const {
                return Err(self.refused(declaration.span, "a variable but a `const`"));
            }
            for declarator in &declaration.declarations {
                let (Some(name), Some(init)) =
                    (declarator.id.get_identifier_name(), &declarator.init)
                else {
                    return Err(
                        self.refused(declarator.span, "a `const` that does not name one value")
                    );
                };
                if given.iter().any(|one| one == name.as_str())
                    || self.scope.constants.contains_key(name.as_str())
                {
                    return Err(self.refused(
                        declarator.span,
                        &format!("a second `{name}`, which hides the first"),
                    ));
                }
                self.scope.constants.insert(name.to_string(), init);
            }
        }
        match last {
            Statement::ReturnStatement(returned) => match &returned.argument {
                Some(expression) => self.read(expression),
                None => Err(self.refused(returned.span, "a `return` of nothing")),
            },
            other => Err(self.refused(
                other.span(),
                "a rules function that does not end in `return [...]`",
            )),
        }
    }

    /// The fields a spread lays into an object: those of a constant object
    /// the module or the rules function defines.
    fn spreads(
        &mut self,
        argument: &'a Expression<'a>,
        span: Span,
    ) -> Result<Vec<(String, Lit)>, String> {
        if !(self.names_everywhere || self.styles) {
            return Err(self.refused(span, "a spread"));
        }
        match self.spread_name(argument, span)? {
            Lit::Object(fields) => Ok(fields),
            _ => Err(self.refused(span, "a spread of anything but an object")),
        }
    }

    /// The constant a spread names, read.
    fn spread_name(&mut self, argument: &'a Expression<'a>, span: Span) -> Result<Lit, String> {
        let Expression::Identifier(name) = argument else {
            return Err(self.refused(span, "a spread of anything but a constant's name"));
        };
        self.named(&name.name, name.span)
    }

    /// A name: a constant, read in its place, a function, kept by name, or a
    /// module the source imports, as `import(path)`.
    fn named(&mut self, name: &str, span: Span) -> Result<Lit, String> {
        if self.scope.functions.contains_key(name) {
            return Ok(Lit::Name(name.to_owned()));
        }
        if let (true, Some(path)) = (self.styles, self.scope.imports.get(name)) {
            return Ok(Lit::Call(
                "import".to_owned(),
                vec![Lit::Text(path.clone())],
            ));
        }
        let Some(constant) = self.scope.constants.get(name).copied() else {
            return Err(self.refused(
                span,
                "a name the module does not define as a constant or export as a function",
            ));
        };
        if self.reading.iter().any(|one| one == name) {
            return Err(self.refused(span, "a constant that names itself"));
        }
        self.reading.push(name.to_owned());
        let read = self.read(constant);
        self.reading.pop();
        read
    }
}
