# @fusion.dev/helix-templates

The Helix starter templates, as data. Read by `helix new` and by
`npm create @fusion.dev/helix-app`, which are one capability behind two doors.

```sh
npm create @fusion.dev/helix-app@latest my-app
```

You are unlikely to install this package yourself. It exists so that the thing
that would drift between those two doors, the templates, is one artifact rather
than two copies, and so that a template is versioned with the components it was
written against.

| Template | What it is |
|---|---|
| `react-vite` | React and TypeScript on Vite. The shortest path to a running component. |
| `react-nextjs` | React and TypeScript on the Next.js App Router, elements registered once. |

**There is no build-free HTML template**, and that is a fact about the packages
rather than an omission. `@fusion.dev/helix`'s published entry re-exports bare
specifiers (`@fusion.dev/helix-core`, ninety-odd `@fusion.dev/helix-headless/*`
subpaths, `lit` and its own graph) none of which a browser resolves without an
import map covering all of it, and an import map that large is a build artifact
wearing a template's clothes. The honest build-free story is a CDN that rewrites
the graph, which wants the packages public first.

## Reading it yourself

```js
import { findTemplate, HELIX_VERSION, PROJECT_NAME, templates } from '@fusion.dev/helix-templates'
```

`templates` is the register, in the order a chooser should offer them. Each entry
names the files a scaffolder substitutes in: `PROJECT_NAME` becomes the project's
own name, and `HELIX_VERSION` becomes this package's version, which is the Helix
the templates were published with. The payloads sit under `templates/<id>/` in
this package.

**The named files are named rather than discovered.** Scanning every file for the
placeholder would rewrite a template that merely mentions it in prose, and a
rename that missed a file would ship rather than fail. The register is held to the
directories by this package's own spec, in both directions.

MIT
