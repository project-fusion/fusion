import { ariaChord } from '../chord/chord.js'
import { nameText } from '../name-text/name-text.js'
import { onApple } from '../platform/platform.js'

/*
 * Every labeled Helix control on the page, and every shortcut that belongs to
 * none, so a command palette can find a control by its name and a shortcut
 * overlay can show what each key does.
 *
 * **A control registers itself and is never listed by a page.** A list a page
 * kept would be wrong the first time a control was added without it. Each
 * control family adds `ListedController`, which joins on connect and leaves on
 * disconnect, and what a control is called and which keys it answers are read
 * when the list is asked for, so a renamed button lists by its new name.
 *
 * **Held on `globalThis` under a `Symbol.for` key**, as `DismissController`'s
 * set is, because a page can carry two copies of this module and one palette
 * has to find the controls of both.
 */

/** What running a listed control does: press it, or move focus into it. */
export type ControlKind = 'focus' | 'press'

/** A control on the page, as it registers itself. */
export interface ControlEntry {
  element: HTMLElement
  kind: ControlKind
  /**
   * The shortcuts the control answers, as `aria-keyshortcuts` spells them,
   * where they are not on its `aria-keyshortcuts` attribute, such as a value
   * written through `ElementInternals`.
   */
  keys?: (() => string | null | undefined) | undefined
}

/** A shortcut that belongs to the page or a region rather than to one control, such as ⌘K for a palette. */
export interface ShortcutEntry {
  /** The chord, as Kbd writes it: `mod+k`, `F8`. Read when the list is asked for. */
  keys: () => string
  /** What the shortcut does, such as "Open the command palette". */
  label: () => string
  /** The element it belongs to, which has to be connected for the shortcut to be listed. */
  owner: Element
  /** The control the shortcut acts on, where it acts on one, so a list can name it once. */
  target?: Element | undefined
}

/** A control as a list of what is on screen gives it. */
export interface ListedControl {
  element: HTMLElement
  /** The name of the nearest labeled region around it, or empty. */
  group: string
  /** Its shortcuts as chords, `mod+k` style, each one written once. */
  keys: string[]
  kind: ControlKind
  name: string
}

interface Registry {
  controls: Map<HTMLElement, ControlEntry>
  shortcuts: Set<ShortcutEntry>
}

const KEY = Symbol.for('fusion.helix.controls')
const globals = globalThis as unknown as Record<symbol, Registry | undefined>
if (globals[KEY] === undefined) {
  globals[KEY] = { controls: new Map(), shortcuts: new Set() }
}
const registry = globals[KEY]

/** Adds a control to the page's list. */
export const registerControl = (entry: ControlEntry): void => {
  registry.controls.set(entry.element, entry)
}

/** Takes a control off the page's list. */
export const unregisterControl = (element: HTMLElement): void => {
  registry.controls.delete(element)
}

/** Adds a shortcut that belongs to no one control, and returns what takes it away again. */
export const registerShortcut = (entry: ShortcutEntry): (() => void) => {
  registry.shortcuts.add(entry)
  return () => {
    registry.shortcuts.delete(entry)
  }
}

/** Each name `aria-keyshortcuts` uses, as a chord names it. */
const CHORD: Record<string, string> = {
  ' ': 'space',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  arrowup: 'up',
  control: 'ctrl',
  delete: 'del',
  escape: 'esc',
  meta: 'meta',
}

/** One `aria-keyshortcuts` chord, `Meta+Shift+K`, as Kbd's grammar writes it: `meta+shift+k`. */
export const chordOfAria = (aria: string): string =>
  aria
    .split('+')
    .map((part) => {
      const name = part.trim().toLowerCase()
      return CHORD[name] ?? name
    })
    .join('+')

/** The element's composed parent: its parent, or the host of the shadow root it sits in. */
const parentOf = (element: Element): Element | null =>
  element.parentElement ??
  ((element.getRootNode() as ShadowRoot).host as Element | undefined) ??
  null

/**
 * The name a reader is given for a control: its `label`, then `aria-label`,
 * then the text `aria-labelledby` points at, then its own content.
 */
export const controlName = (element: HTMLElement): string => {
  const own = (element as unknown as { label?: unknown }).label
  if (typeof own === 'string' && own.trim() !== '') {
    return own.trim()
  }
  const label = element.getAttribute('aria-label')
  if (label?.trim()) {
    return label.trim()
  }
  const ids = element.getAttribute('aria-labelledby')
  if (ids) {
    const scope = element.getRootNode() as Document | ShadowRoot
    const words = ids
      .split(/\s+/)
      .map((id) => scope.getElementById?.(id)?.textContent ?? '')
      .join(' ')
      .trim()
    if (words !== '') {
      return words
    }
  }
  return nameText(element).replace(/\s+/g, ' ').trim()
}

/** The name of the nearest region around a control that names itself, or empty. */
const groupOf = (element: HTMLElement): string => {
  for (let at = parentOf(element); at; at = parentOf(at)) {
    const label = at.getAttribute('aria-label') ?? (at as unknown as { label?: unknown }).label
    if (typeof label === 'string' && label.trim() !== '' && at.localName !== 'helix-command') {
      return label.trim()
    }
  }
  return ''
}

/**
 * Whether a control is one a reader can reach now: drawn, not disabled, and
 * not inside anything inert or `unlisted`. `unlisted` on the control or on any
 * element around it, across shadow roots, leaves it off every list.
 */
export const controlReachable = (element: HTMLElement): boolean => {
  if (!element.isConnected) {
    return false
  }
  if (
    (element as unknown as { disabled?: unknown }).disabled === true ||
    element.getAttribute('aria-disabled') === 'true'
  ) {
    return false
  }
  for (let at: Element | null = element; at; at = parentOf(at)) {
    if (
      at.hasAttribute('unlisted') ||
      at.hasAttribute('inert') ||
      (at as HTMLElement).inert === true
    ) {
      return false
    }
  }
  return typeof element.checkVisibility === 'function'
    ? element.checkVisibility({ visibilityProperty: true })
    : true
}

/** Each chord a control answers, read from its own words for them. */
const keysOf = (entry: ControlEntry): string[] => {
  /* The registered ones too. A Kbd writes its chord once React has hydrated the
     control, and it is on this list from the start. */
  const registered = [...registry.shortcuts]
    .filter((shortcut) => shortcut.target === entry.element)
    .map((shortcut) => ariaChord(shortcut.keys(), onApple()))
  const written = [entry.element.getAttribute('aria-keyshortcuts'), entry.keys?.(), ...registered]
    .filter((list): list is string => typeof list === 'string')
    .flatMap((list) => list.split(/\s+/))
    .filter((one) => one !== '')
    .map(chordOfAria)
  return [...new Set(written)]
}

/** Every control a reader can reach now, in document order, with its name, keys and group. */
export const listControls = (): ListedControl[] => {
  const listed = [...registry.controls.values()]
    .filter((entry) => controlReachable(entry.element))
    .map((entry) => ({
      element: entry.element,
      group: groupOf(entry.element),
      keys: keysOf(entry),
      kind: entry.kind,
      name: controlName(entry.element),
    }))
    .filter((control) => control.name !== '')
  return listed.sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element)
    return position & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : position & Node.DOCUMENT_POSITION_PRECEDING
        ? 1
        : 0
  })
}

/** Every shortcut that belongs to no one control, whose owner is on the page. */
export const listShortcuts = (): Array<{
  keys: string
  label: string
  owner: Element
  target?: Element | undefined
}> =>
  [...registry.shortcuts]
    .filter((entry) => entry.owner.isConnected)
    .map((entry) => ({
      keys: entry.keys(),
      label: entry.label(),
      owner: entry.owner,
      target: entry.target,
    }))
    .filter((entry) => entry.keys !== '')

/** Runs a listed control as a reader would: brings it into view, then presses it or focuses it. */
export const runControl = (control: Pick<ListedControl, 'element' | 'kind'>): void => {
  control.element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  if (control.kind === 'focus') {
    control.element.focus()
    return
  }
  control.element.click()
}
