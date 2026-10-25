//! The example tool, built the way its author would build it, and run under
//! grants and limits.
//!
//! **The long way round on purpose**, as for the rule example: the test
//! compiles the tool for `wasm32-unknown-unknown` and encodes it into a
//! component, which is the path an author takes.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use fusion_plugins::tools::{Allowance, Fetch, Grant, Limits, NoFetch, Toolbox};

/// The workspace root, from this crate's own manifest.
fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .expect("the workspace above this crate")
        .to_path_buf()
}

/// Builds the example tool for WebAssembly, encodes it into a component, and
/// returns where the component was written.
fn built(extra: &[&str], into: &str) -> PathBuf {
    let at = root().join("fusion/plugins/tool-example");
    let target = at.join(into);
    let built = Command::new(env!("CARGO"))
        .args([
            "build",
            "--quiet",
            "--release",
            "--target",
            "wasm32-unknown-unknown",
        ])
        .args(extra)
        .arg("--target-dir")
        .arg(&target)
        .current_dir(&at)
        .output()
        .expect("cargo runs");
    assert!(
        built.status.success(),
        "the example tool did not build: {}",
        String::from_utf8_lossy(&built.stderr)
    );
    let core = target.join("wasm32-unknown-unknown/release/fusion_tool_example.wasm");
    let bytes = std::fs::read(&core).expect("the built module");
    let component = wit_component::ComponentEncoder::default()
        .module(&bytes)
        .expect("a core module")
        .validate(true)
        .encode()
        .expect("a component");
    /* Written aside and renamed into place, because CI runs each test in a
    process of its own: a second process rewriting the file in place
    truncates it under a test that is reading it. */
    let file = target.join("tool.wasm");
    let aside = target.join(format!("tool.wasm.{}", std::process::id()));
    std::fs::write(&aside, component).expect("the component is written");
    std::fs::rename(&aside, &file).expect("the component is in place");
    file
}

/// The example tool, built once for every test that wants it.
fn example() -> &'static Path {
    static BUILT: OnceLock<PathBuf> = OnceLock::new();
    BUILT.get_or_init(|| built(&[], "target"))
}

/// The example with the three tools that never stop.
fn unruly() -> &'static Path {
    static BUILT: OnceLock<PathBuf> = OnceLock::new();
    BUILT.get_or_init(|| built(&["--features", "unruly"], "target-unruly"))
}

/// A folder of its own, removed when the value is dropped.
struct Folder(PathBuf);

impl Folder {
    fn new(name: &str) -> Self {
        let at = std::env::temp_dir().join(format!("fusion-tools-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&at);
        std::fs::create_dir_all(&at).expect("a folder");
        Self(at.canonicalize().expect("a real path"))
    }
}

impl Drop for Folder {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// A way out that answers every request and keeps each URL it was asked for.
#[derive(Default)]
struct Recorded(Mutex<Vec<String>>);

impl Fetch for Recorded {
    fn fetch(&self, url: &str, _: &[String], _: Allowance) -> Result<String, String> {
        self.0.lock().unwrap().push(url.to_owned());
        Ok("twelve bytes".to_owned())
    }
}

fn input(key: &str, value: &str) -> String {
    serde_json::json!({ key: value }).to_string()
}

#[test]
fn a_tool_module_says_what_it_provides_and_is_named_by_its_digest() {
    let toolbox = Toolbox::load(example(), Limits::default()).expect("it loads");

    let names: Vec<&str> = toolbox
        .tools
        .iter()
        .map(|tool| tool.name.as_str())
        .collect();
    assert_eq!(names, ["count-lines", "measure", "token-length"]);
    assert!(toolbox.tools.iter().all(|tool| tool.read_only));
    assert!(toolbox.digest.starts_with("sha256:"), "{}", toolbox.digest);
    let schema: serde_json::Value =
        serde_json::from_str(&toolbox.tools[0].input_schema).expect("a JSON Schema");
    assert_eq!(schema["required"][0], "path");
}

#[test]
fn a_tool_reads_only_inside_the_folders_its_grant_names() {
    let toolbox = Toolbox::load(example(), Limits::default()).expect("it loads");
    let granted = Folder::new("granted");
    let outside = Folder::new("outside");
    std::fs::write(granted.0.join("notes.txt"), "one\ntwo\nthree\n").unwrap();
    std::fs::write(outside.0.join("key"), "secret\n").unwrap();
    #[cfg(unix)]
    std::os::unix::fs::symlink(outside.0.join("key"), granted.0.join("link")).unwrap();
    let grant = Grant {
        read: vec![granted.0.clone()],
        ..Grant::default()
    };
    let count = |path: &Path| {
        toolbox.call(
            "count-lines",
            &input("path", &path.display().to_string()),
            &grant,
            Limits::default(),
            Arc::new(NoFetch),
        )
    };

    assert_eq!(
        count(&granted.0.join("notes.txt")),
        Ok("3 lines".to_owned())
    );
    let refused = count(&outside.0.join("key")).unwrap_err();
    assert!(
        refused.contains("outside the folders this tool may read"),
        "{refused}"
    );
    #[cfg(unix)]
    {
        let linked = count(&granted.0.join("link")).unwrap_err();
        assert!(
            linked.contains("outside the folders"),
            "a link out is followed, then refused: {linked}"
        );
    }
    let none = toolbox
        .call(
            "count-lines",
            &input("path", &granted.0.join("notes.txt").display().to_string()),
            &Grant::default(),
            Limits::default(),
            Arc::new(NoFetch),
        )
        .unwrap_err();
    assert!(
        none.contains("outside the folders"),
        "an empty grant reads nothing: {none}"
    );
}

#[test]
fn a_tool_reaches_only_the_hosts_its_grant_names() {
    let toolbox = Toolbox::load(example(), Limits::default()).expect("it loads");
    let recorded = Arc::new(Recorded::default());
    let grant = Grant {
        hosts: vec!["example.com".to_owned()],
        ..Grant::default()
    };
    let measure = |url: &str| {
        toolbox.call(
            "measure",
            &input("url", url),
            &grant,
            Limits::default(),
            Arc::clone(&recorded) as Arc<dyn Fetch>,
        )
    };

    assert_eq!(
        measure("https://api.example.com/status"),
        Ok("12 bytes".to_owned())
    );
    let refused = measure("https://evil.example/collect?d=1").unwrap_err();
    assert!(
        refused.contains("evil.example is not a host this tool may reach"),
        "{refused}"
    );
    let slashed = measure("https://evil.example\\.example.com/collect").unwrap_err();
    assert!(
        slashed.contains("evil.example is not a host this tool may reach"),
        "{slashed}"
    );
    let hidden = measure("https://example.com@evil.example/").unwrap_err();
    assert!(hidden.contains("plain host"), "{hidden}");
    assert_eq!(
        *recorded.0.lock().unwrap(),
        ["https://api.example.com/status"]
    );
}

#[test]
fn a_tool_reads_only_the_variables_its_grant_names() {
    let toolbox = Toolbox::load(example(), Limits::default()).expect("it loads");
    let grant = Grant {
        secrets: vec!["HOME".to_owned()],
        ..Grant::default()
    };
    let length = |name: &str| {
        toolbox.call(
            "token-length",
            &input("name", name),
            &grant,
            Limits::default(),
            Arc::new(NoFetch),
        )
    };

    let home = std::env::var("HOME").expect("a home");
    assert_eq!(
        length("HOME"),
        Ok(format!("{} characters", home.chars().count()))
    );
    let refused = length("PATH").unwrap_err();
    assert!(
        refused.contains("PATH is not a variable this tool may read"),
        "{refused}"
    );
}

#[test]
fn a_call_stops_at_its_fuel_its_deadline_and_its_memory() {
    let toolbox = Toolbox::load(unruly(), Limits::default()).expect("it loads");
    let run = |tool: &str, limits: Limits| {
        toolbox
            .call(
                tool,
                &input("path", "/"),
                &Grant::default(),
                limits,
                Arc::new(NoFetch),
            )
            .unwrap_err()
    };

    let fuel = run(
        "spin",
        Limits {
            fuel: 5_000_000,
            ..Limits::default()
        },
    );
    let deadline = run(
        "spin",
        Limits {
            fuel: u64::MAX,
            time: Duration::from_millis(200),
            ..Limits::default()
        },
    );
    let memory = run(
        "hoard",
        Limits {
            memory: 16 * 1024 * 1024,
            ..Limits::default()
        },
    );

    assert!(
        fuel.contains("it used all 5000000 units of its fuel"),
        "{fuel}"
    );
    assert!(
        deadline.contains("it ran past its limit of 0.2 seconds"),
        "{deadline}"
    );
    assert!(memory.starts_with("the tool stopped"), "{memory}");
}

#[test]
fn a_call_stops_fetching_at_its_count_and_its_bytes() {
    let toolbox = Toolbox::load(unruly(), Limits::default()).expect("it loads");
    let grant = Grant {
        hosts: vec!["example.com".to_owned()],
        ..Grant::default()
    };
    let flood = |limits: Limits| {
        let recorded = Arc::new(Recorded::default());
        let refused = toolbox
            .call(
                "flood",
                &input("url", "https://example.com/again"),
                &grant,
                limits,
                Arc::clone(&recorded) as Arc<dyn Fetch>,
            )
            .unwrap_err();
        let made = recorded.0.lock().unwrap().len();
        (refused, made)
    };

    let (counted, made) = flood(Limits {
        fetches: 3,
        ..Limits::default()
    });
    assert!(counted.contains("its limit of 3 fetches"), "{counted}");
    assert_eq!(made, 3);

    // Each answer is twelve bytes, so the third is cut to six and a fourth
    // is never asked for.
    let (measured, made) = flood(Limits {
        fetched: 30,
        ..Limits::default()
    });
    assert!(measured.contains("their limit of 30 bytes"), "{measured}");
    assert_eq!(made, 3);
}

/// A way out that says what it was allowed, and answers slowly enough that
/// the call's time runs out between fetches.
#[derive(Default)]
struct Allowed(Mutex<Vec<Allowance>>);

impl Fetch for Allowed {
    fn fetch(&self, _: &str, _: &[String], allowance: Allowance) -> Result<String, String> {
        self.0.lock().unwrap().push(allowance);
        std::thread::sleep(Duration::from_millis(150));
        Ok("slow".to_owned())
    }
}

#[test]
fn a_fetch_is_given_only_the_time_the_call_has_left() {
    let toolbox = Toolbox::load(unruly(), Limits::default()).expect("it loads");
    let grant = Grant {
        hosts: vec!["example.com".to_owned()],
        ..Grant::default()
    };
    let allowed = Arc::new(Allowed::default());

    let refused = toolbox
        .call(
            "flood",
            &input("url", "https://example.com/slow"),
            &grant,
            Limits {
                time: Duration::from_millis(400),
                ..Limits::default()
            },
            Arc::clone(&allowed) as Arc<dyn Fetch>,
        )
        .unwrap_err();

    let given = allowed.0.lock().unwrap();
    assert!(given.len() >= 2 && given.len() <= 3, "{given:?}");
    assert!(given[0].time <= Duration::from_millis(400));
    assert!(given[1].time < given[0].time);
    assert!(refused.contains("0.4 seconds"), "{refused}");
}

#[test]
fn a_file_that_is_not_a_component_is_refused_by_name() {
    let folder = Folder::new("not-a-component");
    let file = folder.0.join("tool.wasm");
    std::fs::write(&file, b"not wasm").unwrap();

    let refused = Toolbox::load(&file, Limits::default()).unwrap_err();

    assert!(refused.to_string().contains("tool.wasm"), "{refused}");
    assert!(refused.why.contains("fusion:tools"), "{}", refused.why);
}
