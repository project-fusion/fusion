import { nameText } from '../name-text/name-text.js'
import { reportRuntime } from '../report-runtime/report-runtime.js'

/** Whether the ids in an IDREF list name something with words, in the tree `from` is in. */
const namesWithWords = (ids: string | null, from: Node, shown?: Element | null): boolean => {
  const root = from.getRootNode() as Document | ShadowRoot
  return (ids ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .some((id) => {
      const found = root.getElementById?.(id)
      return found ? nameText(found, shown).trim() !== '' : false
    })
}

/** The roles a control takes its name from its content in, as a button does. */
const NAMED_BY_CONTENT = new Set([
  'button',
  'checkbox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'switch',
  'tab',
])

/**
 * Whether an element has an accessible name, by the routes a page names a
 * control: its own `aria-label`, `aria-labelledby` or `title`, a `<label>`,
 * and its content where its role is named by its content.
 *
 * **A `placeholder` counts for no route.** A browser names a control by it
 * where nothing else does, and it is gone from the screen once a person
 * types, so a field named by it alone loses its label as it is filled.
 * React Aria's fields warn on the same terms.
 *
 * **An estimate, cheap on purpose.** It answers whether any route holds words,
 * which is what the warning is about, and leaves the order the routes win in
 * to the browser.
 *
 * **What the control shows as its value is no name**, so the words in
 * `shown` count for no route. A Select with no label names its trigger by the
 * part that shows the choice, and while nothing is chosen that part shows the
 * placeholder, "Choose", which says nothing about what is being chosen.
 */
export const hasName = (element: HTMLElement, shown?: Element | null): boolean => {
  for (const attribute of ['aria-label', 'title']) {
    if (element.getAttribute(attribute)?.trim()) {
      return true
    }
  }
  if (namesWithWords(element.getAttribute('aria-labelledby'), element, shown)) {
    return true
  }
  const referenced = (element as HTMLElement & { ariaLabelledByElements?: Element[] | null })
    .ariaLabelledByElements
  if ((referenced ?? []).some((one) => nameText(one, shown).trim() !== '')) {
    return true
  }
  const labels = (element as HTMLElement & { labels?: NodeList | null }).labels
  if ([...(labels ?? [])].some((label) => nameText(label).trim() !== '')) {
    return true
  }
  const role = element.getAttribute('role') ?? (element.localName === 'button' ? 'button' : '')
  return NAMED_BY_CONTENT.has(role) && nameText(element, shown).trim() !== ''
}

/** The elements whose name has been read, so each is warned about once. */
const audited = new WeakSet<HTMLElement>()

/** The elements waiting for the page to settle before their name is read. */
const waiting = new Map<HTMLElement, () => void>()

/** Reads every waiting name in one task. */
const readWaiting = (): void => {
  const checks = [...waiting.values()]
  waiting.clear()
  for (const check of checks) {
    check()
  }
}

/**
 * Warns once, through the runtime channel, when a control has no accessible
 * name: none on the host, and none on the control inside it.
 *
 * **Read a task after the control first renders**, so a label that arrives in
 * the same pass counts: slotted, written by a framework beside the control, or
 * forwarded from a `<label for>`. One timer serves every control that asked in
 * that task, and an element is read once in its life, so a name taken away
 * later is not reported.
 *
 * **In a development build only.** Every field and Button calls it, so in
 * production it would cost each of them about 450 bytes gzip for a sentence
 * meant for the person writing the page. Core imports it as `#audit-name`,
 * which `package.json` resolves here under the `development` condition (Vite
 * and webpack in development, `bun --conditions development`,
 * `node --conditions=development`) and to `audit-name-off.ts`, which does
 * nothing, everywhere else. Like every runtime warning it reports through the
 * one channel, and a project that wants the console quiet tells
 * `@fusion.dev/helix-diagnostics` with `core.warnings: false`.
 *
 * `also` answers for a name the component gave through its internals, which no
 * attribute shows. `fix` is the sentence that says how to name it. `shown` is
 * the part where the control shows its value or its placeholder, whose words
 * are no name.
 */
export const auditName = (
  host: HTMLElement,
  control: () => HTMLElement | null,
  fix: string,
  also?: () => boolean,
  shown?: () => Element | null,
): void => {
  if (audited.has(host) || waiting.has(host)) {
    return
  }
  if (waiting.size === 0) {
    setTimeout(readWaiting, 0)
  }
  waiting.set(host, () => {
    /* A host taken out before the read is read again when it next renders
       connected, which is when a reader could meet it. */
    if (!host.isConnected) {
      return
    }
    audited.add(host)
    const inner = control()
    const value = shown?.()
    if (also?.() || hasName(host) || (inner !== null && hasName(inner, value))) {
      return
    }
    const placeholder = [host, inner].some((one) => one?.getAttribute('placeholder')?.trim())
    reportRuntime({
      kind: 'missing-name',
      message: placeholder
        ? `<${host.localName}> is named only by its placeholder, which is gone once a person types. ${fix}`
        : `<${host.localName}> has no accessible name, so a screen reader announces it by its role alone. ${fix}`,
      tag: host.localName,
    })
  })
}
