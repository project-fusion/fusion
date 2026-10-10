//! `helix visual compare`, which reads two PNG files and needs nothing else,
//! and `helix visual accept`, which reads a report and a git checkout.

use std::path::{Path, PathBuf};
use std::process::Command;

fn visual(arguments: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_helix"))
        .arg("visual")
        .args(arguments)
        .output()
        .expect("the binary runs")
}

fn scratch(name: &str) -> PathBuf {
    let directory = std::env::temp_dir().join(format!(
        "helix-visual-compare-{}-{name}",
        std::process::id()
    ));
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
    let ran = visual(&["compare", path, path]);
    assert_eq!(ran.status.code(), Some(0));
    assert!(text(&ran.stdout).contains("every pixel matches"));
}

#[test]
fn a_moved_pixel_fails_and_writes_the_diff_asked_for() {
    let at = scratch("moved");
    let (baseline, current, diff) = (at.join("a.png"), at.join("b.png"), at.join("a.diff.png"));
    write(&baseline, 5, 5, None);
    write(&current, 5, 5, Some((2, 2)));
    let ran = visual(&[
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
    let ran = visual(&[
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
    let ran = visual(&["compare", "/nonexistent/a.png", "/nonexistent/b.png"]);
    assert_eq!(ran.status.code(), Some(3));
    assert!(text(&ran.stderr).starts_with("helix: cannot read /nonexistent/a.png"));
}

#[test]
fn a_threshold_outside_zero_to_one_is_refused() {
    let ran = visual(&["compare", "a.png", "b.png", "--threshold", "2"]);
    assert_eq!(ran.status.code(), Some(2));
    assert!(text(&ran.stderr).contains("the threshold is from 0 to 1"));
}

/// Under `--json`, stdout is one object a script reads, and the sentence a
/// person reads moves to stderr.
#[test]
fn json_answers_with_an_object_and_keeps_the_sentence_on_stderr() {
    let at = scratch("json");
    let (baseline, current) = (at.join("a.png"), at.join("b.png"));
    write(&baseline, 3, 3, None);
    write(&current, 3, 3, Some((1, 1)));
    let ran = Command::new(env!("CARGO_BIN_EXE_helix"))
        .args(["--json", "visual", "compare"])
        .args([&baseline, &current])
        .output()
        .expect("the binary runs");
    assert_eq!(ran.status.code(), Some(1));
    let answer: serde_json::Value =
        serde_json::from_slice(&ran.stdout).expect("stdout is one JSON document");
    assert_eq!(answer["matches"], false);
    assert_eq!(answer["differing"], 1);
    assert!(answer["diff"].is_null());
    assert!(text(&ran.stderr).contains("1 pixel differs"));

    write(&current, 3, 4, None);
    let resized = Command::new(env!("CARGO_BIN_EXE_helix"))
        .args(["--json", "visual", "compare"])
        .args([&baseline, &current])
        .output()
        .expect("the binary runs");
    let answer: serde_json::Value =
        serde_json::from_slice(&resized.stdout).expect("stdout is one JSON document");
    assert_eq!(answer["size"]["current"], serde_json::json!([3, 4]));
}

fn git(at: &Path, arguments: &[&str]) -> String {
    let ran = Command::new("git")
        .current_dir(at)
        .args([
            "-c",
            "user.name=helix",
            "-c",
            "user.email=helix@example.com",
        ])
        .args(arguments)
        .output()
        .expect("git runs");
    assert!(
        ran.status.success(),
        "git {arguments:?}: {}",
        text(&ran.stderr)
    );
    text(&ran.stdout).trim().to_string()
}

/// A repository with one commit, and a test run's report beside it whose one
/// failed shot carries a capture and names the baseline it failed against.
fn reported(name: &str, keep: &str, head: Option<&str>) -> (PathBuf, PathBuf) {
    let repository = scratch(name).join("repository");
    let _ = std::fs::remove_dir_all(&repository);
    std::fs::create_dir_all(repository.join("pictures")).unwrap();
    write(&repository.join("pictures/badge.png"), 3, 3, None);
    git(&repository, &["init", "--quiet"]);
    git(&repository, &["add", "."]);
    git(&repository, &["commit", "--quiet", "-m", "pictures"]);
    let commit = git(&repository, &["rev-parse", "HEAD"]);
    let report = repository.join(".helix/visual");
    std::fs::create_dir_all(report.join("shots")).unwrap();
    write(&report.join("shots/0-current.png"), 3, 3, Some((1, 1)));
    let record = serde_json::json!({
        "mode": "test",
        "run": { "commit": "a-merge", "head": head.unwrap_or(&commit) },
        "shots": [
            { "current": "shots/0-current.png", "detail": "1 pixel differs on both takes.", "entry": "styled/badge", "keep": keep, "result": "differs", "shot": "wide" },
            { "detail": "matches its baseline.", "entry": "styled/button", "result": "matched", "shot": "wide" },
        ],
    });
    std::fs::write(report.join("run.json"), record.to_string()).unwrap();
    (repository, report)
}

fn accept(at: &Path, arguments: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_helix"))
        .current_dir(at)
        .args(["visual", "accept"])
        .args(arguments)
        .output()
        .expect("the binary runs")
}

#[test]
fn accept_writes_a_failed_shots_capture_into_its_baseline() {
    let (repository, report) = reported("accept", "pictures/badge.png", None);
    let ran = accept(&repository, &[]);
    assert_eq!(ran.status.code(), Some(0), "{}", text(&ran.stderr));
    assert!(text(&ran.stdout).contains("accepted 1 capture"));
    assert_eq!(
        std::fs::read(repository.join("pictures/badge.png")).unwrap(),
        std::fs::read(report.join("shots/0-current.png")).unwrap()
    );
}

#[test]
fn accept_refuses_a_run_of_another_commit() {
    let (repository, _) = reported("accept-other", "pictures/badge.png", Some("0123abc"));
    let before = std::fs::read(repository.join("pictures/badge.png")).unwrap();
    let ran = accept(&repository, &[".helix/visual"]);
    assert_ne!(ran.status.code(), Some(0));
    assert!(text(&ran.stderr).contains("0123abc"));
    assert_eq!(
        std::fs::read(repository.join("pictures/badge.png")).unwrap(),
        before
    );
    let forced = accept(&repository, &["--any-commit"]);
    assert_eq!(forced.status.code(), Some(0), "{}", text(&forced.stderr));
}

#[test]
fn accept_writes_nothing_outside_the_baselines() {
    let (repository, _) = reported("accept-outside", "../outside.png", None);
    let ran = accept(&repository, &[]);
    assert_ne!(ran.status.code(), Some(0));
    assert!(text(&ran.stderr).contains("not a baseline inside the repository"));
    assert!(!repository.join("../outside.png").exists());
}
