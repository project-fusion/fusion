# @fusion.dev/helix-sandbox

Two elements the docs site needs and a consumer never does. **Private**: it is
build tooling for this repository, so nothing here reaches npm.

| Element | What it is |
|---|---|
| `helix-sandbox-editor` | the editable source pane, CodeMirror behind it |
| `helix-sandbox-specs` | the spec runner, which imports and runs this repository's own specs |

The sandbox shell around them is not here. `Sandbox` is an ordinary `helix/styled`
family with its panes, preview, toolbar and terminal, and it ships. Only these
two stayed behind: the editor carries about 4 MB of CodeMirror, and a
`dependencies` entry is paid at install time whatever anyone imports, which is
the one cost a subpath export cannot solve. The spec runner reads this
repository's spec files, so it is internal by definition rather than by weight.

## Working on it

```sh
bun run --filter @fusion.dev/helix-sandbox build       # tsc
bun run --filter @fusion.dev/helix-sandbox test        # dom then ssr
bunx turbo run styles --filter @fusion.dev/helix-sandbox
```

Same conventions as the rest of Helix: `helix/CONVENTIONS.md` loads for
`helix/**` and applies here too, and `helix component` holds these elements to
it like any other. **Single tier**, because the headless and styled split exists
so a consumer can bring their own presentation, and nobody reskins a dev tool.

`fusion/site` is the only consumer. It renders `helix-sandbox-editor` on every
component page and `helix-sandbox-specs` at `/helix/sandbox/specs`, and
`next.config.ts` lists this package among the ones it transpiles.

## The frame

The preview runs in an iframe at `public/sandbox/frame.html`, built by
`turbo run frame`, with `sandbox="allow-scripts allow-forms"` and no
`allow-same-origin`. It executes whatever a reader types, against an opaque
origin, which is the design rather than a defect: `.github/SECURITY.md` scopes
what a report about it should say.
