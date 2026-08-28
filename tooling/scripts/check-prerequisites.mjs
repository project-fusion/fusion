#!/usr/bin/env node
/**
 * A task that reads a generated artifact has to build it.
 *
 * **Three packages had this wrong and CI is the only thing that could have
 * found them.** `helix/theme`'s wasm, `helix/icons/src/generated.ts` and
 * `fusion/site`'s catalog are all gitignored, all produced by their package's
 * `build`, and all were read by a `typecheck` that made none of them. Locally
 * they pass forever, because a build ran at some point and left the artifact on
 * disk. On a fresh checkout they fail, which is every runner, every time.
 *
 * **So the invariant is that `typecheck` runs what `build` runs.** A `build` of
 * the shape `generate && generate && compile` names its own prerequisites: the
 * commands ahead of the compile are what the sources need to exist before
 * anything reads them. A `typecheck` compiling those same sources needs the
 * same list, and the only reason it ever worked without one is that the
 * developer who wrote it had already run the build.
 *
 * This compares the two and fails on the difference. It does not run either.
 */
import { manifests } from './lib/workspace.mjs'

/**
 * The terminal step of a build, where generating stops and compiling starts.
 * Everything ahead of one of these is a prerequisite.
 */
const COMPILERS = [/^tsc\b/, /^next build\b/, /^vite build\b/]

const findings = []

for (const { manifest, directory } of manifests().values()) {
  const { build, typecheck } = manifest.scripts ?? {}
  if (!build || !typecheck) {
    continue
  }

  const steps = build.split('&&').map((step) => step.trim())
  const compiles = steps.findIndex((step) => COMPILERS.some((pattern) => pattern.test(step)))
  if (compiles < 1) {
    continue
  }

  for (const prerequisite of steps.slice(0, compiles)) {
    if (!typecheck.includes(prerequisite)) {
      findings.push(
        `${manifest.name} (${directory}): build runs \`${prerequisite}\` ` +
          `before compiling and typecheck does not.\n` +
          `    typecheck: ${typecheck}`,
      )
    }
  }
}

if (findings.length > 0) {
  console.error(
    `prerequisites: ${findings.length} task${findings.length === 1 ? '' : 's'} ` +
      `read an artifact they do not build.\n  ${findings.join('\n  ')}\n\n` +
      '  A typecheck that reads a generated file must generate it first, or it\n' +
      '  passes only where an earlier build left one behind.',
  )
  process.exit(1)
}

console.log('prerequisites: every typecheck builds what its build builds before compiling')
