# @fusion.dev/create-helix-app

Starts a Helix project.

```sh
npm create @fusion.dev/helix-app@latest
```

It asks for a project name and a template, then writes the project. It prints the
commands that install and start it, for the package manager you ran it with.

Name both on the command line to skip the questions. Outside a terminal, such as
in a script, a missing name is an error and a missing template lists the templates
and writes nothing.

```sh
npm create @fusion.dev/helix-app@latest my-app --template react-vite
```

The same command works with `yarn create`, `pnpm create`, and `bun create`.

| Template | What it is |
|---|---|
| `react-vite` | React and TypeScript on Vite. The shortest path to a running app. |
| `react-nextjs` | React and TypeScript on the Next.js App Router, the three pages as real routes. |
| `expo-router` | React and TypeScript on Expo Router: one app for the web, iOS, and Android. |
| `vue-vite` | Vue and TypeScript on Vite. |
| `angular` | Angular and TypeScript on the Angular CLI. |
| `svelte-vite` | Svelte and TypeScript on Vite. |
| `solid-vite` | Solid and TypeScript on Vite. |

Every web template lays down the same three pages:

- a landing page saying what you have and where the rest of it is documented;
- an overview holding a sorted, paged, selectable data table;
- a form a `<form>` reads with `FormData`.

What differs between them is what each framework requires. Each one starts Helix
diagnostics in development. A production build never loads them. Every build
but Angular's leaves them out, and Angular's writes them to a file of their own
that the page never requests.

`expo-router` writes an app that runs as a website and as an iOS and Android
app from one set of pages. Its README says how to run it on each.

This is `helix new` from
[`@fusion.dev/helix-cli`](https://www.npmjs.com/package/@fusion.dev/helix-cli),
reached from somewhere with no project yet. npm installs the same templates with
the CLI, in `@fusion.dev/helix-templates`, so a project that has the CLI can run
`helix new` directly:

```sh
npx helix new my-app --template react-vite
```

**It says when a newer Helix is out.** Without `@latest`, npm can run a copy it
cached earlier, so this asks npm for the newest version while it writes the
project and prints one line if it isn't this one. It waits three seconds at most
and says nothing if npm doesn't answer. It doesn't ask in CI, from a
pre-release, or when `HELIX_NO_UPDATE_CHECK` is set.

**Scoped because the plain name is taken.** `create-helix-app` on npm belongs to
an unrelated project, so `npm create helix-app` runs somebody else's code.
`npm create @fusion.dev/helix-app` resolves to this package and no other.

[Documentation](https://fusion.dev/helix/docs) ·
[Components](https://fusion.dev/helix/components)

MIT
