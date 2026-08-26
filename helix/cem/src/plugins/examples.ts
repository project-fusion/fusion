import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HelixContext, HelixManifest, Plugin } from '../types.js'
import { eachComponent } from '../types.js'

/**
 * The one-line description, taken from a marked comment in the example itself.
 *
 * Marked rather than positional, because a leading comment already means
 * something else here. Examples are allowed one comment about their own
 * scaffolding, cut to a line: `<!-- Preview frame: the submit is swallowed. -->`
 * exists so nobody copies `onsubmit="event.preventDefault()"` into production.
 * Read positionally, that note would become the example's description and the
 * docs table would tell a reader that the Form example is about a swallowed
 * submit.
 *
 * `@summary` rather than `@description`, because it is the same one-line job
 * the tag already does on every component class, and a second word for it would
 * be a second convention to remember. The docs column is headed Description
 * because that is what a reader of a table expects to see; the file says
 * `@summary` because that is what this codebase calls a single line.
 */
const SUMMARY = /<!--\s*@summary\s+([\s\S]*?)\s*-->/

/**
 * Which frame layout the example wants, when it wants one it would not get.
 *
 * **Authored knowledge, not a preference.** Whether a component is worth
 * centering, or wants the whole frame, is a fact about the component that
 * somebody has to know once; rediscovering it per reader is what a default is
 * for. The frame offers three modes and the reference picks `centered`, so this
 * exists for the examples that mode is wrong for: a component that draws to the
 * viewport edge wants `fullscreen`, and one being shown in page context wants
 * `padded`.
 *
 * Absent on almost every example, which is the shape to keep. An annotation on
 * all ninety is a table of defaults maintained by hand; an annotation on the
 * six that differ is six facts.
 *
 * Read here rather than at the site, for the same reason the summary is: the
 * manifest is where a component says what it has, and a second reader parsing
 * the same comment would be a second convention to keep in step.
 */
const LAYOUT = /<!--\s*@layout\s+([a-z]+)\s*-->/

/**
 * The least height the preview pane should give this example, in pixels.
 *
 * **The one thing measurement cannot answer, and only for one group.** The
 * frame reports what it drew and the pane follows, which is why almost nothing
 * needs a number here: a declared height freezes what is otherwise derived and
 * goes stale the first time the example changes. Dialog, Drawer, Megamenu,
 * Menu, Popover and Tour are the exception, and not by preference. They draw a
 * trigger and nothing else until somebody presses it, so what is measured is a
 * 40 pixel button; what they open is `position: fixed`, which the frame's
 * measurement deliberately refuses to count, because an open Drawer is
 * `100dvh` and counting it would make the frame taller, which makes the drawer
 * taller, forever.
 *
 * So the pane gets room to open into, and the example stays closed. Marking
 * them `default-open` instead would have made the pictures taller and taught
 * every reader who copied one that a dialog is a thing that starts open.
 */
const MIN = /<!--\s*@min\s+(\d{2,4})\s*-->/

/** Collapses the wrapped lines of a comment into the single line it is. */
const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim()

/**
 * Attaches a family's examples to its root declaration.
 *
 * The examples were already on disk and already read, by the docs site, which
 * walked `helix/styled/src/<family>/.examples` itself. That worked and put the
 * knowledge in the wrong place: the site is a consumer of this library, and it
 * was reaching past the published interface into the library's source tree to
 * find out what a component ships. Anything else wanting the same list, another
 * site, an editor plugin, a generated README, would have had to reach in the
 * same way and agree with the site by coincidence.
 *
 * The manifest is where a component says what it has, so this is where the
 * examples belong. What lands here is the list and the prose: slug and
 * description. **Not the markup.** The HTML and CSS are the payload the sandbox
 * loads, they are large, and putting them in the manifest would grow a file
 * every consumer parses in order to serve one that few of them render.
 *
 * On the root, because an example is the family's, not any one element's.
 * `Card.Root` carries the examples that show `Card.Header` alongside it, and
 * there is no sense in which the header has examples of its own.
 */
export const examples = (): Plugin => ({
  name: 'helix-examples',
  packageLinkPhase({ context, customElementsManifest }) {
    for (const { declaration, module } of eachComponent(
      customElementsManifest as HelixManifest,
      context as HelixContext,
    )) {
      if (declaration.helix?.part !== 'Root') {
        continue
      }

      const family = /(?:^|\/)src\/([^/]+)\/[^/]+\/[^/]+\.[jt]s$/.exec(module.path ?? '')?.[1]
      if (!family) {
        continue
      }

      const dir = join(process.cwd(), 'src', family, '.examples')
      if (!existsSync(dir)) {
        continue
      }

      /* `default` first, then alphabetical. The canonical example is the
         family's headline rather than a variant sitting among the others, and
         a reader arriving at the list should meet it first. The order is fixed
         here rather than left to the directory, because `readdirSync` is
         filesystem order and would differ between a developer's machine and
         CI, which is a manifest that changes without anything changing. */
      const found = readdirSync(dir)
        .filter((file) => file.endsWith('.html'))
        .sort((a, b) => (a === 'preview.html' ? -1 : b === 'preview.html' ? 1 : a.localeCompare(b)))
        .map((file) => {
          const slug = file.replace(/\.html$/, '')
          const text = readFileSync(join(dir, file), 'utf8')
          const summary = SUMMARY.exec(text)?.[1]
          const layout = LAYOUT.exec(text)?.[1]
          const min = MIN.exec(text)?.[1]
          return {
            ...(summary ? { description: oneLine(summary) } : {}),
            ...(layout ? { layout } : {}),
            ...(min ? { min: Number(min) } : {}),
            slug,
          }
        })

      if (found.length > 0) {
        declaration.helix = { ...declaration.helix, examples: found }
      }
    }
  },
})
