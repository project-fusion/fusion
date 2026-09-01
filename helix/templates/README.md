# @fusion.dev/helix-templates

The Helix starter templates, as data. Read by `helix new` and by
`npm create helix-app`, which are one capability behind two doors.

```sh
npm create helix-app@latest my-app
```

You are unlikely to install this package yourself. It exists so that the thing
that would drift between those two doors — the templates — is one artifact rather
than two copies, and so that a template is versioned with the components it was
written against.

| Template | What it is |
|---|---|
| `react-vite` | React and TypeScript on Vite. The shortest path to a running component. |
| `react-nextjs` | React and TypeScript on the Next.js App Router, elements registered once. |
| `html` | One HTML file and a stylesheet. No build step and no framework. |

## Reading it yourself

```js
import { findTemplate, PROJECT_NAME, templates } from '@fusion.dev/helix-templates'
```

`templates` is the register, in the order a chooser should offer them. Each entry
names the files whose contents carry `PROJECT_NAME`, which a scaffolder replaces
with the project's own. The payloads sit under `templates/<id>/` in this package.

**The named files are named rather than discovered.** Scanning every file for the
placeholder would rewrite a template that merely mentions it in prose, and a
rename that missed a file would ship rather than fail. The register is held to the
directories by this package's own spec, in both directions.

MIT
