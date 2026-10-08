//! `proof compare`, which reads two PNG files and needs nothing else.

use std::path::{Path, PathBuf};
use std::process::Command;

fn proof(arguments: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_proof"))
        .args(arguments)
        .output()
        .expect("the binary runs")
}

fn scratch(name: &str) -> PathBuf {
    let directory =
        std::env::temp_dir().join(format!("proof-compare-{}-{name}", std::process::id()));
    std::fs::create_dir_all(&directory).unwrap();
    directory
}

/// A flat picture with one pixel set apart, written as an RGBA PNG.
fn write(path: &Path, width: u32, height: u32, odd: Option<(u32, u32)>) {
    let mut rgba = [255u8, 255, 255, 255].repeat((width * height) as usize);
    if let Some((x, y)) = odd {
        let at = ((y * width + x) * 4) as usize;
        rgba[at..at + 3].copy_from_slice(&[0, 0, 0]);
    }
    let file = std::fs::File::create(path).unwrap();
    let mut encoder = png::Encoder::new(file, width, height);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    let mut writer = encoder.write_header().unwrap();
    writer.write_image_data(&rgba).unwrap();
}

fn text(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).into_owned()
}

#[test]
fn the_same_picture_passes() {
    let at = scratch("same");
    let one = at.join("one.png");
    write(&one, 4, 4, None);
    let path = one.to_str().unwrap();
    let ran = proof(&["compare", path, path]);
    assert_eq!(ran.status.code(), Some(0));
    assert!(text(&ran.stdout).contains("every pixel matches"));
}

#[test]
fn a_moved_pixel_fails_and_writes_the_diff_asked_for() {
    let at = scratch("moved");
    let (baseline, current, diff) = (at.join("a.png"), at.join("b.png"), at.join("a.diff.png"));
    write(&baseline, 5, 5, None);
    write(&current, 5, 5, Some((2, 2)));
    let ran = proof(&[
        "compare",
        baseline.to_str().unwrap(),
        current.to_str().unwrap(),
        "--diff",
        diff.to_str().unwrap(),
    ]);
    assert_eq!(ran.status.code(), Some(1));
    assert!(text(&ran.stdout).contains("1 pixel differs"));
    assert!(diff.exists());
}

#[test]
fn a_size_change_is_a_layout_change_with_no_diff_image() {
    let at = scratch("resized");
    let (baseline, current, diff) = (at.join("a.png"), at.join("b.png"), at.join("a.diff.png"));
    write(&baseline, 4, 4, None);
    write(&current, 4, 5, None);
    let ran = proof(&[
        "compare",
        baseline.to_str().unwrap(),
        current.to_str().unwrap(),
        "--diff",
        diff.to_str().unwrap(),
    ]);
    assert_eq!(ran.status.code(), Some(1));
    assert!(text(&ran.stdout).contains("4x4 became 4x5"));
    assert!(!diff.exists());
}

/// A file that is not there is input the command never got far enough to
/// judge, which is exit 3 and not the 1 of a difference.
#[test]
fn an_unreadable_file_is_an_input_failure() {
    let ran = proof(&["compare", "/nonexistent/a.png", "/nonexistent/b.png"]);
    assert_eq!(ran.status.code(), Some(3));
    assert!(text(&ran.stderr).starts_with("proof: cannot read /nonexistent/a.png"));
}

#[test]
fn a_threshold_outside_zero_to_one_is_refused() {
    let ran = proof(&["compare", "a.png", "b.png", "--threshold", "2"]);
    assert_eq!(ran.status.code(), Some(2));
    assert!(text(&ran.stderr).contains("the threshold is from 0 to 1"));
}
