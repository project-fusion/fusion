# @fusion.dev/helix-workbench

The two pieces of the sandbox page on fusion.dev that work only in this
repository. **Private**: nothing here reaches npm.

| Entry | What it is |
|---|---|
| `.` | `jsxToHtml`, which reads a TSX example back as the markup it stands for |
| `./specs` | `helix-sandbox-specs`, the spec runner, which imports and runs this repository's own DOM specs |

The editor and the code highlighter publish from `@fusion.dev/helix-sandbox`,
and the sandbox shell from `@fusion.dev/helix/sandbox`. These two stay here:

- **The spec runner reads this repository.** It loads
  `/helix/sandbox/specs`, the route in `fusion/site` that imports the bundles
  `turbo run specs` writes to `fusion/site/public/specs`, one per family.
- **`jsxToHtml` reads the examples' own convention**: a component that returns
  its markup, and `import './styles.css'` for the stylesheet beside it.

`fusion/site` is the only consumer. It registers the spec runner in
`HelixElements`, after hydration, and the workbench calls `jsxToHtml` when a
reader switches an example between HTML and TSX.

## Working on it

```sh
bunx turbo run build --filter @fusion.dev/helix-workbench   # styles, analyze, tsc
bun run --filter @fusion.dev/helix-workbench test           # dom specs
```

`helix/CONVENTIONS.md` applies here as it does to every Helix package, and
`helix component` holds the spec runner to it.
