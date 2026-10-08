import { reportRuntime } from '../report-runtime/report-runtime.js'

/** The hosts already reported, so each is reported at most once in its life. */
const audited = new WeakSet<HTMLElement>()

/**
 * Reports an item nested in another item of its own tag without the slot that
 * nests it, the one mistake that leaves a tree drawing the child as words.
 *
 * `<helix-tree-item>src<helix-tree-item>app.ts</helix-tree-item></helix-tree-item>`
 * puts the inner item in the outer one's default slot, which is its label: the
 * row reads "src app.ts" and is drawn as a leaf. The item has to carry
 * `slot="children"`. **Nothing moves it there**, because writing `slot` onto
 * an element the page rendered is a change to markup a server sent and a
 * framework owns.
 *
 * **In a development build only**, as `missing-name` is: every item would pay
 * for a sentence meant for the person writing the page. Core imports it as
 * `#audit-nesting`, which `package.json` resolves here under the `development`
 * condition and to `audit-nesting-off.ts`, which does nothing, everywhere else.
 *
 * `slot` is the name of the slot that nests an item.
 */
export const auditNesting = (host: HTMLElement, slot: string): void => {
  if (audited.has(host)) {
    return
  }
  const stray = [...host.children].find(
    (child) => child.localName === host.localName && !child.hasAttribute('slot'),
  )
  if (!stray) {
    return
  }
  audited.add(host)
  reportRuntime({
    kind: 'unslotted-item',
    message:
      `<${host.localName}> holds a <${stray.localName}> in its default slot, which is its ` +
      `label, so the inner item is read as words in the row and drawn as no branch. Add ` +
      `slot="${slot}" to each nested <${stray.localName}>.`,
    tag: host.localName,
  })
}
