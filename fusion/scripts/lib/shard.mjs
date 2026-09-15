/**
 * Which of a browser check's families this run takes, when CI splits one check
 * across several jobs.
 *
 *   --shard <i> --of <n>
 *
 * Shared by the checks that walk the corpus on `@fusion.dev/scripts/pool`,
 * because a split each of them made its own way would be six answers to "which
 * shard owns this family", and the one that drifted would drop families from
 * every job while each job reported green. `plan-browser.mjs` decides `n` for
 * each check from how much of the corpus a change reaches; this decides which
 * families land where.
 *
 * **A function of the families and their weights, and never of timing.** The
 * same list and the same `n` give the same split on every machine, so a failing
 * shard is reproduced by running it again with the same arguments, and the `n`
 * shards together are the unsharded run exactly: every family in one shard and
 * in no other. A queue that handed the next family to whichever job was free
 * would balance better and make a finding depend on which runner was slow.
 *
 * **Balanced by weight rather than striped by position**, because a family is
 * not a unit of cost: parity's range from two examples to sixteen, and a stripe
 * that dealt families out in name order put the heavy ones where they happened
 * to sort. The heaviest family goes first, each onto the lightest shard so far,
 * ties to the lower index and equal weights in name order. Each check weighs by
 * what it will render, examples or pictures, which is close enough to cost that
 * the shards of one check finish within seconds of each other.
 *
 * **Counted from 0 on the command line and from 1 in what a run prints.** The
 * argument counts as `run-checks.mjs --shard` does. The printed form never
 * carries a bare 0, because `check-floors.mjs` reads a zero in a success line as
 * a check that tested nothing, and "shard 0 of 4" would be read that way the day
 * a check here stopped being exempt from it.
 */
import { argument } from './argv.mjs'

/**
 * `{ index, of }` from `--shard` and `--of`, or undefined when neither is given.
 *
 * Refused rather than read as the unsharded run when either is malformed or
 * alone, because a job that silently took every family would pass while its
 * siblings did the same work, and one that took none would pass having checked
 * nothing.
 */
export const shard = () => {
  const index = argument('shard')
  const of = argument('of')
  if (index === undefined && of === undefined) {
    return undefined
  }
  const parsed = { index: Number(index), of: Number(of) }
  if (
    !Number.isInteger(parsed.index) ||
    !Number.isInteger(parsed.of) ||
    parsed.of < 1 ||
    parsed.index < 0 ||
    parsed.index >= parsed.of
  ) {
    throw new Error(
      `--shard takes a whole number from 0 to one less than --of, and was given --shard ${index} --of ${of}`,
    )
  }
  return parsed
}

/**
 * Each family's shard, as a map from family to index, for `of` shards.
 *
 * `weigh(family)` is what the family costs in whatever the check renders; a
 * family weighing nothing still lands somewhere, so the union stays whole.
 */
export const assign = (families, weigh, of) => {
  const loads = new Array(of).fill(0)
  const placed = new Map()
  const ordered = [...new Set(families)]
    .map((family) => ({ family, weight: weigh(family) }))
    .sort((a, b) => b.weight - a.weight || (a.family < b.family ? -1 : a.family > b.family ? 1 : 0))
  for (const { family, weight } of ordered) {
    let lightest = 0
    for (let at = 1; at < of; at += 1) {
      if (loads[at] < loads[lightest]) {
        lightest = at
      }
    }
    loads[lightest] += weight
    placed.set(family, lightest)
  }
  return placed
}

/**
 * Whether a family is this run's, which every family is when the run is not
 * sharded.
 */
export const owner = (families, weigh, asked = shard()) => {
  if (asked === undefined) {
    return () => true
  }
  const placed = assign(families, weigh, asked.of)
  return (family) => placed.get(family) === asked.index
}

/** `shard 2 of 5`, counted from 1, for the line a sharded run prints. */
export const which = (asked) => `shard ${asked.index + 1} of ${asked.of}`
