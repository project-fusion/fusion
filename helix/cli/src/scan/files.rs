//! The files a scan reads: what the repository holds, less what a build, a
//! package manager, or a test wrote.
//!
//! **The repository's own list where there is one.** `git ls-files` names
//! every tracked file and every new one `.gitignore` lets through, so a
//! project's own rules about what is generated are kept. Outside a
//! repository, the walk skips the folders a build or a package manager
//! writes.
//!
//! **Tests are left out.** A spec renders a component with a wrong value on
//! purpose, to show it falls back, and a page never loads a test.

use std::path::{Component, Path, PathBuf};
use std::process::Command;

use fusion_rules::walk::{crawl, GENERATED};

/// What a scan does with a file, by its name.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    /// A stylesheet. `line_comments` is whether `//` opens a comment.
    Sheet { line_comments: bool },
    /// A stylesheet in a language the scan does not read: Sass's indented
    /// syntax, and Stylus.
    Unsupported,
    /// HTML, or a framework's template file.
    Template,
    /// MDX: markup, with the code samples taken out.
    Mdx,
    /// JavaScript or TypeScript. `jsx` is whether JSX may be in it.
    Module { jsx: bool },
}

/// What a scan does with the file at `path`, or `None` to leave it alone.
pub fn kind(path: &Path) -> Option<Kind> {
    let name = path.file_name()?.to_str()?;
    if [".test.", ".spec.", ".d.ts", ".d.mts", ".d.cts", ".min."]
        .iter()
        .any(|mark| name.contains(mark))
    {
        return None;
    }
    let extension = name.rsplit_once('.')?.1.to_ascii_lowercase();
    Some(match extension.as_str() {
        "css" | "pcss" | "postcss" => Kind::Sheet {
            line_comments: false,
        },
        "scss" | "less" => Kind::Sheet {
            line_comments: true,
        },
        "sass" | "styl" | "stylus" => Kind::Unsupported,
        "html" | "htm" | "vue" | "svelte" | "astro" => Kind::Template,
        "mdx" => Kind::Mdx,
        /* JSX in a `.js` file is common enough that a scan reads for it. */
        "js" | "jsx" | "mjs" | "cjs" | "tsx" => Kind::Module { jsx: true },
        "ts" | "mts" | "cts" => Kind::Module { jsx: false },
        _ => return None,
    })
}

/// Whether a path, relative to the root, is somewhere a scan does not read:
/// a folder a build or a package manager writes, or one that holds tests.
fn left_out(relative: &Path) -> bool {
    relative.components().any(|part| match part {
        Component::Normal(name) => name.to_str().is_some_and(|name| {
            GENERATED.contains(&name) || name == "__tests__" || name == "__mocks__"
        }),
        _ => false,
    })
}

/// Every file under `root` a scan reads, sorted, less anything under
/// `outside`, the build's own folder.
pub fn list(root: &Path, outside: Option<&Path>) -> Vec<PathBuf> {
    let listed = Command::new("git")
        .args([
            "ls-files",
            "-z",
            "--cached",
            "--others",
            "--exclude-standard",
        ])
        .current_dir(root)
        .output();
    let mut found: Vec<PathBuf> = match listed {
        Ok(output) if output.status.success() => output
            .stdout
            .split(|byte| *byte == 0)
            .filter(|name| !name.is_empty())
            /* Joined a part at a time: `git` writes `/` on every system. */
            .map(|name| {
                String::from_utf8_lossy(name)
                    .split('/')
                    .fold(root.to_owned(), |path, part| path.join(part))
            })
            .collect(),
        _ => {
            let mut found = Vec::new();
            crawl(root, &|path| kind(path).is_some(), &mut found);
            found
        }
    };
    found.retain(|path| {
        kind(path).is_some()
            && path
                .strip_prefix(root)
                .is_ok_and(|relative| !left_out(relative))
            && outside.is_none_or(|outside| !path.starts_with(outside))
            && path.is_file()
    });
    found.sort();
    found.dedup();
    found
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{kind, left_out, Kind};

    #[test]
    fn each_file_is_read_by_its_name() {
        assert_eq!(
            kind(Path::new("a/card.module.scss")),
            Some(Kind::Sheet {
                line_comments: true
            })
        );
        assert_eq!(kind(Path::new("a/App.vue")), Some(Kind::Template));
        assert_eq!(
            kind(Path::new("a/page.js")),
            Some(Kind::Module { jsx: true })
        );
        assert_eq!(
            kind(Path::new("a/card.ts")),
            Some(Kind::Module { jsx: false })
        );
        assert_eq!(kind(Path::new("a/theme.sass")), Some(Kind::Unsupported));
        assert_eq!(kind(Path::new("a/card.test.tsx")), None);
        assert_eq!(kind(Path::new("a/jsx.d.ts")), None);
        assert_eq!(kind(Path::new("a/notes.md")), None);
        assert!(left_out(Path::new("app/__tests__/card.tsx")));
        assert!(left_out(Path::new("node_modules/x/a.css")));
        assert!(!left_out(Path::new("app/card.tsx")));
    }
}
