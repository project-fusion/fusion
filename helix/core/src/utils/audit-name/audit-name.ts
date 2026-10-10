import { labelsOf } from '../labels-of/labels-of.js'
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
  if (labelsOf(element).some((label) => nameText(label).trim() !== '')) {
    return true
  }
  const role = element.getAttribute('role') ?? implicitRole(element)
  return NAMED_BY_CONTENT.has(role) && nameText(element, shown).trim() !== ''
}

/**
 * The role an element's tag gives it, among those named by their content: a
 * button, a `<summary>`, which a browser exposes as one, and a link with an
 * `href`.
 */
const implicitRole = (element: HTMLElement): string => {
  if (element.localName === 'button' || element.localName === 'summary') {
    return 'button'
  }
  return element.localName === 'a' && element.hasAttribute('href') ? 'link' : ''
}

/**
 * The sentences a control names by a key, so its words ship in a development
 * build only.
 *
 * **A sentence passed as an argument is in every build.** The call is a no-op
 * in production, and the string it is handed is still in the bundle: measured
 * on the styled Button bundled alone, October 7, 2026, its sentence was 52 bytes
 * brotli. A key costs a word, and the sentence lives here.
 */
const FIXES = new Map([
  ['accordion-item', 'Write its title in the `summary` slot.'],
  ['button', 'Give it words, a `label`, or an `aria-label`.'],
  ['button-group', 'Give it a `label`, or an `aria-label` that says what the buttons are for.'],
  ['canvas', 'Give it a `label` that says what the board holds, such as "Release plan".'],
  ['dialog', 'Give it a `label`, or a heading in the `header` slot.'],
  [
    'field',
    'Give it a `label`, an `aria-label`, words in its label, or a `<label for>` that names it.',
  ],
  ['graph', 'Give it a `label` that says what the notes are, such as "Research notes".'],
  ['lightbox', 'Give it a `label`, such as "Project photos".'],
  ['list', 'Give it a `label`, or an `aria-label` that says what the rows are.'],
  ['map', 'Give it a `label` that says what the map shows, such as "Stores in Edinburgh".'],
  ['popover', 'Give it a `label`, or a heading in the panel.'],
  ['row', 'Give the row words in its default slot, or a label on the icon it holds.'],
  ['sandbox', 'Give each source pane a `label` or a `name`, which its file tab shows.'],
  [
    'table',
    'Give it a `label`, or put a heading in its `heading` slot, that says what the rows are.',
  ],
  [
    'time-picker',
    'Give it a `label`, a label in the `label` slot, or an `aria-label` that says what the time is for.',
  ],
  [
    'toggle',
    'Give it words in its default slot, an `aria-label`, or a label on the icon it holds.',
  ],
  ['tour', 'Give it a `label`, such as "Getting started".'],
  ['tree', 'Give it a `label` that says what it holds, such as "Files".'],
  ['video', 'Give it a `label` that says what the video shows, such as "Product tour".'],
  ['virtual-list', 'Give it a `label`, or an `aria-label` that says what the items are.'],
])

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
 * `control` returns the control inside the host, `null` where the host is the
 * control, or `undefined` where the control is not drawn at the moment of the
 * read: the host is then read again the next time it asks.
 *
 * `also` answers for a name the component gave through its internals, which no
 * attribute shows. `fix` is the sentence that says how to name it, or its key
 * in `FIXES`. `shown` is the part where the control shows its value or its
 * placeholder, whose words are no name.
 */
export const auditName = (
  host: HTMLElement,
  control: () => HTMLElement | null | undefined,
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
    const inner = control()
    /* Not drawn now, such as a menu row whose page has closed: read again when
       it is next drawn and asks. */
    if (inner === undefined) {
      return
    }
    audited.add(host)
    const value = shown?.()
    if (also?.() || hasName(host) || (inner !== null && hasName(inner, value))) {
      return
    }
    const placeholder = [host, inner].some((one) => one?.getAttribute('placeholder')?.trim())
    const sentence = FIXES.get(fix) ?? fix
    reportRuntime({
      kind: 'missing-name',
      message: placeholder
        ? `<${host.localName}> is named only by its placeholder, which is gone once a person types. ${sentence}`
        : `<${host.localName}> has no accessible name, so a screen reader announces it by its role alone. ${sentence}`,
      tag: host.localName,
    })
  })
}

/** What `auditField` reads on a field, through a cast, since `MixinField` keeps them protected. */
interface Field extends HTMLElement {
  readonly labeled: boolean
  readonly namedControl: HTMLElement | null
  partNamed(name: string): Element | null
}

/**
 * Asks whether a field is named, as `auditName` does, with what every field
 * answers it by: the control its label points at, a label it was given or one
 * slotted with words in it, and the `value` part, whose words are no name.
 *
 * **Here rather than at the call in `MixinField`**, for the reason `FIXES` is
 * here: the call is a no-op in production, and the closures it was handed were
 * in every field's bundle anyway.
 */
export const auditField = (host: HTMLElement): void => {
  const field = host as Field
  auditName(
    field,
    () => field.namedControl,
    'field',
    () =>
      field.labeled ||
      [...field.children].some(
        (child) => child.slot === 'label' && (child.textContent ?? '').trim() !== '',
      ),
    () => field.partNamed('value'),
  )
}

/**
 * Asks the button or link a decorative icon sits in whether it has a name.
 * Its content is the icon alone where it has none, and the warning says so.
 * `label` is the icon's own, which names it, and the control with it.
 *
 * Words or a named picture beside the icon name the control from its
 * content, which the audit reads for a button and not for a link.
 */
export const auditIconControl = (icon: HTMLElement, label: string): void => {
  if (label !== '' || icon.hasAttribute('aria-label')) {
    return
  }
  const control = icon.closest<HTMLElement>(
    'a[href], button, summary, [role="button"], [role="link"]',
  )
  if (control) {
    auditName(
      control,
      () => null,
      `Its only content is <${icon.localName}>, which is decorative: give the icon a \`label\`, or the control an \`aria-label\`.`,
      () =>
        (control.textContent ?? '').trim() !== '' ||
        control.querySelector('[alt]:not([alt=""]), [aria-label]:not([aria-label=""])') !== null,
    )
  }
}
