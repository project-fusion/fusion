//! `helix mcp init`: the client's configuration, written once by a person.
//!
//! **One server added to the file the client reads, and nothing else
//! touched.** The file belongs to the project and may hold other servers, so
//! it is read, the `helix` entry is added, and every other key is written
//! back as it was. An existing `helix` entry is kept unless `--force` says to
//! replace it. Nothing else is written: no instructions file and no rules,
//! which are the project's to write.
//!
//! **The command is `npx @fusion.dev/helix-cli mcp`**, which runs the copy
//! the project installed, so the server answers for the installed version.
//! A bare `helix` would be whatever is first on the client's `PATH`.

use std::path::{Path, PathBuf};

use fusion_rules::error::{Failure, Outcome};
use fusion_rules::exit::Code;
use serde_json::{json, Map, Value};

use crate::args::{Client, McpInit};

/// The file a client reads, relative to the project, and the key its servers
/// sit under.
const fn target(client: Client) -> (&'static str, &'static str) {
    match client {
        Client::Claude => (".mcp.json", "mcpServers"),
        Client::Cursor => (".cursor/mcp.json", "mcpServers"),
        Client::Vscode => (".vscode/mcp.json", "servers"),
    }
}

/// The server entry, in the shape each client reads.
fn entry(client: Client) -> Value {
    let args = json!(["@fusion.dev/helix-cli", "mcp"]);
    match client {
        Client::Vscode => json!({ "args": args, "command": "npx", "type": "stdio" }),
        Client::Claude | Client::Cursor => json!({ "args": args, "command": "npx" }),
    }
}

/// # Errors
///
/// [`Failure`] when the file is not JSON, when it already configures a
/// `helix` server and `--force` was not given, or when it cannot be written.
pub fn run(args: &McpInit, from: &Path, json: bool) -> Outcome<Code> {
    let (file, key) = target(args.client);
    let path: PathBuf = from.join(file);
    let mut config: Map<String, Value> = if path.is_file() {
        let text = std::fs::read_to_string(&path).map_err(|failure| {
            Failure::input(
                format!("cannot read {}", path.display()),
                failure.to_string(),
            )
        })?;
        match serde_json::from_str(&text) {
            Ok(Value::Object(config)) => config,
            Ok(_) | Err(_) => {
                return Err(Failure::input(
                    format!("cannot add to {}", path.display()),
                    "it is not a JSON object, and a file with comments is rewritten by hand",
                ));
            }
        }
    } else {
        Map::new()
    };

    let servers = config
        .entry(key.to_owned())
        .or_insert_with(|| Value::Object(Map::new()));
    let Some(servers) = servers.as_object_mut() else {
        return Err(Failure::input(
            format!("cannot add to {}", path.display()),
            format!("`{key}` is not an object"),
        ));
    };
    if servers.contains_key("helix") && !args.force {
        return Err(Failure::input(
            format!("{} already has a helix server", path.display()),
            "it is kept as it is",
        )
        .hint(format!(
            "helix mcp init --client {} --force",
            name(args.client)
        )));
    }
    servers.insert("helix".to_owned(), entry(args.client));

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|failure| {
            Failure::input(
                format!("cannot write {}", path.display()),
                failure.to_string(),
            )
        })?;
    }
    let written = serde_json::to_string_pretty(&Value::Object(config)).map_err(|failure| {
        Failure::new(Code::Internal, "cannot write JSON", failure.to_string())
    })?;
    std::fs::write(&path, format!("{written}\n")).map_err(|failure| {
        Failure::input(
            format!("cannot write {}", path.display()),
            failure.to_string(),
        )
    })?;

    if json {
        fusion_rules::say!(
            "{}",
            json!({ "client": name(args.client), "written": path.display().to_string() })
        );
    } else {
        eprintln!("helix: wrote the helix server to {}", path.display());
        eprintln!("  it runs the @fusion.dev/helix-cli this project installs");
    }
    Ok(Code::Ok)
}

const fn name(client: Client) -> &'static str {
    match client {
        Client::Claude => "claude",
        Client::Cursor => "cursor",
        Client::Vscode => "vscode",
    }
}
