//! What a change happened to: the elements under each changed region of a
//! picture, and how far each moved from where its baseline had it.
//!
//! **From data alone.** When a run asks, the driver records where every
//! element a reader would name sat in a picture. A baseline written with
//! those boxes carries them in an `iTXt` chunk of its own PNG, so the
//! browser's pixels and the comparison are untouched and nothing new is
//! committed beside it. A shot that differs is taken again with its boxes,
//! and each region the diff marked is told by the smallest named element
//! that covers most of it: where it is now, where the baseline had it, and
//! the file a manifest says defines it.

use std::collections::BTreeMap;
use std::io::Cursor;

use serde::Deserialize;
use serde_json::Value;

use crate::image::Image;

/// The chunk's keyword.
const KEYWORD: &str = "helix-visual-boxes";

/// The most regions a shot is told by, the largest first.
const REGIONS: usize = 5;

/// The side of the square cells a diff is grouped in, in pixels. Changed
/// cells that touch are one region.
const CELL: usize = 16;

/// Where one named element sat in a picture.
#[derive(Clone, Debug, Deserialize, PartialEq)]
pub struct Placed {
    pub height: f64,
    /// The named elements above it, itself, and its place among namesakes.
    pub key: String,
    pub tag: String,
    pub width: f64,
    pub x: f64,
    pub y: f64,
}

/// A region of a picture, in pixels.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Region {
    pub height: usize,
    pub width: usize,
    pub x: usize,
    pub y: usize,
}

/// The picture with its boxes in an `iTXt` chunk after its header, or the
/// picture as it was when it has no header to put them after.
///
/// **After the header and not before the end**, because a decoder reads the
/// text chunks before the image data when it opens a file, so reading the
/// boxes never decodes the picture.
pub fn embed(png: &[u8], boxes: &Value) -> Vec<u8> {
    /* The signature's 8 bytes, then the header: its length, its type, its
    13 bytes and its checksum. */
    const HEADER: usize = 8 + 4 + 4 + 13 + 4;
    if png.get(12..16) != Some(b"IHDR".as_slice()) || png.len() < HEADER {
        return png.to_vec();
    }
    let at = HEADER;
    /* Keyword, a null, no compression and its method, an empty language and
    translated keyword each ended by a null, then the UTF-8 text. */
    let mut data = KEYWORD.as_bytes().to_vec();
    data.extend_from_slice(&[0, 0, 0, 0, 0]);
    data.extend_from_slice(boxes.to_string().as_bytes());
    let Ok(length) = u32::try_from(data.len()) else {
        return png.to_vec();
    };
    let mut chunk = length.to_be_bytes().to_vec();
    let mut hasher = crc32fast::Hasher::new();
    hasher.update(b"iTXt");
    hasher.update(&data);
    chunk.extend_from_slice(b"iTXt");
    chunk.extend_from_slice(&data);
    chunk.extend_from_slice(&hasher.finalize().to_be_bytes());
    let mut out = png[..at].to_vec();
    out.extend_from_slice(&chunk);
    out.extend_from_slice(&png[at..]);
    out
}

/// The boxes a picture carries, or none when it was written without them.
pub fn read(png: &[u8]) -> Option<Vec<Placed>> {
    let reader = png::Decoder::new(Cursor::new(png)).read_info().ok()?;
    let chunk = reader
        .info()
        .utf8_text
        .iter()
        .find(|one| one.keyword == KEYWORD)?;
    let text = chunk.get_text().ok()?;
    serde_json::from_str(&text).ok()
}

/// The regions a diff image marked, the largest first: the pixels drawn in
/// the diff's red, grouped in cells, and the cells that touch joined.
pub fn regions(marked: &Image) -> Vec<Region> {
    let width = marked.width as usize;
    let height = marked.height as usize;
    let columns = width.div_ceil(CELL);
    let rows = height.div_ceil(CELL);
    let mut changed = vec![false; columns * rows];
    for (index, pixel) in marked.rgba.chunks_exact(4).enumerate() {
        if pixel[..3] == [255, 0, 0] {
            changed[(index / width / CELL) * columns + (index % width) / CELL] = true;
        }
    }
    let mut seen = vec![false; changed.len()];
    let mut found = Vec::new();
    for start in 0..changed.len() {
        if !changed[start] || seen[start] {
            continue;
        }
        seen[start] = true;
        let mut stack = vec![start];
        let (mut left, mut top, mut right, mut bottom) = (usize::MAX, usize::MAX, 0, 0);
        while let Some(cell) = stack.pop() {
            let (column, row) = (cell % columns, cell / columns);
            left = left.min(column);
            right = right.max(column);
            top = top.min(row);
            bottom = bottom.max(row);
            for (dx, dy) in [
                (-1, -1),
                (0, -1),
                (1, -1),
                (-1, 0),
                (1, 0),
                (-1, 1),
                (0, 1),
                (1, 1),
            ] {
                let (Some(x), Some(y)) =
                    (column.checked_add_signed(dx), row.checked_add_signed(dy))
                else {
                    continue;
                };
                let next = y * columns + x;
                if x < columns && y < rows && changed[next] && !seen[next] {
                    seen[next] = true;
                    stack.push(next);
                }
            }
        }
        let x = left * CELL;
        let y = top * CELL;
        found.push(Region {
            height: ((bottom + 1) * CELL).min(height) - y,
            width: ((right + 1) * CELL).min(width) - x,
            x,
            y,
        });
    }
    found.sort_by_key(|one| std::cmp::Reverse(one.width * one.height));
    found.truncate(REGIONS);
    found
}

#[allow(clippy::cast_precision_loss)] // Picture sizes far below 2^52.
fn covered(region: Region, placed: &Placed) -> f64 {
    let left = (region.x as f64).max(placed.x);
    let top = (region.y as f64).max(placed.y);
    let right = ((region.x + region.width) as f64).min(placed.x + placed.width);
    let bottom = ((region.y + region.height) as f64).min(placed.y + placed.height);
    ((right - left).max(0.0) * (bottom - top).max(0.0)) / (region.width * region.height) as f64
}

/// The element a region is told by: the smallest that covers half of it, or
/// failing that, the one that covers most.
fn teller(region: Region, boxes: &[Placed]) -> Option<&Placed> {
    let area = |one: &Placed| one.width * one.height;
    boxes
        .iter()
        .filter(|one| covered(region, one) >= 0.5)
        .min_by(|a, b| area(a).total_cmp(&area(b)))
        .or_else(|| {
            boxes
                .iter()
                .filter(|one| covered(region, one) > 0.0)
                .max_by(|a, b| {
                    covered(region, a)
                        .total_cmp(&covered(region, b))
                        .then(area(b).total_cmp(&area(a)))
                })
        })
}

/// How an element's box changed between two pictures, in words.
fn movement(now: &Placed, before: &Placed) -> String {
    let mut said = Vec::new();
    let mut step = |delta: f64, more: &str, less: &str| {
        let pixels = delta.round();
        if pixels != 0.0 {
            said.push(format!(
                "{} px {}",
                pixels.abs(),
                if pixels > 0.0 { more } else { less }
            ));
        }
    };
    step(now.y - before.y, "down", "up");
    step(now.x - before.x, "right", "left");
    let moved = !said.is_empty();
    let mut grew = Vec::new();
    let mut size = |delta: f64, more: &str, less: &str| {
        let pixels = delta.round();
        if pixels != 0.0 {
            grew.push(format!(
                "{} px {}",
                pixels.abs(),
                if pixels > 0.0 { more } else { less }
            ));
        }
    };
    size(now.width - before.width, "wider", "narrower");
    size(now.height - before.height, "taller", "shorter");
    match (moved, grew.is_empty()) {
        (false, true) => "drawn differently where it was".to_string(),
        (true, true) => format!("moved {}", said.join(" and ")),
        (false, false) => format!("now {}", grew.join(" and ")),
        (true, false) => format!(
            "moved {}, and now {}",
            said.join(" and "),
            grew.join(" and ")
        ),
    }
}

/// The named elements inside `holder` and in the region that moved or
/// changed size, the smallest first, as a clause: a card that grew is told
/// with the badge that moved inside it.
fn inside(region: Region, holder: &Placed, now: &[Placed], before: &[Placed]) -> String {
    const MOST: usize = 3;
    let prefix = format!("{} ", holder.key);
    let mut moved: Vec<(&Placed, &Placed)> = now
        .iter()
        .filter(|one| one.key.starts_with(&prefix) && covered(region, one) > 0.0)
        .filter_map(|one| {
            let old = before.iter().find(|old| old.key == one.key)?;
            let shifted = [
                one.x - old.x,
                one.y - old.y,
                one.width - old.width,
                one.height - old.height,
            ]
            .iter()
            .any(|delta| delta.round() != 0.0);
            shifted.then_some((one, old))
        })
        .collect();
    moved.sort_by(|a, b| (a.0.width * a.0.height).total_cmp(&(b.0.width * b.0.height)));
    let said: Vec<String> = moved
        .iter()
        .take(MOST)
        .map(|(one, old)| format!("`{}` {}", &one.key[prefix.len()..], movement(one, old)))
        .collect();
    if said.is_empty() {
        String::new()
    } else {
        format!("; inside it, {}", said.join(", and "))
    }
}

/// One line for each region a diff marked: where it is, the element it
/// happened to and the file that defines it, and how that element moved from
/// where the baseline had it, when the baseline carries its boxes.
pub fn attribute(
    regions: &[Region],
    now: &[Placed],
    before: Option<&[Placed]>,
    files: &BTreeMap<String, String>,
) -> Vec<String> {
    regions
        .iter()
        .map(|&region| {
            let at = format!(
                "{} by {} px at {}, {}",
                region.width, region.height, region.x, region.y
            );
            let Some(one) = teller(region, now) else {
                return match before.and_then(|boxes| teller(region, boxes)) {
                    Some(gone) => format!("{at}: `{}` is gone", gone.key),
                    None => format!("{at}: in no element the run names"),
                };
            };
            let file = files
                .get(&one.tag)
                .map(|file| format!(" ({file})"))
                .unwrap_or_default();
            let how = match before {
                None => String::new(),
                Some(boxes) => match boxes.iter().find(|old| old.key == one.key) {
                    Some(old) => format!(
                        ", {}{}",
                        movement(one, old),
                        inside(region, one, now, boxes)
                    ),
                    None => ", which the baseline does not have".to_string(),
                },
            };
            format!("{at}: `{}`{file}{how}", one.key)
        })
        .collect()
}

/// Each tag a custom elements manifest declares, and the file that defines
/// it: the manifest's folder joined with the module's path.
pub fn tags(manifest: &Value, folder: &str) -> BTreeMap<String, String> {
    let mut found = BTreeMap::new();
    for module in manifest["modules"].as_array().into_iter().flatten() {
        let Some(path) = module["path"].as_str() else {
            continue;
        };
        for declaration in module["declarations"].as_array().into_iter().flatten() {
            if let Some(tag) = declaration["tagName"].as_str() {
                let file = if folder.is_empty() {
                    path.to_string()
                } else {
                    format!("{folder}/{path}")
                };
                found.insert(tag.to_string(), file);
            }
        }
    }
    found
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn placed(key: &str, x: f64, y: f64, width: f64, height: f64) -> Placed {
        Placed {
            height,
            key: key.to_string(),
            tag: key.split(' ').next_back().unwrap_or(key).to_string(),
            width,
            x,
            y,
        }
    }

    fn picture() -> Vec<u8> {
        crate::image::encode(&Image {
            height: 2,
            rgba: vec![0; 16],
            width: 2,
        })
        .unwrap()
    }

    #[test]
    fn boxes_ride_in_the_picture_and_leave_its_pixels_alone() {
        let png = picture();
        assert_eq!(read(&png), None);
        let boxes = json!([{ "height": 1, "key": "helix-badge", "tag": "helix-badge", "width": 2, "x": 0, "y": 1 }]);
        let carried = embed(&png, &boxes);
        assert_eq!(read(&carried), Some(serde_json::from_value(boxes).unwrap()));
        assert_eq!(
            crate::image::decode(&carried).unwrap(),
            crate::image::decode(&png).unwrap()
        );
    }

    #[test]
    fn touching_cells_are_one_region_and_the_largest_comes_first() {
        let width = 64;
        let mut rgba = vec![0; width * width * 4];
        let mut mark = |x: usize, y: usize| {
            let at = (y * width + x) * 4;
            rgba[at..at + 4].copy_from_slice(&[255, 0, 0, 255]);
        };
        mark(1, 1);
        mark(20, 20);
        mark(60, 60);
        let found = regions(&Image {
            height: 64,
            rgba,
            width: 64,
        });
        assert_eq!(
            found,
            [
                Region {
                    height: 32,
                    width: 32,
                    x: 0,
                    y: 0
                },
                Region {
                    height: 16,
                    width: 16,
                    x: 48,
                    y: 48
                },
            ]
        );
    }

    #[test]
    fn a_region_is_told_by_the_smallest_element_covering_half_of_it() {
        let region = Region {
            height: 10,
            width: 10,
            x: 10,
            y: 10,
        };
        let now = [
            placed("helix-card", 0.0, 0.0, 100.0, 100.0),
            placed("helix-card helix-badge", 8.0, 12.0, 12.0, 10.0),
        ];
        let before = [
            placed("helix-card", 0.0, 0.0, 100.0, 100.0),
            placed("helix-card helix-badge", 8.0, 8.0, 12.0, 10.0),
        ];
        let files = BTreeMap::from([("helix-badge".to_string(), "src/badge.ts".to_string())]);
        assert_eq!(
            attribute(&[region], &now, Some(&before), &files),
            ["10 by 10 px at 10, 10: `helix-card helix-badge` (src/badge.ts), moved 4 px down"]
        );
        assert_eq!(
            attribute(&[region], &now, None, &BTreeMap::new()),
            ["10 by 10 px at 10, 10: `helix-card helix-badge`"]
        );
    }

    #[test]
    fn a_holder_that_grew_is_told_with_what_moved_inside_it() {
        let region = Region {
            height: 64,
            width: 352,
            x: 16,
            y: 96,
        };
        let before = [
            placed("my-card", 24.0, 24.0, 334.0, 124.0),
            placed("my-card h2", 41.0, 61.0, 300.0, 28.0),
            placed("my-card span", 41.0, 109.0, 43.0, 22.0),
        ];
        let now = [
            placed("my-card", 24.0, 24.0, 334.0, 128.0),
            placed("my-card h2", 41.0, 61.0, 300.0, 28.0),
            placed("my-card span", 41.0, 113.0, 43.0, 22.0),
        ];
        assert_eq!(
            attribute(&[region], &now, Some(&before), &BTreeMap::new()),
            ["352 by 64 px at 16, 96: `my-card`, now 4 px taller; inside it, `span` moved 4 px down"]
        );
    }

    #[test]
    fn a_manifest_names_the_file_of_each_tag() {
        let manifest = json!({ "modules": [{ "path": "src/badge/badge.ts", "declarations": [{ "tagName": "helix-badge" }, { "name": "helper" }] }] });
        assert_eq!(
            tags(&manifest, "helix/styled"),
            BTreeMap::from([(
                "helix-badge".to_string(),
                "helix/styled/src/badge/badge.ts".to_string()
            )])
        );
    }
}
