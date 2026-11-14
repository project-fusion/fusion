//! What a token's references read as, beside the token itself, so a token
//! read as one of several shapes is the shape of what it names.

use std::collections::BTreeMap;

use super::expr::Shape;
use super::read::Reader;
use super::registry::Source;

/// The first reference kept from `mark` on whose declaration does not read
/// as the shape it was met as. What that names in turn is `reach`'s.
pub(super) fn refused_reference(
    reader: &mut Reader,
    sources: &BTreeMap<String, Source>,
    mark: usize,
) -> Option<String> {
    let met: Vec<(String, Shape)> = reader.references[mark..].to_vec();
    let kept = reader.references.len();
    let mut refused = None;
    for (name, shape) in met {
        let Some(source) = sources.get(&name).filter(|one| !one.initial()) else {
            continue;
        };
        if let Err(why) = source.read(reader, shape) {
            refused = Some(format!("`{name}`, read as {shape:?}: {why}"));
            break;
        }
    }
    reader.references.truncate(kept);
    refused
}
