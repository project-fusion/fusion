//! Who a plugin says published it, held to the names a host keeps for itself.

/// The publishers a host keeps for its own plugins, each with every name
/// under it, until publishers are verified.
///
/// **A setting each host passes in.** Which names a product keeps is that
/// product's fact, and a list written here would make every product that
/// embeds this crate keep another's.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Publishers {
    /// Such as `example.com`, which keeps `example.com` and
    /// `plugins.example.com` both.
    pub reserved: Vec<String>,
}

impl Publishers {
    /// Refuses a publisher that is not a DNS name, or that names one of the
    /// reserved publishers or a name under one.
    ///
    /// # Errors
    ///
    /// A sentence naming the publisher and why.
    pub fn check(&self, name: &str) -> Result<(), String> {
        let plain = |label: &str| {
            label
                .bytes()
                .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
        };
        let labels_ok = name.len() <= 253
            && name.split('.').all(|label| {
                !label.is_empty()
                    && label.len() <= 63
                    && plain(label)
                    && !label.starts_with('-')
                    && !label.ends_with('-')
            });
        if !labels_ok {
            return Err(format!(
                "the publisher {name} is not a DNS name of lowercase letters, digits, dots, and \
                 dashes"
            ));
        }
        if let Some(reserved) = self
            .reserved
            .iter()
            .find(|reserved| name == *reserved || name.ends_with(&format!(".{reserved}")))
        {
            return Err(format!(
                "the publisher {name} is a name this host reserves for {reserved} until \
                 publishers are verified"
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::Publishers;

    #[test]
    fn a_reserved_publisher_and_every_name_under_it_are_refused() {
        let publishers = Publishers {
            reserved: vec!["example.com".to_owned()],
        };
        assert!(publishers.check("acme.example").is_ok());
        assert!(publishers.check("notexample.com").is_ok());
        let refused = publishers.check("plugins.example.com").unwrap_err();
        assert!(refused.contains("reserves for example.com"), "{refused}");
        assert!(publishers.check("example.com").is_err());
    }

    #[test]
    fn a_publisher_is_a_dns_name() {
        let publishers = Publishers::default();
        assert!(publishers.check("Acme.example").is_err());
        assert!(publishers.check("acme..example").is_err());
        assert!(publishers.check("-acme.example").is_err());
        assert!(publishers.check("acme_example").is_err());
    }
}
