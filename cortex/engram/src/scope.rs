//! Who may read a memory.

use serde::{Deserialize, Serialize};

/// Who may read an episode or a fact.
///
/// A caller reads memory through the scopes it may read, such as its own and
/// its team's, and Recall places no fact outside them. A scope matches only
/// itself, so a caller that may read `Team("core")` reads nothing scoped to
/// `Team("web")`, and a caller that may read the organization's facts reads a
/// team's only where its scopes name that team too.
///
/// ```
/// use fusion_cortex_engram::Scope;
///
/// let team = Scope::Team("core".into());
///
/// assert_eq!(team.kind(), "team");
/// assert_eq!(team.name(), Some("core"));
/// assert_eq!(Scope::parts("team", Some("core")), Some(team));
/// ```
#[derive(Clone, Debug, Default, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(tag = "kind", content = "name", rename_all = "snake_case")]
pub enum Scope {
    /// The person whose memory it is, and nobody else.
    #[default]
    Personal,
    /// Everyone working in the project it names.
    Project(String),
    /// Everyone in the team it names.
    Team(String),
    /// Everyone in the organization.
    Organization,
}

impl Scope {
    /// The scope's kind, as a store writes it: `personal`, `project`, `team`,
    /// or `organization`.
    #[must_use]
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Personal => "personal",
            Self::Project(_) => "project",
            Self::Team(_) => "team",
            Self::Organization => "organization",
        }
    }

    /// The project or team it names, where it names one.
    #[must_use]
    pub fn name(&self) -> Option<&str> {
        match self {
            Self::Project(name) | Self::Team(name) => Some(name),
            Self::Personal | Self::Organization => None,
        }
    }

    /// The scope a store's two columns hold, or `None` where they hold no
    /// scope, such as a project without its name.
    #[must_use]
    pub fn parts(kind: &str, name: Option<&str>) -> Option<Self> {
        match (kind, name) {
            ("personal", None) => Some(Self::Personal),
            ("project", Some(name)) => Some(Self::Project(name.to_owned())),
            ("team", Some(name)) => Some(Self::Team(name.to_owned())),
            ("organization", None) => Some(Self::Organization),
            _ => None,
        }
    }

    /// The narrowest scope whose every reader may read all of `scopes`, which
    /// is the scope a fact takes from its sources. `None` for no scopes.
    ///
    /// **The rule.** Personal is inside every scope and the organization holds
    /// every scope, so personal wins and the organization yields to anything
    /// else. Projects and teams are not nested in each other, as far as Cortex
    /// knows, so sources in two different projects or teams, or in a project
    /// and a team, make the fact personal: no one of those scopes is read by
    /// everyone who may read the others.
    ///
    /// ```
    /// use fusion_cortex_engram::Scope;
    ///
    /// let core = Scope::Team("core".into());
    /// let web = Scope::Team("web".into());
    ///
    /// assert_eq!(Scope::narrowest([&core, &Scope::Organization]), Some(core.clone()));
    /// assert_eq!(Scope::narrowest([&core, &Scope::Personal]), Some(Scope::Personal));
    /// assert_eq!(Scope::narrowest([&core, &web]), Some(Scope::Personal));
    /// ```
    pub fn narrowest<'a>(scopes: impl IntoIterator<Item = &'a Self>) -> Option<Self> {
        let mut any = false;
        let mut named: Option<&Self> = None;
        for scope in scopes {
            any = true;
            match scope {
                Self::Personal => return Some(Self::Personal),
                Self::Organization => {}
                other => match named {
                    None => named = Some(other),
                    Some(held) if held == other => {}
                    Some(_) => return Some(Self::Personal),
                },
            }
        }
        any.then(|| named.cloned().unwrap_or(Self::Organization))
    }
}

impl std::fmt::Display for Scope {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.name() {
            Some(name) => write!(f, "{} {name}", self.kind()),
            None => write!(f, "{}", self.kind()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_scope_reads_back_from_its_json_and_its_columns() {
        for scope in [
            Scope::Personal,
            Scope::Project("checkout".into()),
            Scope::Team("core".into()),
            Scope::Organization,
        ] {
            let json = serde_json::to_string(&scope).unwrap();
            assert_eq!(
                serde_json::from_str::<Scope>(&json).unwrap(),
                scope,
                "{json}"
            );
            assert_eq!(Scope::parts(scope.kind(), scope.name()), Some(scope));
        }
        assert_eq!(Scope::parts("team", None), None, "a team names itself");
        assert_eq!(Scope::parts("personal", Some("dana")), None);
    }

    #[test]
    fn the_narrowest_scope_is_one_every_reader_may_read() {
        let checkout = Scope::Project("checkout".into());
        let core = Scope::Team("core".into());

        assert_eq!(Scope::narrowest([]), None);
        assert_eq!(
            Scope::narrowest([&Scope::Organization]),
            Some(Scope::Organization)
        );
        assert_eq!(
            Scope::narrowest([&checkout, &checkout, &Scope::Organization]),
            Some(checkout.clone())
        );
        assert_eq!(
            Scope::narrowest([&checkout, &core]),
            Some(Scope::Personal),
            "a project and a team are not nested"
        );
        assert_eq!(
            Scope::narrowest([&checkout, &Scope::Project("search".into())]),
            Some(Scope::Personal)
        );
    }
}
