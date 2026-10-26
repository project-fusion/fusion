//! The Postgres connection and schema migrations every Cortex store shares.
//!
//! **A store's schema is a list of steps, and the database records how many
//! have run.** The table `cortex_migrations` holds one row per store, such as
//! `trace` or `engram`, with its version: the count of its steps applied. A
//! store opening a database runs the steps past that count and records the new
//! one, in one transaction, under an advisory lock, so two stores opening one
//! database at once migrate it once and a step that fails leaves nothing
//! behind. Each step's DDL is idempotent as well (`IF NOT EXISTS`), so a step
//! also runs cleanly over tables an operator made by hand from the same SQL.
//! The record decides what runs, and idempotence makes running it safe.
//!
//! The tables go in the first schema of the connection's `search_path`, which
//! `options[search_path]=…` in the URL sets.
//!
//! **Behind a transaction-mode pooler, every statement is unnamed.**
//! [`Database::query`] and [`Database::scalar`] mark a statement as one to
//! prepare without a name when [`Database::prepared`] is off, and a store runs
//! each of them inside a transaction, so the statement is parsed and run on the
//! one server connection the pooler gave the transaction.

use sqlx::{
    postgres::{PgArguments, PgConnectOptions, PgPoolOptions},
    query::{Query, QueryScalar},
    PgPool, SqlSafeStr,
};

use crate::{storage, Error, Result};

/// The advisory lock a migration holds, the same for every store and schema
/// in a database, so migrations run one at a time.
const MIGRATION_LOCK: i64 = 0x636f_7274_6578;

fn storage_error(error: impl std::fmt::Display) -> Error {
    Error::Storage(error.to_string())
}

/// A pool of connections to a Postgres database, and whether a statement may
/// be prepared by name on them.
#[derive(Clone, Debug)]
pub struct Database {
    pool: PgPool,
    prepared: bool,
}

impl Database {
    /// Connects to the database `location` names.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if the URL cannot be read or the database refuses
    /// the connection.
    pub async fn connect(location: &storage::Postgres) -> Result<Self> {
        let mut options: PgConnectOptions = location.url.parse().map_err(storage_error)?;
        if location.pooled {
            // A pooler passes on only the settings it keeps for each client,
            // and PgBouncer refuses a connection that sends any other.
            options = options.extra_float_digits(None).statement_cache_capacity(0);
        }
        let pool = PgPoolOptions::new()
            .connect_with(options)
            .await
            .map_err(storage_error)?;
        Ok(Self::new(pool, location.pooled))
    }

    /// A database over `pool`, whose connections go through a
    /// transaction-mode pooler when `pooled` is set.
    #[must_use]
    pub fn new(pool: PgPool, pooled: bool) -> Self {
        Self {
            pool,
            prepared: !pooled,
        }
    }

    #[must_use]
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Whether a statement may be prepared by name and kept for its next use.
    #[must_use]
    pub fn prepared(&self) -> bool {
        self.prepared
    }

    /// `sql` as a statement, prepared by name only where that is safe.
    pub fn query<'q>(&self, sql: impl SqlSafeStr) -> Query<'q, sqlx::Postgres, PgArguments> {
        sqlx::query(sql).persistent(self.prepared)
    }

    /// `sql` as a statement that reads one value, prepared by name only where
    /// that is safe.
    pub fn scalar<'q, O>(
        &self,
        sql: impl SqlSafeStr,
    ) -> QueryScalar<'q, sqlx::Postgres, O, PgArguments>
    where
        (O,): for<'r> sqlx::FromRow<'r, sqlx::postgres::PgRow>,
    {
        sqlx::query_scalar(sql).persistent(self.prepared)
    }

    /// Starts a transaction.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if no connection can be had.
    pub async fn begin(&self) -> Result<sqlx::Transaction<'static, sqlx::Postgres>> {
        self.pool.begin().await.map_err(storage_error)
    }

    /// Brings the schema of `component` up to date: runs each of `steps` past
    /// the version the database records, and records the new one.
    ///
    /// A step is never edited once released. A change to the schema is a new
    /// step at the end.
    ///
    /// # Errors
    ///
    /// [`Error::Storage`] if a step fails, which leaves the schema as it was,
    /// or the database records a version past the steps given, as a newer
    /// release leaves it.
    pub async fn migrate(&self, component: &str, steps: &[&str]) -> Result<()> {
        let mut transaction = self.begin().await?;
        self.query("SELECT pg_advisory_xact_lock($1)")
            .bind(MIGRATION_LOCK)
            .execute(&mut *transaction)
            .await
            .map_err(storage_error)?;
        sqlx::raw_sql(
            "CREATE TABLE IF NOT EXISTS cortex_migrations (
                 component TEXT PRIMARY KEY,
                 version INTEGER NOT NULL,
                 migrated_at TIMESTAMPTZ NOT NULL DEFAULT now()
             )",
        )
        .execute(&mut *transaction)
        .await
        .map_err(storage_error)?;
        let held: Option<i32> = self
            .scalar("SELECT version FROM cortex_migrations WHERE component = $1")
            .bind(component)
            .fetch_optional(&mut *transaction)
            .await
            .map_err(storage_error)?;
        let held = usize::try_from(held.unwrap_or(0)).map_err(storage_error)?;
        if held > steps.len() {
            return Err(Error::Storage(format!(
                "the {component} schema is at version {held}, past the {} this release knows",
                steps.len()
            )));
        }
        if held == steps.len() {
            return transaction.commit().await.map_err(storage_error);
        }
        for step in &steps[held..] {
            sqlx::raw_sql(sqlx::AssertSqlSafe(*step))
                .execute(&mut *transaction)
                .await
                .map_err(storage_error)?;
        }
        self.query(
            "INSERT INTO cortex_migrations (component, version) VALUES ($1, $2)
             ON CONFLICT (component) DO UPDATE SET version = $2, migrated_at = now()",
        )
        .bind(component)
        .bind(i32::try_from(steps.len()).map_err(storage_error)?)
        .execute(&mut *transaction)
        .await
        .map_err(storage_error)?;
        transaction.commit().await.map_err(storage_error)
    }
}

/// The variable that names a database for the Postgres conformance suites.
pub const TEST_DATABASE: &str = "CORTEX_POSTGRES_URL";

/// Runs `run` against a schema of its own in the database [`TEST_DATABASE`]
/// names, and drops the schema after, whether `run` passed or panicked.
/// Returns false, and runs nothing, when the variable is not set.
///
/// # Panics
///
/// If the variable is not a `postgres://` URL, the schema cannot be created
/// or dropped, or `run` panics.
#[doc(hidden)]
pub async fn in_scratch_schema<F, Run>(run: F) -> bool
where
    F: FnOnce(storage::Postgres) -> Run,
    Run: std::future::Future<Output = ()> + Send + 'static,
{
    let Ok(url) = std::env::var(TEST_DATABASE) else {
        eprintln!("skipped: set {TEST_DATABASE} to a Postgres database to run the Postgres suite");
        return false;
    };
    let Ok(storage::Location::Postgres(location)) = storage::Location::parse(&url) else {
        panic!("{TEST_DATABASE} is not a postgres:// URL");
    };
    let schema = format!("cortex_test_{}", crate::Id::new().0.simple());
    let admin = Database::connect(&location)
        .await
        .expect("the test database");
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!("CREATE SCHEMA {schema}")))
        .execute(admin.pool())
        .await
        .expect("a scratch schema");
    let separator = if location.url.contains('?') { '&' } else { '?' };
    let scoped = storage::Postgres {
        pooled: location.pooled,
        url: format!("{}{separator}options[search_path]={schema}", location.url),
    };
    let outcome = tokio::spawn(run(scoped)).await;
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!("DROP SCHEMA {schema} CASCADE")))
        .execute(admin.pool())
        .await
        .expect("the scratch schema dropped");
    admin.pool().close().await;
    if let Err(error) = outcome {
        std::panic::resume_unwind(error.into_panic());
    }
    true
}
