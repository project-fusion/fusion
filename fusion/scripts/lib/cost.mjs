/**
 * What a browser check costs, family by family, so `plan-browser.mjs` sizes a
 * check's shards and `@fusion.dev/scripts/shard` packs them by what the work
 * takes rather than by how many examples it counts.
 *
 * **An example is not a unit of cost, and the shards paid for assuming it was.**
 * Contrast reads every pair of inks an example paints, and what an example
 * paints is not a function of its being one example: measured on run
 * 35041878434, four shards of 142, 142, 142 and 141 examples took 118, 43, 40
 * and 43 seconds, and the first of them was the most expensive job in the run.
 * The shard count was right and the partition was not, so three jobs sat idle
 * while the fourth held the whole wall.
 *
 * **So the model is measured rather than derived.** `browser-cost.json` holds
 * what each family took each check, on the machine and over the runs its header
 * names, and `measure-browser.mjs` refreshes it. A family the file does not
 * know falls back to the per-unit estimate below, so a family added today plans
 * as it always did rather than weighing nothing and landing wherever the tie
 * broke.
 *
 * **The seconds are a runner's**, which is what `TARGET` in `plan-browser.mjs`
 * is denominated in, and the browser jobs record their own: a desk is several
 * times a two-core runner and not uniformly, and the difference is not noise.
 * Aura is a sixth of contrast on an M2 and a third of it on `ubuntu-latest`,
 * which is a software rasterizer against a GPU, and shards packed from the
 * first ran 127 and 84 seconds where they were planned at 106 each. A file
 * measured on a desk is still worth having where no run can be read, and
 * `measure-browser.mjs` scales that shape onto `runner`, which is what each
 * check took on a runner: for readings already taken on one, that scaling is
 * the identity.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** The file itself, so a spec can hold the readers to what it says. */
export const MEASURED = JSON.parse(
  readFileSync(join(import.meta.dirname, 'browser-cost.json'), 'utf8'),
)

/**
 * What a check costs where the measurement has nothing to say: `per` unit of
 * whatever that check renders for a family, and `fixed` for what it costs
 * whatever its share.
 *
 * Each `per` is a check's whole corpus divided by what it rendered, off the
 * runs `measure-browser.mjs` names beside its `runner` figures, so the two are
 * the same measurement read two ways rather than two measurements to keep in
 * step. `fixed` is hydration's fixtures, one page holding every one of them,
 * and the two checks that ride with the first shard of the specs.
 */
export const ESTIMATE = {
  contrast: { per: 0.41 },
  dsd: { fixed: 15, per: 0.9 },
  parity: { per: 0.88 },
  smoke: { per: 0.17 },
  specs: { fixed: 13, per: 0.68 },
  visual: { per: 0.33 },
}

/** Every family a check was measured over, scaled to seconds on a runner. */
const scaled = (task) => {
  const measured = MEASURED.checks[task]
  if (measured === undefined) {
    return undefined
  }
  const local = Object.values(measured.families).reduce((sum, one) => sum + one, 0)
  if (local <= 0) {
    return undefined
  }
  return new Map(
    Object.entries(measured.families).map(([family, seconds]) => [
      family,
      (seconds * measured.runner) / local,
    ]),
  )
}

/**
 * `family -> seconds on a runner` for `task`, from the measurement where it
 * knows the family and from `units(family)` times the per-unit estimate where
 * it does not.
 *
 * The same function weighs the shards inside the check and sizes them in the
 * plan, because a plan that sized four shards from one model and a check that
 * filled them from another is how a shard count can be right and every shard
 * wrong.
 */
export const costOf = (task, units) => {
  const known = scaled(task)
  const { per } = ESTIMATE[task]
  return (family) => known?.get(family) ?? units(family) * per
}

/** What `task` costs over `families`, its fixed part included. */
export const costOver = (task, units, families) => {
  const seconds = costOf(task, units)
  return (
    [...families].reduce((sum, family) => sum + seconds(family), 0) + (ESTIMATE[task].fixed ?? 0)
  )
}

/**
 * A family's seconds, added to what `BROWSER_COST` names, for the run that is
 * being measured. Nothing is recorded when it is unset, which is every run but
 * `measure-browser.mjs`'s and the browser jobs of `verify`.
 *
 * Written on the way out rather than per family, because a check is one process
 * that ends once and a write per family would be a hundred of them.
 */
const taken = new Map()
export const record = (family, milliseconds) => {
  const where = process.env.BROWSER_COST
  if (where === undefined) {
    return
  }
  if (taken.size === 0) {
    process.on('exit', () => {
      mkdirSync(dirname(where), { recursive: true })
      writeFileSync(where, `${JSON.stringify(Object.fromEntries([...taken].sort()), null, 2)}\n`)
    })
  }
  taken.set(family, (taken.get(family) ?? 0) + milliseconds / 1000)
}
