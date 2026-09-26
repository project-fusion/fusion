# @fusion.dev/helix-testing

The spec scaffolding every component test reaches for. **Private**: it is
tooling for this repository and nothing here reaches npm.

| Module | Environment |
|---|---|
| `./dom` | happy-dom under bun, for `*.dom.spec.ts` |
| `./browser` | Chromium, for the specs that need real layout |
| `./ssr` | Lit's server shim, for `*.ssr.spec.ts` |

**One module per environment, because they cannot share a process.** Lit's SSR
shim and happy-dom both patch globals, so `*.dom.spec.ts` and `*.ssr.spec.ts`
run as separate commands. That is why a package's `test` script is
`test:pure && test:dom && test:ssr` rather than one `bun test`.

**Import the code under test *after* `registerDom()`, in `beforeAll`.** A static
import runs first, so anything extending a DOM global captures bun's own rather
than happy-dom's, and the error never mentions the import. It is the module that
matters, not what is taken from it.

`at(list, index)` is here for the same reason the rest is: a spec indexes a
fixture it built, which `noUncheckedIndexedAccess` cannot see is safe, and a
cast would trade a real check for silence. This throws with the index and the
length instead.

It builds to `dist` like every other package. `exports` pointed at `./src/*.ts`
until September 2, 2026, which every consumer here resolves because every consumer is
bun; anything reading it with Node would have been handed TypeScript. `test`
already depends on `^build`, so compiling it costs the task graph nothing.
