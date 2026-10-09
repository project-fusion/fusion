# @fusion.dev/cli

The Fusion command line. `fusion` runs each Fusion product's own command line,
so one command reaches all of them.

```sh
fusion helix scan              # the Helix command line
fusion helix visual test       # the Helix visual tests
```

| Route | What it does |
|---|---|
| `helix` | Runs `helix` from `@fusion.dev/helix-cli` with the rest of the line, and returns its exit code |

`fusion` looks for each product's command in this order: the `HELIX_BIN`
variable, a cargo build of it, `node_modules/.bin` from the directory it runs
in up, and then `PATH`. A product that is not installed names the package to
install.

`--json` and `--no-color` written before `helix` are passed to it. Every flag
after a product's name is that product's.

MIT
