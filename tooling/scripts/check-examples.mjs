#!/usr/bin/env node
/**
 * Checks every example against the manifest it documents.
 *
 * Examples are HTML, so nothing typechecks them. An attribute renamed on a
 * component leaves its examples rendering an element that silently ignores
 * them, and the sandbox shows a component that does not do what it says.
 *
 * Run with `bun run check:examples` (also part of `bun run verify`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/* The frame's layout modes, from `preview-frame.css`. Named here because an
   example may ask for one by name and a name that matches no rule is silent. */
const LAYOUTS = ['centered', 'fullscreen', 'hug', 'padded']

/* Both tiers, because an example may show either.
 *
 * The examples live beside the styled components and most of them use styled
 * tags, so this read the styled manifest alone and would have reported
 * `<helix-headless-checkbox>` as an element that does not exist. It does exist: it
 * is registered by `helix/headless`, which is the tier the headless examples are
 * there to show is real and consumable. Reading one manifest meant a base
 * example could not be validated at all, so a typo in one would have rendered
 * an inert unknown element and passed. */
const MANIFESTS = ['helix/styled/custom-elements.json', 'helix/headless/custom-elements.json']
const ROOT = 'helix/styled/src'

/**
 * Attributes any element may carry, so no component declares them.
 *
 * `style` stays here so the attribute check passes over it quietly and the
 * dedicated rule below is the one that speaks. Reported from here it would read
 * "has no attribute style", which is both wrong and unhelpful: every element
 * has one, and the objection is not that it does not exist.
 */
const GLOBAL = new Set([
  'class',
  'dir',
  'exportparts',
  'hidden',
  'id',
  'lang',
  'part',
  'role',
  'slot',
  'style',
  'tabindex',
  'title',
])

const tags = new Map()
for (const module of MANIFESTS.flatMap(
  (path) => JSON.parse(readFileSync(path, 'utf8')).modules ?? [],
)) {
  for (const declaration of module.declarations ?? []) {
    if (!declaration.tagName) {
      continue
    }
    const attributes = new Set((declaration.attributes ?? []).map((a) => a.name))
    tags.set(declaration.tagName, {
      /* What answers each one, read from `@controlled` rather than derived. The
         line above knows an attribute is controlled; only the tag knows which
         event settles it, and an example claiming ownership has to listen for
         the right one rather than for any event at all. */
      answers: new Map(
        (declaration.members ?? [])
          .filter((member) => member.helix?.controlled?.length && member.name)
          .map((member) => [member.name, member.helix.controlled]),
      ),
      attributes,
      /* Which attributes hand the state to a consumer, read from `@controlled`
         and not from the `default-` naming pattern.
       *
       * The pattern was the first test, on the reasoning that an attribute is a
         controlled state exactly when the element declares its `default-`
         sibling, because that pair is the model. It is true of every component
         that follows the contract and false of `Sandbox`, where `default-split`
         means *what a reset makes it* rather than the seed of a controlled
         pair: the element writes `split` back on every drag, so it owns the
         state and hands nobody anything. Its own comment says so.
       *
         Derived, that produced a complaint with no fix in it. `@controlled`
         also names the settling event, so a property without the tag has no
         event to name, and the message degraded to "nothing here can answer",
         which is true and useless. The tag is authoritative and loses no
         coverage: `check:controlled` holds it and the `requestControlledChange`
         call to each other in both directions, so a genuinely controlled
         property cannot be missing it. */
      controlled: new Set(
        (declaration.members ?? [])
          .filter((member) => member.helix?.controlled?.length && member.name)
          .map((member) => member.attribute ?? member.name),
      ),
      slots: new Set((declaration.slots ?? []).map((s) => s.name).filter(Boolean)),
    })
  }
}

/**
 * Says why a declared state is wrong here, in the words a reader needs.
 *
 * The trap, and the reason this check exists: `value="Ada"` is the native seed
 * and in Helix it is a claim of ownership, so the control announces its changes
 * and waits to be told. Six examples were in exactly that state, silently, and
 * a reader opening the sandbox found a calendar whose arrows did nothing.
 *
 * **It used to be absolute, and is now conditional.** Nothing in an example
 * could answer: an example is HTML and a stylesheet, and the preview injected
 * both with `innerHTML`, which parses a `<script>` and refuses to run it. So
 * there was no correct way to write a controlled control in one. The preview
 * executes example scripts now, which makes the answer writable, so the rule
 * becomes the one that was always meant: **declare a state and answer it, or
 * seed it with `default-`.**
 *
 * What answers is read from the manifest rather than guessed, because
 * `@controlled` already records it: `checked` is answered by `helix-toggle`,
 * `open` by `helix-open` and `helix-close`. An example listening for one of
 * those has said it owns the state and means it.
 *
 * An HTML fence in prose is still absolute, because a fence is markup by
 * definition and a reader copies what is in front of them.
 */
const declaresState = (where, tag, name, answers) =>
  `${where}: <${tag}> declares "${name}", which hands that state to a consumer. ` +
  (answers?.length
    ? `Answer it with a listener for ${answers.map((one) => `\`${one}\``).join(' or ')}, ` +
      `or seed it with "default-${name}".`
    : `Nothing here can answer, so the control will not respond. Use "default-${name}".`)

const problems = []
/* Family directories. `src` also holds `index.ts`, which is not one, and
   directories that are not families either.

   A family is a directory with an `index.ts`, because that is what the barrel
   exports and what a consumer imports as a subpath. `field/` holds the shared
   stylesheets the field controls compose and exports nothing, so it is not a
   family, has no element and no example to show. Naming it here instead would
   be a list to keep; asking for the file that makes a directory a family is
   the same question the package's `exports` map asks. */
const all = readdirSync(ROOT).filter(
  (entry) => statSync(join(ROOT, entry)).isDirectory() && existsSync(join(ROOT, entry, 'index.ts')),
)
const families = all.filter((family) => existsSync(join(ROOT, family, '.examples')))

for (const family of all) {
  if (!existsSync(join(ROOT, family, '.examples'))) {
    problems.push(`${family}: no .examples directory`)
  }
}

for (const family of families) {
  const dir = join(ROOT, family, '.examples')
  const entries = readdirSync(dir)
  const files = entries.filter((f) => f.endsWith('.html'))
  if (files.length === 0) {
    problems.push(`${family}: .examples holds no example`)
  }

  /* An example is `<slug>.html` and, where it needs one, `<slug>.css` beside
     it. The markup is what makes it an example, so a stylesheet without one is
     a file nothing will ever load: the catalog reads it only when asked for the
     example of that name, and there is no example of that name. */
  for (const sheet of entries.filter((f) => f.endsWith('.css'))) {
    if (!files.includes(sheet.replace(/\.css$/, '.html'))) {
      problems.push(`${family}/${sheet}: no ${sheet.replace(/\.css$/, '.html')} to style`)
    }
  }

  /* And the two have to agree about each other. The markup declares its
     stylesheet the way a consumer would, `<link rel="stylesheet">` in HTML and
     an `import` in the TSX the sandbox converts it to, because an example whose
     CSS arrives invisibly is an example that does not work when it is copied.

     Both directions, because both are silent. A stylesheet with no link is
     applied in the preview and missing from the file a reader takes away; a
     link with no stylesheet is a promise to a file that is not there. */
  for (const file of files) {
    const markup = readFileSync(join(dir, file), 'utf8')
    /* Every example describes itself in one line.
     *
     * `helix-examples` reads `@summary` into the manifest and the reference
     * page prints it in the Examples table, so an example without one is a row
     * with a slug and a blank. **279 of 344 were blank**, which is four fifths
     * of the library documented by a plugin that was built, documented, and
     * used by sixty-five files. Nothing said so, because a missing description
     * renders as an empty cell and an empty cell looks like a layout. */
    if (!/<!--\s*@summary\s+\S/.test(markup)) {
      problems.push(
        `${family}/${file}: has no \`<!-- @summary … -->\`. The Examples table will print its ` +
          'slug against a blank.',
      )
    }
    /* `@layout`, where an example asks for one.
     *
     * The value reaches the frame through the manifest and is applied as an
     * attribute, so a typo does not throw: it sets `data-layout="centred"`, no
     * rule matches, the example renders unstyled by any mode and looks merely
     * wrong. Three modes exist and they are named here so the misspelling fails
     * at the check rather than in a picture somebody has to notice.
     *
     * Only the shape is checked, not whether the annotation is present: absent
     * is the ordinary case and means the default. */
    const layout = /<!--\s*@layout\s+([^\s>-]+)\s*-->/.exec(markup)
    if (layout && !LAYOUTS.includes(layout[1])) {
      problems.push(
        `${family}/${file}: \`@layout ${layout[1]}\` is not a frame layout. ` +
          `Use one of ${LAYOUTS.join(', ')}.`,
      )
    }
    const link = /<link\b[^>]*\brel=(["'])stylesheet\1[^>]*>/is.exec(markup)
    const sheet = entries.includes(file.replace(/\.html$/, '.css'))
    if (sheet && !link) {
      problems.push(
        `${family}/${file}: ships ${file.replace(/\.html$/, '.css')} without linking it`,
      )
    }
    if (link && !sheet) {
      problems.push(`${family}/${file}: links a stylesheet that is not beside it`)
    }
    /* And it links `styles.css`, whatever the file beside it is called.
       The pair on disk is keyed by slug, `nested.html` and `nested.css`, and the
       sandbox shows them as `index.html` and `styles.css`. Twenty three examples
       linked the slug and seven linked `styles.css`, so the link a reader could
       see named a file they could not: it looked like the stylesheet in the tab
       beside it was not the one being applied. The name a reader is shown is the
       name the markup should say. */
    const href = link ? /\bhref=(["'])([^"']+)\1/i.exec(link[0])?.[2] : undefined
    if (href && href !== 'styles.css') {
      problems.push(
        `${family}/${file}: links \`${href}\`, which is not the \`styles.css\` a reader sees`,
      )
    }
  }

  for (const file of files) {
    const html = readFileSync(join(dir, file), 'utf8')
    const where = `${family}/${file}`

    /* Every element, not only the Helix ones: a `style` on the `<div>` wrapping
       them teaches the same habit as one on a component. The stylesheet beside
       the example is where this goes, which the sandbox already shows as
       `styles.css` next to `index.html`.

       An inline style cannot express a hover, a media query, a pseudo-element
       or a custom property block, and it outranks every rule a reader then
       writes against it, so the first thing they learn from copying one is that
       their own stylesheet does not work. */
    for (const [, tag] of html.matchAll(/<([a-z][a-z0-9-]*)[^>]*\sstyle=/g)) {
      problems.push(
        `${where}: <${tag}> carries a style attribute. Use ${file.replace(/\.html$/, '.css')}`,
      )
    }

    for (const [, tag, rest] of html.matchAll(/<(helix-[a-z0-9-]+)([^>]*)>/g)) {
      const known = tags.get(tag)
      if (!known) {
        problems.push(`${where}: <${tag}> is not a registered element`)
        continue
      }
      // Values are stripped first: a word inside one is not an attribute.
      const bare = rest.replace(/=\s*"[^"]*"/g, '=').replace(/=\s*'[^']*'/g, '=')
      for (const [, name] of bare.matchAll(/(?:^|\s)([a-z][a-z0-9-]*)/g)) {
        if (GLOBAL.has(name) || name.startsWith('aria-') || name.startsWith('data-')) {
          continue
        }
        if (!known.attributes.has(name)) {
          problems.push(`${where}: <${tag}> has no attribute "${name}"`)
          continue
        }
        if (known.controlled.has(name)) {
          const answers = known.answers.get(name) ?? []
          /* Answered, so the example owns the state on purpose. A listener for
             the settling event is the whole test: it is what a consumer writes,
             it is what the runtime audit looks for, and an example that has one
             works when a reader copies it. */
          const answered = answers.some(
            (event) => html.includes(`'${event}'`) || html.includes(`"${event}"`),
          )
          if (!answered) {
            problems.push(declaresState(where, tag, name, answers))
          }
        }
      }
    }

    for (const [, name] of html.matchAll(/slot="([a-z-]+)"/g)) {
      const declared = [...html.matchAll(/<(helix-[a-z0-9-]+)/g)].some(([, tag]) =>
        tags.get(tag)?.slots.has(name),
      )
      if (!declared) {
        problems.push(`${where}: no element here declares a "${name}" slot`)
      }
    }
  }
}

/* The documentation's HTML samples, held to the same rule.
 *
 * A reader copies what is in front of them, and a `style` attribute in a code
 * fence teaches the habit exactly as well as one in an example does. This check
 * walked `.examples` only, so the prose was the one place a `style` could
 * survive the sweep, and one did: the composition page's own argument is that
 * width belongs to the layout, illustrated with an inline style.
 *
 * Fenced HTML only. Prose may name the attribute, and a CSS fence may set
 * properties without any of this applying to it. */
const DOCS = ['helix/docs/content', 'cortex/docs/content']

for (const dir of DOCS) {
  if (!existsSync(dir)) {
    continue
  }
  for (const file of readdirSync(dir).filter((entry) => entry.endsWith('.mdx'))) {
    const text = readFileSync(join(dir, file), 'utf8')
    for (const [, fence] of text.matchAll(/```html\n([\s\S]*?)```/g)) {
      for (const [, tag] of fence.matchAll(/<([a-z][a-z0-9-]*)[^>]*\sstyle=/g)) {
        problems.push(`${dir}/${file}: <${tag}> carries a style attribute in an HTML sample`)
      }

      /* And the same rule about state, for the same reason as the style one: a
         reader copies what is in front of them. An HTML fence is markup with no
         script by definition, so a declared state in one is a sample that does
         not work when it is pasted. A prose mention is untouched, and a page
         that means to show controlled use writes the listener beside it, which
         makes it a `ts` fence rather than an `html` one. */
      for (const [, tag, rest] of fence.matchAll(/<(helix-[a-z0-9-]+)([^>]*)>/g)) {
        const known = tags.get(tag)
        if (!known) {
          continue
        }
        const bare = rest.replace(/=\s*"[^"]*"/g, '=').replace(/=\s*'[^']*'/g, '=')
        for (const [, name] of bare.matchAll(/(?:^|\s)([a-z][a-z0-9-]*)/g)) {
          if (known.controlled.has(name)) {
            problems.push(declaresState(`${dir}/${file}`, tag, name))
          }
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`Example violations (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  process.exit(1)
}
console.log(`examples: ${families.length} families, all valid`)
