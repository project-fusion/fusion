#!/usr/bin/env node
/**
 * Checks that a slot's fallback markup sits behind a seam a tier can move.
 *
 * **A fallback answers a consumer and a seam answers the tier above, and they
 * are different people.** Slotting something replaces the fallback for whoever
 * wrote the markup. A `protected render…()` around it replaces the fallback for
 * whoever is extending the component, and without one their only route is
 * reimplementing the whole template to reach three elements.
 *
 * **The case this exists for is the one the tier rule creates.** `headless` must
 * not depend on `web`, so a base component cannot draw `helix-button`: it writes
 * a bare `<button>` and the styled tier, which has buttons, overrides the method
 * to use one. `SpeedDial` and `Megamenu` are exactly that, and both had the
 * control written inline where nothing above could reach it. #76 built the
 * mechanism and these were the sites that never got converted.
 *
 * **A bare property fallback is not this, and is allowed.** `<slot>${this.label}
 * </slot>` is the content-property rule the area notes already state: the
 * property *is* the fallback, there is no markup to restyle, and no tier wants
 * to override a string. Only fallbacks containing elements are asked about.
 *
 * **A call is not a property.** `CopyButton` drew both its marks as
 * `${HelixHeadlessCopyButton.icon(copy)}`, a static helper returning a template,
 * and the first version of this let it through on the shape of the expression:
 * two pieces of markup a tier might want to redraw, exempted for looking like a
 * reference. Parentheses are the test.
 *
 * **Two things had to be got right to read this at all**, and both were wrong
 * first:
 *
 * - **`>` inside `${…}` does not close the tag.** A first pass matched
 *   `@slotchange=${(event) => this.countRows(event)}>` as the end of the opening
 *   tag and reported the handler's own text as fallback content, giving 29
 *   findings of which 27 were the regexp misreading an attribute.
 * - **Comments hold `<slot>` too.** `Card` and `Dialog` both explain the
 *   bare-slot rule in prose, so a scan that does not blank comments reports the
 *   documentation as a component. The same trap `check:composed`,
 *   `check:seams` and `check:grounds` each record hitting.
 *
 * Run with `bun run check:fallbacks` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const TIERS = ['helix/headless/src', 'helix/styled/src']

/** Every `.ts` under a tier, specs and generated stylesheets excluded. */
const sources = (root) => {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
      } else if (entry.endsWith('.ts') && !entry.includes('.spec.') && !entry.endsWith('.css.ts')) {
        found.push(path)
      }
    }
  }
  walk(root)
  return found
}

/* Blanked rather than deleted, so an offset still names the line it did. */
const withoutComments = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, (match) => match.replaceAll(/[^\n]/g, ' '))
    .replaceAll(/\/\/[^\n]*/g, (match) => ' '.repeat(match.length))

/**
 * The index just past the `>` closing the tag that starts at `at`.
 *
 * Interpolations are tracked, because a Lit attribute routinely contains one
 * and an arrow function inside it routinely contains `>`.
 */
const tagEnd = (text, at) => {
  let depth = 0
  for (let i = at; i < text.length; i += 1) {
    if (text.startsWith('${', i)) {
      depth += 1
      i += 1
    } else if (text[i] === '}' && depth > 0) {
      depth -= 1
    } else if (text[i] === '>' && depth === 0) {
      return i + 1
    }
  }
  return -1
}

/** The method a position sits inside, by the last declaration above it. */
const METHOD = /^ {2}(?:(protected|private|public) )?(?:override )?(\w+)\s*\(/gm

const problems = []
let seamed = 0
let bare = 0

for (const tier of TIERS) {
  for (const file of sources(tier)) {
    const text = withoutComments(readFileSync(file, 'utf8'))
    const methods = [...text.matchAll(METHOD)].map((one) => ({
      at: one.index,
      name: one[2],
      visibility: one[1],
    }))

    /* Every name this file declares as a getter, which the exemption below
       has to know about: a getter returning a template is markup wearing a
       property's spelling. */
    const getters = new Set([...text.matchAll(/\bget\s+(\w+)\s*\(/g)].map((one) => one[1]))

    for (const open of text.matchAll(/<slot\b/g)) {
      const end = tagEnd(text, open.index)
      if (end < 0) {
        continue
      }
      const close = text.indexOf('</slot', end)
      if (close < 0) {
        continue
      }
      const body = text.slice(end, close).trim()
      if (body === '') {
        continue
      }
      /* A property or two and nothing else is the content-property rule, not
         markup a tier would want to draw differently.
         **A call is not a property**, which is the distinction that took a
         second pass. `CopyButton` drew both its marks as
         `${HelixHeadlessCopyButton.icon(copy)}`, a static helper returning a
         template, and that read as a bare reference and was let through: two
         pieces of markup a tier might well want to redraw, permitted by the
         shape of the expression rather than by anything about them. No
         parentheses is the test, so `${this.label}` and `${this.label || x}`
         still pass and anything invoking something does not. */
      if (/^(\$\{[^{}()]*\}|\s)+$/.test(body)) {
        /* **A getter is not a property, which is the second spelling of the
           same fault.** The paragraph above records `CopyButton` drawing its
           marks through a static helper and being let through because the
           expression looked bare. A `private get dot()` returning a template
           looks barer still: `${this.dot}` has no parentheses at all to
           notice. Two were live, `Steps` and `Timeline`, each drawing their
           marker that way, so a tier wanting a different mark had to
           reimplement the whole template to reach one element.
      
           So a name the file declares as a getter is markup until shown
           otherwise. A real property keeps passing, which is the case the
           exemption exists for. */
        const named = [...body.matchAll(/\$\{\s*this\.(\w+)/g)].map((one) => one[1])
        if (!named.some((name) => getters.has(name))) {
          bare += 1
          continue
        }
      }
      let owner
      for (const one of methods) {
        if (one.at < open.index) {
          owner = one
        }
      }
      const inSeam =
        owner?.name.startsWith('render') &&
        owner.name !== 'render' &&
        owner.visibility === 'protected'
      if (inSeam) {
        seamed += 1
        continue
      }
      const line = text.slice(0, open.index).split('\n').length
      problems.push(
        `${file}:${line}: a slot's fallback draws markup inside \`${owner?.name ?? 'the template'}\`, ` +
          'so a tier above can only replace it by reimplementing the whole template. Move it to a ' +
          '`protected render…()` of its own: the slot answers a consumer and the method answers ' +
          'the tier, which are different people.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(
    `Slot fallbacks with no seam (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`,
  )
  process.exit(1)
}

console.log(
  `fallbacks: ${seamed} drawing markup, every one behind a seam, and ${bare} that are a property and need none`,
)
