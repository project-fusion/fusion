//! Where a store keeps its data, named by one connection string.
//!
//! **A connection string picks the backend.** `sqlite:` or a file path is a
//! `SQLite` file, `sqlite::memory:` is a database that lives as long as the
//! store, and `postgres://` or `postgresql://` is a Postgres database. A hosted
//! Postgres, such as Supabase, Neon, or RDS, is a `postgres://` URL like any
//! other, and nothing here is specific to one of them.
//!
//! **A transaction-mode pooler turns prepared statements off.** A pooler such
//! as `PgBouncer` or Supavisor in transaction mode hands each transaction to
//! whichever server connection is free, so a statement prepared by name on one
//! is missing on the next. A store behind one prepares each statement without
//! a name and runs it inside the transaction it belongs to. The URL says so
//! with `pooler=transaction`, and port 6543, the port Supabase's transaction
//! pooler listens on, says so without it. `pooler=session` says a connection
//! on port 6543 is direct.
//!
//! An error names what was wrong with a connection string and never repeats
//! it, since it can hold a password.
//!
//! ```
//! use fusion_cortex_core::storage::Location;
//!
//! let local = Location::parse("memory.db").unwrap();
//! let pooled = Location::parse("postgres://cortex@db.example.com:6543/cortex").unwrap();
//!
//! assert!(matches!(local, Location::Sqlite(_)));
//! assert!(matches!(pooled, Location::Postgres(postgres) if postgres.pooled));
//! ```

use std::path::PathBuf;

use crate::{Error, Result};

/// The port Supabase's transaction pooler listens on.
pub const TRANSACTION_POOLER_PORT: u16 = 6543;

/// Where a store keeps its data.
#[derive(Clone, Debug, PartialEq)]
pub enum Location {
    /// A `SQLite` file, created where it does not exist.
    Sqlite(PathBuf),
    /// A `SQLite` database in memory, which lives as long as the store.
    Memory,
    /// A Postgres database.
    Postgres(Postgres),
}

/// A Postgres database, by its URL.
#[derive(Clone, PartialEq)]
pub struct Postgres {
    /// The URL, without the `pooler` parameter, which is Cortex's own.
    pub url: String,
    /// Whether the connection goes through a transaction-mode pooler, so
    /// statements are prepared without a name.
    pub pooled: bool,
}

/// The URL is left out, since it can hold a password.
impl std::fmt::Debug for Postgres {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Postgres")
            .field("pooled", &self.pooled)
            .finish_non_exhaustive()
    }
}

impl Location {
    /// The location `text` names.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if `text` is empty, names a scheme other than
    /// `sqlite` or `postgres`, or sets `pooler` to anything but `transaction`
    /// or `session`.
    pub fn parse(text: &str) -> Result<Self> {
        let text = text.trim();
        if text.is_empty() {
            return Err(Error::Storage("a storage location is empty".into()));
        }
        if matches!(text, "sqlite::memory:" | "sqlite://:memory:" | ":memory:") {
            return Ok(Self::Memory);
        }
        if let Some(path) = text
            .strip_prefix("sqlite://")
            .or_else(|| text.strip_prefix("sqlite:"))
        {
            // SQLite's own URL parameters, such as `mode`, are the store's to
            // set.
            let path = path.split('?').next().unwrap_or_default();
            if path.is_empty() {
                return Err(Error::Storage("a sqlite: location names no file".into()));
            }
            return Ok(Self::Sqlite(PathBuf::from(path)));
        }
        if text.starts_with("postgres://") || text.starts_with("postgresql://") {
            return Postgres::parse(text).map(Self::Postgres);
        }
        if let Some((scheme, _)) = text.split_once("://") {
            return Err(Error::Storage(format!(
                "{scheme}:// is not a storage location: use sqlite: or postgres://"
            )));
        }
        Ok(Self::Sqlite(PathBuf::from(text)))
    }
}

impl Postgres {
    fn parse(url: &str) -> Result<Self> {
        let (base, query) = url.split_once('?').unwrap_or((url, ""));
        let mut mode = None;
        let mut kept = Vec::new();
        for pair in query.split('&').filter(|pair| !pair.is_empty()) {
            match pair.split_once('=') {
                Some(("pooler", value)) => mode = Some(value),
                _ => kept.push(pair),
            }
        }
        let pooled = match mode {
            Some("transaction") => true,
            Some("session") => false,
            Some(other) => {
                return Err(Error::Storage(format!(
                    "pooler={other} is not a pooler mode: use transaction or session"
                )))
            }
            None => port(base) == Some(TRANSACTION_POOLER_PORT),
        };
        let url = if kept.is_empty() {
            base.to_owned()
        } else {
            format!("{base}?{}", kept.join("&"))
        };
        Ok(Self { url, pooled })
    }
}

/// The port in the authority of `url`, where it names one.
fn port(url: &str) -> Option<u16> {
    let after = url.split_once("://")?.1;
    let authority = after.split(['/', '?']).next()?;
    let host = authority
        .rsplit_once('@')
        .map_or(authority, |(_, host)| host);
    let port = match host.rsplit_once(']') {
        // An IPv6 address, in brackets.
        Some((_, rest)) => rest.strip_prefix(':')?,
        None => host.rsplit_once(':')?.1,
    };
    port.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn postgres(text: &str) -> Postgres {
        match Location::parse(text).unwrap() {
            Location::Postgres(postgres) => postgres,
            other => panic!("{text} is {other:?}"),
        }
    }

    #[test]
    fn a_path_or_a_sqlite_url_is_a_file() {
        for text in [
            "memory.db",
            "./data/memory.db",
            "sqlite:memory.db",
            "sqlite://memory.db?mode=rwc",
        ] {
            assert!(
                matches!(Location::parse(text).unwrap(), Location::Sqlite(path) if path.ends_with("memory.db")),
                "{text}"
            );
        }
        assert_eq!(
            Location::parse("sqlite::memory:").unwrap(),
            Location::Memory
        );
        assert!(Location::parse("  ").is_err());
        assert!(Location::parse("sqlite:").is_err());
    }

    #[test]
    fn a_postgres_url_is_postgres_and_another_scheme_is_an_error() {
        assert!(!postgres("postgres://cortex:secret@localhost/cortex").pooled);
        assert!(!postgres("postgresql://localhost:5432/cortex?sslmode=require").pooled);
        let error = Location::parse("mysql://root:secret@localhost/cortex").unwrap_err();
        assert!(error.to_string().contains("mysql://"), "{error}");
        assert!(!error.to_string().contains("secret"), "{error}");
    }

    #[test]
    fn port_6543_or_the_pooler_parameter_turns_prepared_statements_off() {
        let supabase = postgres(
            "postgres://postgres.ref:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
        );
        assert!(supabase.pooled);
        assert!(postgres("postgres://[::1]:6543/cortex").pooled);

        let named = postgres("postgres://localhost:6432/cortex?sslmode=require&pooler=transaction");
        assert!(named.pooled);
        assert_eq!(
            named.url,
            "postgres://localhost:6432/cortex?sslmode=require"
        );

        let direct = postgres("postgres://localhost:6543/cortex?pooler=session");
        assert!(!direct.pooled);
        assert_eq!(direct.url, "postgres://localhost:6543/cortex");

        let error = Location::parse("postgres://localhost/cortex?pooler=statement").unwrap_err();
        assert!(error.to_string().contains("pooler=statement"), "{error}");
    }

    #[test]
    fn a_postgres_location_prints_without_its_url() {
        let printed = format!(
            "{:?}",
            postgres("postgres://cortex:secret@localhost/cortex")
        );
        assert!(!printed.contains("secret"), "{printed}");
    }
}
