# @fusion.dev/create-helix-app

Starts a Helix project.

```sh
npm create @fusion.dev/helix-app@latest my-app
```

Named without a template, it lists the templates and writes nothing: a
scaffolder that picks for you writes a project you didn't choose. Name one after
`--`, which is how `npm create` passes a flag on rather than reading it itself:

```sh
npm create @fusion.dev/helix-app@latest my-app -- --template react-vite
```

| Template | What it is |
|---|---|
| `react-vite` | React and TypeScript on Vite. The shortest path to a running app. |
| `react-nextjs` | React and TypeScript on the Next.js App Router, the two pages as real routes. |

Either one lays down the same two pages: an overview holding a sorted, paged,
selectable data table, and a form a `<form>` reads with `FormData`. What differs
between them is what the framework forces.

This is `helix new` from
[`@fusion.dev/helix-cli`](https://www.npmjs.com/package/@fusion.dev/helix-cli),
reached from somewhere with no project yet. A project that already has Helix
installed can run `npx helix new` instead, and gets the same templates.

**It says when a newer Helix is out.** Without `@latest`, npm can run a copy it
cached earlier, so this asks npm for the newest version while it writes the
project and prints one line if it isn't this one. It waits three seconds at most
and says nothing if npm doesn't answer. It doesn't ask in CI, from a
pre-release, or when `HELIX_NO_UPDATE_CHECK` is set.

**Scoped because the plain name is taken.** `create-helix-app` on npm belongs to
an unrelated project, so `npm create helix-app` runs somebody else's code.
`npm create @fusion.dev/helix-app` resolves to this package and no other.

[Documentation](https://helix.fusion.dev)

MIT
