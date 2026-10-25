//! `fit()`, how much of its content a one-row grid shows: `0fr` or `1fr` on
//! the web, and on a phone the measured height of the content, which a
//! transition of `grid-template-rows` moves.

use crate::family::ir::Value;
use crate::family::read::Lit;

/// Whether a value is `fit()`, itself or behind `web()`.
pub fn fits(value: &Value) -> bool {
    match value {
        Value::Fit(_) => true,
        Value::Web(inner) => fits(inner),
        _ => false,
    }
}

/// How much of its content a one-row grid shows: `0`, closed, or `1`, open.
pub fn fit(arguments: &[Lit]) -> Result<Value, String> {
    match arguments {
        [Lit::Number(share)] if *share == 0.0 || (*share - 1.0).abs() < f64::EPSILON => {
            Ok(Value::Fit(*share))
        }
        _ => Err("`fit()` takes `0`, closed, or `1`, open".to_owned()),
    }
}
