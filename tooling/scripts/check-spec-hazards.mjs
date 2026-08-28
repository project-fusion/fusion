#!/usr/bin/env node
/**
 * Three ways a spec stops being a test and becomes an outage.
 *
 * Every one of these was found the same way: a suite that did not report a
 * failure, it reported nothing, and the reason took hours to find because the
 * runner had no output to give. A failing assertion is cheap. A spec that hangs
 * the run, or exhausts the machine, or silently tests the previous build, costs
 * an afternoon each and looks like a hardware problem while it does it.
 *
 * **A deep equality against a DOM node exhausts the machine.** See 297.
 * `expect(heard).toEqual([host])` is instant while the two match by reference
 * and catastrophic the moment they do not: the runner walks the expected value
 * to build a diff, and a rendered element is a graph with cycles in it,
 * `parentNode` to `ownerDocument` to `shadowRoot` and back. It allocates until
 * the kernel kills something, and because a file's output is buffered until the
 * file ends, what a reader sees is a machine going unusable during a test run.
 * The rule is keyed on the declaration rather than the assertion, because that
 * is the part a regex can see: an array of elements may not reach a deep
 * matcher. Count it, and compare identity with `toBe`.
 *
 * **A spec importing its own package by name tests `dist`.** See 298. The
 * package name resolves through `exports` to the built output, so the run holds
 * two copies of every element class, and `customElement` declines a taken tag
 * quietly by design: the winner is decided by file order and never announced.
 * After any edit to `src`, one such import registers the previous build for the
 * whole suite. Nine tests in three unrelated families failed exactly that way,
 * passing when their own file ran alone. Relative paths already work.
 *
 * **An unbounded settle loop hangs the run.** See 299.
 * `while ((await host.updateComplete) === false) {}` is the right idea and had
 * no ceiling in ten files. A component that asks for another update every time
 * turns it into an infinite await: it blocks nothing, allocates nothing, prints
 * nothing, and never returns. `settle` in `@fusion.dev/helix-testing/dom` is the same
 * loop with a bound, and it names the element when it gives up.
 *
 * Run with `bun run check:spec-hazards` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Array types whose members are DOM nodes, which no deep matcher may walk. */
const NODES = ['EventTarget', 'HTMLElement', 'Element', 'Node', 'ShadowRoot']
const DEEP = ['toEqual', 'toStrictEqual']

const specs = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
    } else if (/\.spec\.ts$/.test(entry)) {
      specs.push(path)
    }
  }
}

/* Every package that holds specs, with the name it publishes under, so the
   self-import rule can name the import a file may not make. */
const PACKAGES = []
for (const domain of ['helix', 'cortex']) {
  let entries = []
  try {
    entries = readdirSync(domain)
  } catch {
    continue
  }
  for (const entry of entries) {
    const root = join(domain, entry, 'src')
    let manifest
    try {
      manifest = JSON.parse(readFileSync(join(domain, entry, 'package.json'), 'utf8'))
      statSync(root)
    } catch {
      continue
    }
    PACKAGES.push({ name: manifest.name, root })
  }
}

const problems = []
let read = 0

for (const { name, root } of PACKAGES) {
  const before = specs.length
  walk(root)
  for (const path of specs.slice(before)) {
    read += 1
    const source = readFileSync(path, 'utf8')
    const lines = source.split('\n')

    /* Arrays of nodes, and whether a deep matcher is handed one. Declaration
       first, because the assertion alone says nothing about what is in it.

       **Nearest declaration above, not any declaration in the file.** One spec
       holds two `heard`s, an `EventTarget[]` in one test and a `string[]` in
       another, and matching on the name alone reported the safe one. A name is
       reused across tests far more often than it is unique to a file. */
    const declared = []
    lines.forEach((line, index) => {
      const found = /(?:const|let)\s+(\w+)\s*:\s*(\w+)\[\]/.exec(line)
      if (found) {
        declared.push({ at: index, holder: found[1], type: found[2] })
      }
    })
    const typeOf = (holder, at) => {
      const nearest = declared.filter((one) => one.holder === holder && one.at < at).pop()
      return nearest?.type
    }
    lines.forEach((line, index) => {
      for (const matcher of DEEP) {
        if (!line.includes(`.${matcher}(`)) {
          continue
        }
        const named = /expect\(\s*(\w+)/.exec(line)
        if (named && NODES.includes(typeOf(named[1], index) ?? '')) {
          problems.push(
            `${path}:${index + 1}: \`${matcher}\` is handed \`${named[1]}\`, which holds DOM nodes. ` +
              'A rendered element is a graph with cycles in it, so the moment this stops matching ' +
              'the runner walks it to build a diff and exhausts the machine rather than failing. ' +
              'Assert the count, and compare identity with `toBe`.',
          )
        }
      }
    })

    /* The package's own name, in either import form. */
    for (const form of [`from '${name}'`, `import('${name}')`, `from '${name}/`]) {
      const at = lines.findIndex((line) => line.includes(form))
      if (at !== -1 && !form.endsWith('/')) {
        problems.push(
          `${path}:${at + 1}: imports \`${name}\`, its own package, which resolves to \`dist\`. ` +
            'That puts a second copy of every class in the run and lets file order decide which ' +
            'one registers each tag. Import the relative path instead.',
        )
      }
    }

    /* The unbounded settle. */
    lines.forEach((line, index) => {
      if (/while\s*\(\(await\s+[\w.?]+\.updateComplete\)\s*===\s*false\)/.test(line)) {
        problems.push(
          `${path}:${index + 1}: settles in an unbounded loop. A component that never settles ` +
            'hangs the whole run with no output and no failing test. Use `settle` from ' +
            '`@fusion.dev/helix-testing/dom`, which is the same loop with a ceiling that names the element.',
        )
      }
    })
  }
}

if (problems.length > 0) {
  console.error(`Specs that would fail as something other than a test (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(
  `spec hazards: ${read} specs, none deep-comparing a DOM node, importing its own package, ` +
    'or settling without a ceiling',
)
