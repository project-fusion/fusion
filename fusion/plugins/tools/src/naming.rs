//! The name a model is offered a plugin's tool by.

/// How a host names the tools its plugins provide.
///
/// **A setting each host passes in.** The prefix tells a model and a person a
/// plugin's tool from the host's own, and which prefix a product uses is that
/// product's fact.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Naming {
    /// What every plugin tool's name starts with, before two underscores.
    pub prefix: String,
}

impl Naming {
    /// `<prefix>__<plugin>__<tool>`, where the plugin is its id, with any
    /// character a model API refuses made an underscore: with the prefix
    /// `ext`, `acme.example/whisper`'s `transcribe` is
    /// `ext__acme_example_whisper__transcribe`, since the APIs take letters,
    /// digits, `_`, and `-` alone.
    #[must_use]
    pub fn name(&self, plugin: &str, tool: &str) -> String {
        format!("{}__{plugin}__{tool}", self.prefix)
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                    c
                } else {
                    '_'
                }
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::Naming;

    #[test]
    fn a_tool_is_named_for_its_plugin_in_letters_a_model_api_takes() {
        let naming = Naming {
            prefix: "ext".to_owned(),
        };
        assert_eq!(
            naming.name("release-kit", "count-lines"),
            "ext__release-kit__count-lines"
        );
        assert_eq!(naming.name("kit", "look.up"), "ext__kit__look_up");
        assert_eq!(
            naming.name("acme.example/whisper", "transcribe"),
            "ext__acme_example_whisper__transcribe"
        );
    }
}
