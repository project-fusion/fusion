#!/usr/bin/env node
/**
 * The Node running this satisfies what the repository actually needs.
 *
 * **Because the one thing that needs a floor fails by writing a wrong answer.**
 * `cem analyze` is a Node CLI with a `#!/usr/bin/env node` shebang, so `bun run
 * analyze` hands it to whatever Node is on `PATH`, and its config is
 * `custom-elements-manifest.config.ts`. On a Node that cannot load a `.ts` file
 * the analyzer does not stop: it reports `ERR_UNKNOWN_FILE_EXTENSION`, falls
 * back to a default configuration, and prints `Created new manifest`.
 *
 * Measured on Node 18.16 in `helix/styled`: the manifest it wrote was 69,081 lines
 * shorter, every Helix plugin's contribution gone, and the command exited as
 * though it had worked. Everything downstream reads that file. The docs site
 * takes its API tables from it, `helix/react` generates wrappers from it, and
 * eight `check:*` scripts assert against it, so a stale Node does not break the
 * build, it quietly changes what the library claims to be.
 *
 * **`engines` cannot do this job.** It is in the root manifest and has said
 * `>=20.11` for months, but bun does not enforce it and nothing reads it, so it
 * is a comment in a field that looks like a constraint. This runs first in
 * `verify` and says the version, the floor, and what goes wrong above nothing.
 *
 * **The floor, and how it was arrived at.** Measured rather than recalled: a
 * plain `.ts` file fails on 20.9, 22.11 and 22.12 and runs on 22.22 and 24.13,
 * and 22.12 runs it with `--experimental-strip-types`, which names the
 * mechanism as type stripping. Node unflagged that in 22.18, which is the
 * boundary this asserts. The other floor in the repo is `import.meta.dirname`,
 * used by four scripts here and added in 20.11, so it is the lower of the two
 * and this one covers it.
 *
 * **It also holds `@types/node` to that floor**, which is a different failure
 * with the same shape. The types declare what the standard library has, so
 * `@types/node@26` against a floor of 22.18 type-checks code that uses APIs
 * added after the oldest Node this repository supports: nothing fails here, and
 * the consumer on the floor gets a `TypeError` at runtime for a call TypeScript
 * approved. Dependabot proposes that bump every time Node ships a major, and it
 * is right about the version and wrong about this repository, so the answer is a
 * rule rather than a judgment repeated per pull request.
 *
 * The two move together: raise `engines.node` and the types follow, which is the
 * order that keeps them honest.
 *
 * **What it deliberately does not do** is check the Node that CI uses, which is
 * a different problem with a different fix: `verify.yml` pins it the way it
 * already pins bun. Before that it set up bun and Rust and never Node at all,
 * so the floor was met by whatever the runner image happened to ship.
 *
 * Run with `bun run check:pkg:node` (also the first step of `bun run verify`).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/* `import.meta.url` and not `import.meta.dirname`, which is the very thing this
   file exists to notice the absence of: written the shorter way it crashed on
   Node 18 with `The "path" argument must be of type string`, which is the
   instrument failing on exactly the case it was built to explain. A check has to
   run on the oldest runtime it might meet. */
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const declared = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).engines?.node

/* Parsed from the manifest rather than written twice. A floor stated in two
   places is a floor that disagrees with itself the first time one moves. */
const wanted = /(\d+)\.(\d+)/.exec(declared ?? '')
if (!wanted) {
  console.error(
    `node: the root manifest declares \`engines.node\` as ${JSON.stringify(declared)}, which this ` +
      'cannot read as a floor. It expects a form like `>=22.18`.',
  )
  process.exit(1)
}

const [wantMajor, wantMinor] = [Number(wanted[1]), Number(wanted[2])]
const [major, minor] = process.versions.node.split('.').map(Number)
const below = major < wantMajor || (major === wantMajor && minor < wantMinor)

if (below) {
  console.error(
    `Node ${process.versions.node} is below the floor of ${wantMajor}.${wantMinor}.\n\n` +
      '  `cem analyze` runs under this Node, not under bun, and its config is TypeScript. Below\n' +
      '  the floor it cannot load that config, falls back to a default one, writes a manifest\n' +
      '  with every Helix plugin missing, and reports success: measured on 18.16, 69,081 lines\n' +
      '  shorter. The docs site, the React wrappers and eight checks all read that file.\n\n' +
      '  Node 22.18 is where type stripping stopped needing a flag, which is the whole of the\n' +
      '  requirement. `nvm use 22` or any newer release.\n',
  )
  process.exit(1)
}

/* The types describe a standard library, so they have to describe the oldest one
   this repository supports rather than the newest one that exists. */
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const types =
  manifest.devDependencies?.['@types/node'] ?? manifest.dependencies?.['@types/node'] ?? ''
const typed = /(\d+)\./.exec(types)

if (typed && Number(typed[1]) !== wantMajor) {
  console.error(
    `\`@types/node\` is ${types} and \`engines.node\` floors at ${wantMajor}.${wantMinor}.\n\n` +
      '  The types describe what the standard library has, so a major ahead of the floor\n' +
      '  type-checks calls that do not exist on the oldest Node this repository supports.\n' +
      '  Nothing fails here; the consumer on the floor gets a `TypeError` for a call\n' +
      '  TypeScript approved.\n\n' +
      `  Either pin the types to ^${wantMajor}, or raise \`engines.node\` first and let them\n` +
      '  follow. They move together, in that order.\n',
  )
  process.exit(1)
}

console.log(
  `node: ${process.versions.node}, at or above the ${wantMajor}.${wantMinor} floor a TypeScript analyzer config needs, ` +
    `and \`@types/node\` is on ${wantMajor} with it`,
)
