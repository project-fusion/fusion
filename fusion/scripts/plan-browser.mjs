#!/usr/bin/env bun
/**
 * How many jobs each browser check takes in `verify`, and what each one runs.
 *
 *   bun fusion/scripts/plan-browser.mjs [--changed <ref>]
 *
 * Prints the `browser` matrix as one JSON array on stdout, and what it decided,
 * check by check, on stderr for the run's log. `plan` runs it and hands the
 * array to the matrix, so the number of jobs is written in one place and the
 * workflow names none of them.
 *
 * **A check gets as many shards as its share of the corpus needs to finish in
 * `TARGET` seconds.** The shard count is its estimated cost over the target,
 * and the cost is what the check will render times what one of those cost on a
 * runner. Parity and hydration are scoped by the rule `@fusion.dev/scripts/scope`
 * gives them, with the same files named as their own, so a change to one family
 * plans a shard or two and a change to `helix/core` plans the whole corpus. The
 * rest read every example whatever changed, so their count holds still.
 *
 * **An estimate decides how many shards, and never which families.** Each check
 * splits its own corpus with `@fusion.dev/scripts/shard` when it runs, so a
 * wrong number here costs a slower or a costlier run and never a family nobody
 * looked at: the shards of a check are its whole corpus whatever `n` is.
 *
 * **The target is set by how a runner is billed**, which is by the minute and
 * rounded up per job, and the arithmetic has to count the jobs as well as the
 * minute each one crosses into. A job is its setup and its share, and the setup
 * is 39 seconds measured on run 35040430279: 16 of checkout and dependencies,
 * 23 restoring the browser.
 *
 * A share of 70 keeps a job inside two minutes and plans 29 of them, which
 * billed 63. A share of 90 plans 23 and bills each three, which is 69 and worse
 * for twenty seconds of saving, and that pair is what the first target was
 * chosen from. It is the wrong pair: past the two-minute boundary the count
 * keeps falling, and at 125 the corpus plans 16 jobs of three minutes, which is
 * 48. The count stops falling there until 150, where a job bills four, so 125
 * is the knee with 16 seconds of margin before the boundary rather than the one
 * second a share of 140 leaves.
 *
 * **What this cannot buy is wall clock**, which is why the trade is read this
 * way round. The browser matrix finished 72 seconds before the run did on
 * 35040430279; `warm` and then `rust` are the critical path, so a larger share
 * spends some of that headroom and saves real money.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { argument } from '@fusion.dev/scripts/argv'
import { OWN, scopeFor } from '@fusion.dev/scripts/scope'
import { root, SOURCE } from '@fusion.dev/scripts/workspace'

/**
 * **Stdout carries the matrix and nothing else, whoever does the printing.**
 * The workflow captures this file's stdout into a step output, so any other
 * line written there becomes part of the value: `scopeFor` announces on stdout
 * which changed file pulled the whole corpus in, and the step died with
 * `Invalid format 'plan (dsd): fusion/scripts/check-dsd.mjs is read by every
 * example, comparing the whole corpus.'` on the first real run, before the
 * matrix it was planning had run once.
 *
 * Bound here rather than fixed in `scope.mjs`, because stdout is where that
 * line belongs for the two checks that also call it and print their findings
 * there. This says what *this* caller needs, and it covers the lines the
 * modules below have not been written to print yet.
 */
console.log = console.error

/** The seconds of work a shard is sized to, before setup. */
const TARGET = 125

const TIERS = [
  { name: 'headless', source: join(root, SOURCE.headless) },
  { name: 'styled', source: join(root, SOURCE.styled) },
]

/** A family's example files in one tier, or none. */
const examples = (tier, family) => {
  const dir = join(tier.source, family, '.examples')
  return existsSync(dir) ? readdirSync(dir) : []
}

/** Every family folder in a tier. */
const families = (tier) =>
  readdirSync(tier.source, { withFileTypes: true })
    .filter((one) => one.isDirectory())
    .map((one) => one.name)

/** Every family in either tier, each once. */
const every = [...new Set(TIERS.flatMap(families))].sort()

/** `family -> units` over every family, dropping the ones with none. */
const tally = (count) =>
  new Map(every.map((family) => [family, count(family)]).filter(([, units]) => units > 0))

const paired = tally((family) =>
  TIERS.reduce((sum, tier) => {
    const files = examples(tier, family)
    return (
      sum +
      files.filter((one) => one.endsWith('.html') && files.includes(one.replace(/\.html$/, '.tsx')))
        .length
    )
  }, 0),
)
const markup = tally((family) =>
  TIERS.reduce(
    (sum, tier) => sum + examples(tier, family).filter((one) => one.endsWith('.html')).length,
    0,
  ),
)
const styled = tally(
  (family) => examples(TIERS[1], family).filter((one) => one.endsWith('.html')).length,
)
const pictured = tally(
  (family) => 3 * TIERS.filter((tier) => examples(tier, family).includes('preview.html')).length,
)
const specced = tally((family) =>
  TIERS.some((tier) => {
    const dir = join(tier.source, family)
    return (
      existsSync(dir) &&
      readdirSync(dir, { withFileTypes: true })
        .filter((one) => one.isDirectory())
        .some((part) =>
          readdirSync(join(dir, part.name)).some((file) => file.endsWith('.dom.spec.ts')),
        )
    )
  })
    ? 1
    : 0,
)

const changed = argument('changed')
/** The families a scoped check reaches, or every one of them. */
const reach = (label, units) => {
  if (changed === undefined) {
    return units
  }
  const scope = scopeFor(changed, { label: `plan (${label})`, own: OWN[label], root, tiers: TIERS })
  return scope === null ? units : new Map([...units].filter(([family]) => scope.has(family)))
}

/**
 * Each check, what it renders per family, and what one of those costs in
 * seconds on `ubuntu-latest` on one worker, measured on the CI run of #22 on
 * 15 Sep 2026: parity 587 over 666 examples, hydration 611 over 663, contrast
 * 235 over 567, visual 192 over 582 pictures, smoke 97 over 567, the specs 68
 * over 100 families. `fixed` is what a check costs whatever its share, which
 * for hydration is the fixtures and for the specs is the two checks that ride
 * with them.
 */
const CHECKS = [
  {
    per: 0.88,
    scoped: true,
    script: 'check:spec:visual-parity',
    task: 'parity',
    units: reach('parity', paired),
  },
  {
    fixed: 15,
    per: 0.9,
    scoped: true,
    script: 'check:spec:dsd',
    task: 'dsd',
    units: reach('dsd', markup),
  },
  { per: 0.41, script: 'check:css:contrast', task: 'contrast', units: styled },
  { per: 0.33, script: 'check:spec:visual', task: 'visual', units: pictured },
  { per: 0.17, script: 'smoke:examples', task: 'smoke', units: styled },
  /* **Hexes and diagnostics ride with the first shard of the specs**, because
     each is about ten seconds of checking behind a job's worth of setup, and a
     job of their own was billed a minute apiece to say so. */
  {
    also: ['check:css:hexes', 'check:spec:diagnostics'],
    fixed: 13,
    per: 0.68,
    script: 'specs:browser',
    task: 'specs',
    units: specced,
  },
]

const matrix = []
const said = []
for (const check of CHECKS) {
  const units = [...check.units.values()].reduce((sum, one) => sum + one, 0)
  const cost = units * check.per + (check.fixed ?? 0)
  const of = Math.max(1, Math.min(check.units.size, Math.ceil(cost / TARGET)))
  said.push(
    check.units.size === 0
      ? `${check.task}: no family in scope, one job to say so`
      : `${check.task}: ${check.units.size} ${check.units.size === 1 ? 'family' : 'families'}, ` +
          `about ${Math.round(cost)} seconds, ${of} ${of === 1 ? 'job' : 'jobs'}`,
  )
  for (let index = 0; index < of; index += 1) {
    const commands = [
      [
        `bun run ${check.script}`,
        /* The base is the job's own `$BASE`, set once where the workflow knows
           which event it is, rather than written into every entry here. */
        check.scoped ? '--changed "$BASE"' : '',
        of > 1 ? `--shard ${index} --of ${of}` : '',
      ]
        .filter(Boolean)
        .join(' '),
      ...(index === 0 ? (check.also ?? []).map((one) => `bun run ${one}`) : []),
    ]
    matrix.push({
      id: of > 1 ? `${check.task}-${index + 1}-of-${of}` : check.task,
      label:
        (of > 1 ? `${check.task} ${index + 1}/${of}` : check.task) +
        (index === 0 && check.also
          ? `, ${check.also.map((one) => one.split(':').at(-1)).join(', ')}`
          : ''),
      /* **Every command runs and the job fails if any did**, rather than `&&`
         stopping at the first, for the reason `run-checks.mjs` accumulates: a
         failure that hides the one behind it costs a second run to find. */
      run:
        commands.length === 1
          ? commands[0]
          : `status=0; ${commands.map((one) => `${one} || status=1`).join('; ')}; exit $status`,
      task: check.task,
    })
  }
}

console.error(`plan: ${matrix.length} browser jobs, each sized to ${TARGET} seconds of work.`)
for (const line of said) {
  console.error(`  ${line}`)
}
process.stdout.write(`${JSON.stringify(matrix)}\n`)
