# @fusion.dev/docs

The route registry's checks, and the prose the site serves. **Private**.

| Here | What it is |
|---|---|
| `insights/` | `@fusion.dev/insights`: the site's own MDX and its typed registry |
| `scripts/check-routes.mjs` | Holds every route to a document that says something |

`check-routes.mjs` is the one that earns its place. It reads the registry, finds
the document behind each route, and fails on an empty one, a missing frontmatter
block or an em dash. It writes nothing: a route that stops existing is a 404,
which is the right answer, so there is no record of every address ever served.
