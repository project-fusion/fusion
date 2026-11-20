//! The strings a vector's attributes are written in: a length, a path's
//! outline, and a box.

/// A number, or a number and `%`.
pub fn length(text: &str) -> bool {
    let number = text.trim().strip_suffix('%').unwrap_or(text.trim());
    number.parse::<f64>().is_ok_and(f64::is_finite)
}

/// SVG path data: its commands, numbers, and the commas and spaces between.
pub fn path_data(text: &str) -> bool {
    !text.trim().is_empty()
        && text
            .chars()
            .all(|character| "MmLlHhVvCcSsQqTtAaZz0123456789.,-+eE \n\t".contains(character))
}

/// Four numbers, the width and the height above zero, or `none`: a vector
/// whose units are its own size, as an `<svg>` written with no `viewBox`, as
/// a progress ring's is.
pub fn view_box(text: &str) -> bool {
    if text == "none" {
        return true;
    }
    let numbers: Vec<f64> = text
        .split(|character: char| character == ',' || character.is_whitespace())
        .filter(|part| !part.is_empty())
        .map_while(|part| part.parse::<f64>().ok().filter(|number| number.is_finite()))
        .collect();
    matches!(numbers.as_slice(), [_, _, width, height] if *width > 0.0 && *height > 0.0)
}
