//! What the binary says about itself before it has a command.

use std::process::Command;

fn proof(arguments: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_proof"))
        .args(arguments)
        .output()
        .expect("the binary runs")
}

/// Built in this workspace, with no package beside it, it reports what it was
/// compiled at. A release reads the package npm installed instead, which
/// `binaries.yml` proves for each platform.
#[test]
fn version_is_the_compiled_value_with_no_package_beside_it() {
    let ran = proof(&["--version"]);
    assert!(ran.status.success());
    assert_eq!(
        String::from_utf8_lossy(&ran.stdout).trim(),
        format!("proof {}", env!("CARGO_PKG_VERSION"))
    );
}

#[test]
fn help_names_the_command_and_succeeds() {
    let ran = proof(&["--help"]);
    assert!(ran.status.success());
    assert!(String::from_utf8_lossy(&ran.stdout).contains("Usage: proof"));
}

/// A bare `proof` is a request for help and not a run, so it says so on
/// stderr and exits 2.
#[test]
fn bare_prints_help_and_exits_two() {
    let ran = proof(&[]);
    assert_eq!(ran.status.code(), Some(2));
    assert!(String::from_utf8_lossy(&ran.stderr).contains("Usage: proof"));
}
