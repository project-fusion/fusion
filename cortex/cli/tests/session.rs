//! The scripted session, run through the `cortex` binary.
//!
//! **A week of notes, a question that needs three of them, and the answer
//! after one is forgotten.** The notes are in `demo/notes`, and the replies
//! and vectors in `demo/week.json`, so the session needs no model. It runs on
//! SQLite always, on Postgres where `CORTEX_POSTGRES_URL` names a database,
//! and on Ollama where `CORTEX_OLLAMA_MODEL` names a chat model the server has
//! pulled, with `CORTEX_OLLAMA_EMBED_MODEL` for the embedder:
//!
//! ```sh
//! CORTEX_OLLAMA_MODEL=qwen3:1.7b CORTEX_OLLAMA_EMBED_MODEL=nomic-embed-text \
//!   cargo test -p fusion-cortex-cli --test session
//! ```

use std::{
    path::{Path, PathBuf},
    process::{Command, Output},
};

use serde_json::Value;

const QUESTION: &str = "Who reviews the 0.12 schema migration, and when does the release ship?";

const WEEK: [(&str, &str); 5] = [
    ("monday", "2026-10-19"),
    ("tuesday", "2026-10-20"),
    ("wednesday", "2026-10-21"),
    ("thursday", "2026-10-22"),
    ("friday", "2026-10-23"),
];

/// The variables a command reads, which a test sets or leaves out itself.
const SETTINGS: [&str; 14] = [
    "CORTEX_BASE",
    "CORTEX_CONFIG",
    "CORTEX_EMBED_BASE",
    "CORTEX_EMBED_KEY_ENV",
    "CORTEX_EMBED_MODEL",
    "CORTEX_EMBEDDER",
    "CORTEX_KEY_ENV",
    "CORTEX_MODEL",
    "CORTEX_PROVIDER",
    "CORTEX_READ",
    "CORTEX_SCOPE",
    "CORTEX_SCRIPT",
    "CORTEX_STORE",
    "CORTEX_OLLAMA_MODEL",
];

/// A command with none of your settings: no `CORTEX_` variable, and no
/// config file from your home directory.
fn isolated(program: impl AsRef<std::ffi::OsStr>) -> Command {
    let mut command = Command::new(program);
    for name in SETTINGS {
        command.env_remove(name);
    }
    command
        .current_dir(demo())
        .env("NO_COLOR", "1")
        .env("XDG_CONFIG_HOME", demo().join("no-config"));
    command
}

fn demo() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("demo")
}

/// A directory of its own, removed when the test ends.
struct Scratch(PathBuf);

impl Scratch {
    fn new(name: &str) -> Self {
        let dir = std::env::temp_dir().join(format!("cortex-{name}-{}", uuid::Uuid::now_v7()));
        std::fs::create_dir_all(&dir).unwrap();
        Self(dir)
    }

    fn store(&self) -> String {
        self.0.join("cortex.db").to_string_lossy().into_owned()
    }
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// How the binary is run: the store, and the models.
#[derive(Clone)]
struct Run {
    env: Vec<(&'static str, String)>,
}

impl Run {
    fn scripted(store: &str) -> Self {
        Self {
            env: vec![
                ("CORTEX_STORE", store.to_owned()),
                ("CORTEX_PROVIDER", "scripted".into()),
                ("CORTEX_MODEL", "week".into()),
                ("CORTEX_EMBEDDER", "scripted".into()),
                (
                    "CORTEX_SCRIPT",
                    demo().join("week.json").to_string_lossy().into_owned(),
                ),
            ],
        }
    }

    fn cortex(&self, args: &[&str]) -> Output {
        let mut command = isolated(env!("CARGO_BIN_EXE_cortex"));
        command.args(args);
        for (name, value) in &self.env {
            command.env(name, value);
        }
        command.output().expect("cortex runs")
    }

    /// Runs `args` with `--json` and returns the report, failing on any exit
    /// but zero.
    fn json(&self, args: &[&str]) -> Value {
        let mut all = args.to_vec();
        all.push("--json");
        let output = self.cortex(&all);
        assert!(
            output.status.success(),
            "cortex {args:?} exited {:?}: {}",
            output.status.code(),
            String::from_utf8_lossy(&output.stderr)
        );
        serde_json::from_slice(&output.stdout).unwrap_or_else(|error| {
            panic!(
                "cortex {args:?} printed no JSON ({error}): {}",
                String::from_utf8_lossy(&output.stdout)
            )
        })
    }

    fn day(&self, day: &str, at: &str) {
        let note = format!("notes/{day}.md");
        self.json(&["ingest", &note, "--at", at]);
        self.json(&["consolidate"]);
    }
}

/// Each file an answer's facts rest on, by its name, such as `monday.md`.
fn files(why: &Value) -> Vec<String> {
    let mut files: Vec<String> = why["derivation"]["facts"]
        .as_array()
        .unwrap()
        .iter()
        .flat_map(|fact| fact["episodes"].as_array().unwrap().clone())
        .filter_map(|episode| {
            let source = episode["source"].as_str()?;
            let path = source.strip_prefix("file://")?.split('#').next()?;
            Some(Path::new(path).file_name()?.to_string_lossy().into_owned())
        })
        .collect();
    files.sort();
    files.dedup();
    files
}

/// The session, with checks that hold for any model: the answer traces to
/// its episodes, and after `forget` nothing traces to the forgotten note.
/// Returns the two answers.
fn session(run: &Run) -> (String, String) {
    for (day, at) in WEEK {
        run.day(day, at);
    }

    let first = run.json(&["ask", QUESTION]);
    let id = first["id"].as_str().unwrap().to_owned();
    let why = run.json(&["why"]);
    assert_eq!(why["kind"], "answer");
    assert_eq!(why["answer"]["id"], id.as_str());
    assert_eq!(why["derivation"]["question"], QUESTION);
    for placed in why["derivation"]["facts"].as_array().unwrap() {
        assert!(
            !placed["reason"].as_str().unwrap().is_empty(),
            "each fact says why it was placed"
        );
        assert!(
            !placed["episodes"].as_array().unwrap().is_empty(),
            "each fact reaches its episodes: {placed}"
        );
    }

    let forgot = run.json(&["forget", "notes/wednesday.md"]);
    assert_eq!(forgot["episodes"].as_array().unwrap().len(), 2);
    if files(&why).iter().any(|file| file == "wednesday.md") {
        assert!(
            forgot["answers"]
                .as_array()
                .unwrap()
                .iter()
                .any(|answer| answer == id.as_str()),
            "an answer that drew on the note goes with it: {forgot}"
        );
    }

    let second = run.json(&["ask", QUESTION]);
    let why = run.json(&["why"]);
    assert_eq!(why["answer"]["id"], second["id"]);
    assert!(
        !files(&why).contains(&"wednesday.md".to_owned()),
        "the answer draws on nothing from the forgotten note: {why}"
    );
    (
        first["answer"].as_str().unwrap().to_owned(),
        second["answer"].as_str().unwrap().to_owned(),
    )
}

/// The checks the script makes exact.
fn scripted_session(run: &Run) {
    let (before, after) = session(run);
    assert!(before.contains("so Sam reviews"), "{before}");
    assert!(
        after.contains("Priya reviews its schema migration"),
        "{after}"
    );
}

#[test]
fn the_scripted_session_answers_from_three_notes_and_forgets_one() {
    let scratch = Scratch::new("session");
    let run = Run::scripted(&scratch.store());
    for (day, at) in &WEEK[..3] {
        run.day(day, at);
    }

    let asked = run.json(&["ask", QUESTION]);
    assert_eq!(asked["provider"], "scripted/week");
    assert_eq!(asked["local"], true);
    assert!(asked["scorer"]
        .as_str()
        .unwrap()
        .starts_with("weighted/1 (overlap/2 0.30, vector/1 scripted/week 0.70)"));
    let why = run.json(&["why", asked["id"].as_str().unwrap()]);
    assert_eq!(
        files(&why),
        ["monday.md", "tuesday.md", "wednesday.md"],
        "the answer rests on three notes"
    );

    let replay = run.json(&["replay", "--model", "large"]);
    assert_eq!(replay["identical"], false);
    assert_eq!(replay["before"]["id"], asked["id"]);
    assert_eq!(replay["after"]["provider"], "scripted/large");
    assert!(replay["changes"]
        .as_array()
        .unwrap()
        .iter()
        .any(|change| change["op"] == "added"));

    let forgot = run.json(&["forget", "notes/wednesday.md"]);
    let removed: Vec<&str> = forgot["facts"]
        .as_array()
        .unwrap()
        .iter()
        .map(|fact| fact["content"].as_str().unwrap())
        .collect();
    assert_eq!(
        removed,
        [
            "Priya is out on Thursday, October 22.",
            "Sam covers Priya's reviews while she is out.",
            "The design review is next Tuesday.",
        ]
    );
    assert_eq!(forgot["answers"][0], asked["id"]);
    // The answer went with the note it drew on.
    let gone = run.cortex(&["why", asked["id"].as_str().unwrap()]);
    assert_eq!(gone.status.code(), Some(3));
}

#[test]
fn the_scripted_session_runs_a_whole_week_on_sqlite() {
    let scratch = Scratch::new("week");
    scripted_session(&Run::scripted(&scratch.store()));
}

#[tokio::test(flavor = "multi_thread")]
async fn the_scripted_session_runs_a_whole_week_on_postgres() {
    fusion_cortex_core::postgres::in_scratch_schema(|location| async move {
        tokio::task::spawn_blocking(move || scripted_session(&Run::scripted(&location.url)))
            .await
            .unwrap();
    })
    .await;
}

#[test]
fn consolidation_supersedes_and_a_restated_fact_gains_a_source() {
    let scratch = Scratch::new("sources");
    let run = Run::scripted(&scratch.store());
    for (day, at) in &WEEK[..3] {
        run.day(day, at);
    }
    run.json(&["ingest", "notes/thursday.md", "--at", "2026-10-22"]);
    let thursday = run.json(&["consolidate"]);
    assert_eq!(
        thursday["superseded"][0]["old"]["content"],
        "Standup is at 10:00."
    );
    assert_eq!(thursday["superseded"][0]["old"]["current"], false);
    run.json(&["ingest", "notes/friday.md", "--at", "2026-10-23"]);
    let friday = run.json(&["consolidate"]);
    assert_eq!(
        friday["sourced"][0]["fact"]["content"],
        "Dana owns the release notes."
    );
    assert_eq!(
        friday["sourced"][0]["fact"]["sources"]
            .as_array()
            .unwrap()
            .len(),
        2
    );

    // Forgetting Thursday makes the fact it superseded current again.
    let forgot = run.json(&["forget", "notes/thursday.md"]);
    assert_eq!(forgot["restored"][0]["content"], "Standup is at 10:00.");
}

#[test]
fn a_fact_that_outlives_a_forgotten_episode_still_traces_to_its_own() {
    let scratch = Scratch::new("reanchor");
    let run = Run::scripted(&scratch.store());
    // Monday and Wednesday in one pass: one extraction reads both.
    run.json(&["ingest", "notes/monday.md", "--at", "2026-10-19"]);
    run.json(&["ingest", "notes/wednesday.md", "--at", "2026-10-21"]);
    let pass = run.json(&["consolidate"]);
    assert_eq!(pass["read"], 5);

    let forgot = run.json(&["forget", "notes/wednesday.md"]);
    assert_eq!(
        forgot["reanchored"].as_array().unwrap().len(),
        3,
        "Monday's facts lost the pass that wrote them: {forgot}"
    );
    run.json(&["ask", QUESTION]);
    let why = run.json(&["why"]);
    assert_eq!(files(&why), ["monday.md"]);
    for placed in why["derivation"]["facts"].as_array().unwrap() {
        assert!(
            !placed["episodes"].as_array().unwrap().is_empty(),
            "{placed}"
        );
    }
}

#[test]
fn a_fact_id_and_text_from_a_question_name_what_why_explains() {
    let scratch = Scratch::new("targets");
    let run = Run::scripted(&scratch.store());
    run.day("monday", "2026-10-19");
    let pass = run.json(&["consolidate"]);
    assert_eq!(pass["read"], 0, "a second pass finds nothing waiting");
    run.day("tuesday", "2026-10-20");
    run.json(&["ask", QUESTION]);

    let by_text = run.json(&["why", "schema migration"]);
    assert_eq!(by_text["kind"], "answer");
    let fact = by_text["derivation"]["facts"][0]["fact"]["id"]
        .as_str()
        .unwrap()
        .to_owned();
    let by_fact = run.json(&["why", &fact]);
    assert_eq!(by_fact["kind"], "fact");
    assert!(!by_fact["fact"]["sources"].as_array().unwrap().is_empty());

    let nothing = run.cortex(&["why", "nothing like this", "--json"]);
    assert_eq!(nothing.status.code(), Some(3));
    let error: Value = serde_json::from_slice(&nothing.stderr).unwrap();
    assert_eq!(error["code"], 3);
    assert!(nothing.stdout.is_empty(), "an error leaves stdout empty");
}

#[test]
fn stdin_is_a_source_that_forget_takes_by_name() {
    let scratch = Scratch::new("stdin");
    let run = Run::scripted(&scratch.store());
    let mut command = isolated(env!("CARGO_BIN_EXE_cortex"));
    command
        .args(["ingest", "--source", "slack:releases", "--json"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped());
    for (name, value) in &run.env {
        command.env(name, value);
    }
    let mut child = command.spawn().unwrap();
    std::io::Write::write_all(
        child.stdin.as_mut().unwrap(),
        b"The release train leaves at noon.\n\nBring snacks.\n",
    )
    .unwrap();
    let output = child.wait_with_output().unwrap();
    assert!(output.status.success());
    let ingested: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(ingested["episodes"][1]["source"], "slack:releases#2");

    let forgot = run.json(&["forget", "slack:releases"]);
    assert_eq!(forgot["episodes"].as_array().unwrap().len(), 2);
    let nothing = run.cortex(&["forget", "slack:releases"]);
    assert_eq!(nothing.status.code(), Some(3));
}

/// The demo script runs the session the docs walk through.
#[cfg(unix)]
#[test]
fn the_demo_script_prints_both_answers() {
    let output = isolated("bash")
        .arg(demo().join("session.sh"))
        .env("CORTEX", env!("CARGO_BIN_EXE_cortex"))
        .output()
        .expect("bash runs");
    let out = String::from_utf8_lossy(&output.stdout);
    assert!(
        output.status.success(),
        "{out}\n{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(out.contains("so Sam reviews the 0.12 migration."), "{out}");
    assert!(
        out.contains("Priya reviews its schema migration before it ships."),
        "{out}"
    );
    assert!(out.contains("Removed 1 answer that drew on them"), "{out}");
}

#[test]
fn the_session_runs_on_a_local_ollama() {
    let Some(model) = std::env::var("CORTEX_OLLAMA_MODEL")
        .ok()
        .filter(|model| !model.trim().is_empty())
    else {
        eprintln!("skipped: CORTEX_OLLAMA_MODEL names no model");
        return;
    };
    let scratch = Scratch::new("ollama");
    let mut env = vec![
        ("CORTEX_STORE", scratch.store()),
        ("CORTEX_PROVIDER", "ollama".to_owned()),
        ("CORTEX_MODEL", model),
    ];
    match std::env::var("CORTEX_OLLAMA_EMBED_MODEL") {
        Ok(embed) if !embed.trim().is_empty() => {
            env.push(("CORTEX_EMBEDDER", "ollama".to_owned()));
            env.push(("CORTEX_EMBED_MODEL", embed));
        }
        _ => env.push(("CORTEX_EMBEDDER", "none".to_owned())),
    }
    if let Ok(base) = std::env::var("CORTEX_OLLAMA_BASE") {
        env.push(("CORTEX_BASE", base.clone()));
        env.push(("CORTEX_EMBED_BASE", base));
    }
    let (before, after) = session(&Run { env });
    eprintln!("before forgetting: {before}\nafter: {after}");
}
