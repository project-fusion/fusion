# @fusion.dev/insights

The site's own prose, as MDX with a typed registry. **Private**: the site is the
only consumer.

| Here | What it is |
|---|---|
| `content/*.mdx` | One file per page or essay. The file name is the slug |
| `src/pages.generated.ts` | The registry, derived from frontmatter by `turbo run content` |
| `src/sources.generated.ts` | The MDX inlined, so a page renders with no filesystem read |

**The slug is the file name and nothing assigns one.** `path` in the
frontmatter is where it is served from, so moving a page between sections is a
frontmatter edit rather than a rename.

**Both generated modules are build outputs and neither is checked in.** The app
imports them, so a build that had to walk `content/` would be a filesystem read
it cannot statically scope; `turbo run content` writes them and
`turbo run content -- --check` fails when they and the MDX disagree. `build` and
`typecheck` both run the generator first, because a task that reads a generated
file and does not depend on the one that writes it passes only while an earlier
run has left the file behind.
