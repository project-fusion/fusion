//! The comments of a source, each printed once where it stood.
//!
//! **Nothing is dropped.** Each comment is taken by the part of the source
//! it stands in, before the thing it stands above, and the printer refuses a
//! source with one left over, naming its line.

use oxc_ast::ast::CommentKind;

/// One comment: where it stood, and its text with its delimiters.
#[derive(Clone, Debug)]
pub struct Comment {
    pub start: u32,
    pub end: u32,
    pub text: String,
    /// The column its first line started at, counted from zero.
    pub column: usize,
    pub line: bool,
}

impl Comment {
    /// The comment as a block, its later lines indented to stand under its
    /// words when it starts at `column`.
    pub fn block(&self, column: usize) -> String {
        if self.line {
            return format!("/* {} */", self.text.trim_start_matches("//").trim());
        }
        let mut lines = self.text.lines();
        let first = lines.next().unwrap_or_default().trim_end().to_owned();
        let rest: Vec<&str> = lines.collect();
        if rest.is_empty() {
            return first;
        }
        /* The later lines kept as they stood under the first's words, moved
        with the comment. */
        let shift = |line: &str| -> String {
            let indent = line.len() - line.trim_start().len();
            let kept = indent.saturating_sub(self.column);
            format!("{}{}", " ".repeat(column + kept), line.trim_start())
        };
        let mut written = vec![first];
        written.extend(rest.iter().map(|line| {
            if line.trim().is_empty() {
                String::new()
            } else {
                shift(line)
            }
        }));
        written.join("\n")
    }
}

/// The comments of a source, and which have been printed.
pub struct Comments {
    all: Vec<Comment>,
    used: Vec<bool>,
}

impl Comments {
    pub fn of(source: &str, comments: &[oxc_ast::ast::Comment]) -> Self {
        let all: Vec<Comment> = comments
            .iter()
            .map(|comment| {
                let start = comment.span.start as usize;
                let line_start = source[..start].rfind('\n').map_or(0, |at| at + 1);
                Comment {
                    column: source[line_start..start].chars().count(),
                    end: comment.span.end,
                    line: comment.kind == CommentKind::Line,
                    start: comment.span.start,
                    text: source[start..comment.span.end as usize].to_owned(),
                }
            })
            .collect();
        let used = vec![false; all.len()];
        Self { all, used }
    }

    /// Each comment not yet printed that stands within `from..to`, in order,
    /// now taken.
    pub fn take(&mut self, from: u32, to: u32) -> Vec<Comment> {
        let mut taken = Vec::new();
        for (comment, used) in self.all.iter().zip(self.used.iter_mut()) {
            if !*used && comment.start >= from && comment.end <= to {
                *used = true;
                taken.push(comment.clone());
            }
        }
        taken
    }

    /// The first comment within `from..to` not printed, by its line.
    pub fn left(&self, from: u32, to: u32, source: &str) -> Option<usize> {
        self.all
            .iter()
            .zip(&self.used)
            .find(|(comment, used)| !**used && comment.start >= from && comment.end <= to)
            .map(|(comment, _)| source[..comment.start as usize].matches('\n').count() + 1)
    }
}
