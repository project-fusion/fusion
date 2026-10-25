//! A tool from outside, which is what the tool host exists to run.
//!
//! **It reaches the world only through what the host lends**: a file, a URL,
//! and a secret, each checked against the grant the person gave it. Each tool
//! here uses one of the three and answers with a count, so the example is
//! about the boundary, and the tests can tell what each call reached.

wit_bindgen::generate!({ path: "../wit/tools.wit", world: "tool" });

use fusion::tools::host;
use serde_json::Value;

struct Tools;

/// One tool's spec, with an input of one string field.
fn spec(name: &str, description: &str, field: &str) -> Spec {
    Spec {
        name: name.to_owned(),
        description: description.to_owned(),
        input_schema: format!(
            r#"{{"type":"object","properties":{{"{field}":{{"type":"string"}}}},"required":["{field}"]}}"#
        ),
        read_only: true,
    }
}

impl Guest for Tools {
    fn world_version() -> u32 {
        1
    }

    fn tools() -> Vec<Spec> {
        let mut tools = vec![
            spec("count-lines", "Counts the lines in a file.", "path"),
            spec("measure", "Fetches a URL and says how long its answer is.", "url"),
            spec("token-length", "Says how long a token is, and never what it is.", "name"),
        ];
        if cfg!(feature = "unruly") {
            tools.push(spec("spin", "Counts forever.", "path"));
            tools.push(spec("hoard", "Keeps memory forever.", "path"));
            tools.push(spec("flood", "Fetches a URL until the host says no.", "url"));
        }
        tools
    }

    fn call(name: String, input: String) -> Result<String, String> {
        let input: Value =
            serde_json::from_str(&input).map_err(|why| format!("the input will not read: {why}"))?;
        let field = |key: &str| input[key].as_str().unwrap_or_default().to_owned();
        match name.as_str() {
            "count-lines" => {
                let text = host::read_file(&field("path"))?;
                Ok(format!("{} lines", text.lines().count()))
            }
            "measure" => {
                let text = host::fetch(&field("url"))?;
                Ok(format!("{} bytes", text.len()))
            }
            "token-length" => {
                let value = host::secret(&field("name"))?;
                Ok(format!("{} characters", value.chars().count()))
            }
            #[cfg(feature = "unruly")]
            "spin" => {
                let mut count: u64 = 0;
                loop {
                    count = std::hint::black_box(count.wrapping_add(1));
                }
            }
            #[cfg(feature = "unruly")]
            "flood" => loop {
                host::fetch(&field("url"))?;
            },
            #[cfg(feature = "unruly")]
            "hoard" => {
                let mut kept: Vec<Vec<u8>> = Vec::new();
                loop {
                    kept.push(std::hint::black_box(vec![1; 1 << 20]));
                }
            }
            _ => Err(format!("no tool here is called {name}")),
        }
    }
}

export!(Tools);
