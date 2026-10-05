import { reportRuntime } from '../report-runtime/report-runtime.js'

/**
 * The words a node gives a name computed from its content: its text, read
 * through slots, and the `aria-label` or `alt` of a picture in it, such as an
 * icon named by its own label. A node hidden from the reader gives none, and
 * so does `shown`, the part where a control shows its value.
 *
 * Exported for `AriaForwardController`, which asks whether a control's own
 * label has words in it.
 */
export const nameText = (node: Node, shown?: Element | null): string => {
  if (node === shown) {
    return ''
  }
  if (node instanceof HTMLSlotElement) {
    return node
      .assignedNodes({ flatten: true })
      .map((one) => nameText(one, shown))
      .join('')
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }
  if (!(node instanceof Element)) {
    return ''
  }
  if ((node instanceof HTMLElement && node.hidden) || node.getAttribute('aria-hidden') === 'true') {
    return ''
  }
  const said = node.getAttribute('aria-label') ?? node.getAttribute('alt')
  if (said?.trim()) {
    return said
  }
  return [...node.childNodes].map((one) => nameText(one, shown)).join('')
}

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
 * control: its own `aria-label`, `aria-labelledby` or `title`, a `<label>`, a
 * `placeholder`, and its content where its role is named by its content.
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
  for (const attribute of ['aria-label', 'title', 'placeholder']) {
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
 * **In every build.** Every runtime warning in the library reports through the
 * same channel whatever the build, and a project that wants the console quiet
 * tells `@fusion.dev/helix-diagnostics` with `core.warnings: false`.
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
    reportRuntime({
      kind: 'missing-name',
      message: `<${host.localName}> has no accessible name, so a screen reader announces it by its role alone. ${fix}`,
      tag: host.localName,
    })
  })
}
