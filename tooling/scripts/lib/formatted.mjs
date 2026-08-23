import { spawnSync } from 'node:child_process'

/**
 * Source, as the formatter would write it.
 *
 * **Generated TypeScript is checked by `biome ci`, so a generator has to emit
 * exactly what the formatter would.** Three separate attempts at predicting
 * that had already gone wrong: a line broken where the formatter would not
 * break it, a string quoted with an escape where it would switch quote style,
 * and an object key quoted where it would leave it bare.
 *
 * The third failure is what settled it. Measured against biome 2.x: a value on
 * `lede` never moves to its own line at any length, and the same value on
 * `description` moves at 82 characters. The rule is a function of the key's
 * width, which is prettier's short-key heuristic, and reimplementing it here
 * would be a fourth guess at a moving target.
 *
 * So this runs the formatter instead. One subprocess per generation, which is
 * nothing next to a check that fails over bytes nobody typed, and it cannot
 * disagree with `biome ci` because it is the same program.
 */
export const formatted = (source, name = 'generated.ts') => {
  const result = spawnSync('bunx', ['biome', 'format', `--stdin-file-path=${name}`], {
    encoding: 'utf8',
    input: source,
  })
  if (result.status !== 0) {
    throw new Error(`formatting ${name} failed: ${result.stderr}`)
  }
  return result.stdout
}
