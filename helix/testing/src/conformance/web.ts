import { type Clock, moveClock } from './clock.js'
import {
  type Held,
  type Intent,
  recordedDetail,
  type Scenario,
  type Sent,
  type Setup,
  type Step,
  say,
} from './format.js'
import { pick } from './web-files.js'
import { fakeImages, picturesAnswered } from './web-images.js'
import { dismiss, focusPage, removePage } from './web-layer.js'
import { deepActive, isOpen, leftBy, type Mounted, type Updatable } from './web-left.js'
import { mountSetup } from './web-mount.js'
import { adjust, frame, pointAt, rangeKey, slide } from './web-range.js'
import { scroll } from './web-scroll.js'
import { laySections } from './web-sections.js'
import { leave, stepByKey, typeInto, watchFocus } from './web-text.js'

/*
 * The web half of the conformance suite: mounts a scenario's setup as
 * elements in the page, performs each intent with the events a browser
 * sends, and records what the elements sent and what each intent left.
 *
 * **Input is dispatched, as the browser specs dispatch it**, so where a
 * trusted event would make the browser act, the harness acts as the browser
 * would: Enter on a button or a link clicks it, and Space on a button or a
 * checkbox clicks it as the key comes up. A press lands where a finger on the item's words
 * lands, on the slot the words are drawn in.
 *
 * **A link is followed by nothing.** A click a link would follow reaches a
 * listener on the window last, which records its destination and keeps the
 * page where it is.
 */

/** The element a setup draws, with its props as attributes and what it holds. */
const build = (setup: Setup): Updatable => {
  const made = document.createElement(setup.tag) as Updatable
  for (const [name, value] of Object.entries(setup.props ?? {})) {
    if (value !== false) {
      made.setAttribute(name, value === true ? '' : String(value))
    }
  }
  if (setup.slot !== undefined) {
    made.setAttribute('slot', setup.slot)
  }
  for (const child of setup.children ?? []) {
    made.append(typeof child === 'string' ? document.createTextNode(child) : build(child))
  }
  return made
}

/** Waits until the element and everything the setup put in it have stopped updating. */
const settle = async (mounted: Mounted): Promise<void> => {
  const all = [mounted.root, ...mounted.items.values(), ...mounted.panels.values()]
  const updated = async () => {
    await null
    await Promise.all(all.map((one) => one.updateComplete))
  }
  await updated()
  await frame()
  await picturesAnswered()
  await updated()
}

/** Whether a key on the element is a checkbox's or a radio's, which Space clicks. */
const checkable = (at: Element): boolean =>
  at instanceof HTMLInputElement && (at.type === 'checkbox' || at.type === 'radio')

/** A detail as JSON holds it: its primitive fields and lists, without elements or functions. */
const plain = (detail: unknown): Readonly<Record<string, unknown>> => {
  if (detail === null || typeof detail !== 'object') {
    return {}
  }
  return Object.fromEntries(
    Object.entries(detail as Readonly<Record<string, unknown>>).filter(
      ([, value]) =>
        value === null ||
        ['boolean', 'number', 'string'].includes(typeof value) ||
        (Array.isArray(value) && value.every((one) => typeof one !== 'object')),
    ),
  )
}

/** The modifiers of an intent, as a keyboard or mouse event carries them. */
const modifiers = (held: Held | undefined) => ({
  altKey: held?.alt === true,
  ctrlKey: held?.toggle === true,
  shiftKey: held?.shift === true,
})

/** The nodes an event dispatched at `node` passes, as the browser builds its path. */
const pathOf = (node: Node): Node[] => {
  const path: Node[] = []
  for (let at: Node | null = node; at !== null; ) {
    path.push(at)
    const slot: HTMLSlotElement | null =
      at instanceof Element || at instanceof Text ? at.assignedSlot : null
    at = slot ?? (at instanceof ShadowRoot ? at.host : at.parentNode)
  }
  return path
}

/** Where a finger on an element's words lands: the slot they are drawn in, and its middle. */
const landing = (element: Element): { at: Element; x: number; y: number } => {
  const words = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)
  const at = (words as Text | undefined)?.assignedSlot ?? element
  const range = document.createRange()
  range.selectNodeContents(words ?? element)
  const box = range.getBoundingClientRect()
  return { at, x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/**
 * A tap: the pointer down and up, then the mouse events a touch sends after
 * it, then the click. **A disabled control in the way gets no click**, as a
 * browser sends none to one, where a dispatched click would still arrive.
 */
const tap = (element: Element, held: Held | undefined): void => {
  const { at, x, y } = landing(element)
  const base = { bubbles: true, cancelable: true, clientX: x, clientY: y, composed: true }
  const pointer = { ...base, isPrimary: true, pointerId: 2, pointerType: 'touch' }
  at.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, buttons: 1 }))
  at.dispatchEvent(new PointerEvent('pointerup', pointer))
  if (pathOf(at).some((node) => node instanceof Element && node.matches(':disabled'))) {
    return
  }
  at.dispatchEvent(new MouseEvent('mousedown', { ...base, ...modifiers(held), buttons: 1 }))
  at.dispatchEvent(new MouseEvent('mouseup', { ...base, ...modifiers(held) }))
  at.dispatchEvent(new PointerEvent('click', { ...pointer, ...modifiers(held), detail: 1 }))
}

/** A key pressed where focus is, and what a browser does with one nothing kept. */
const key = (name: string, held: Held | undefined): void => {
  const at = deepActive() ?? document.body
  const init = { bubbles: true, cancelable: true, composed: true, key: name, ...modifiers(held) }
  const down = new KeyboardEvent('keydown', init)
  at.dispatchEvent(down)
  /* A script's key moves no range, so the harness takes its step, as a browser does. */
  if (!down.defaultPrevented) {
    rangeKey(at, name)
  }
  const clicks = at instanceof HTMLButtonElement || (at instanceof HTMLAnchorElement && at.href)
  if (!down.defaultPrevented && name === 'Enter' && clicks) {
    ;(at as HTMLElement).click()
  }
  at.dispatchEvent(new KeyboardEvent('keyup', init))
  if (
    !down.defaultPrevented &&
    name === ' ' &&
    (at instanceof HTMLButtonElement || checkable(at))
  ) {
    ;(at as HTMLElement).click()
  }
}

/**
 * A finger held on a part while `ms` pass on the fake clock: a touch's
 * `pointerdown`, the clock moved, then `pointerup` and the click a touch
 * ends with, which a disabled control in the way gets none of.
 */
const hold = (
  mounted: Mounted,
  intent: Extract<Intent, { kind: 'hold' }>,
  clock: Clock | undefined,
): string | undefined => {
  const part = mounted.root.shadowRoot?.querySelector(`[part~="${intent.part}"]`)
  if (part === null || part === undefined) {
    return `The element draws no ${intent.part} part.`
  }
  if (clock === undefined) {
    return 'The harness was given no fake clock.'
  }
  const { ms } = intent
  const { at, x, y } = landing(part)
  const base = { bubbles: true, cancelable: true, clientX: x, clientY: y, composed: true }
  const pointer = { ...base, isPrimary: true, pointerId: 2, pointerType: 'touch' }
  at.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, buttons: 1 }))
  clock.advance(ms)
  at.dispatchEvent(new PointerEvent('pointerup', pointer))
  if (!pathOf(at).some((node) => node instanceof Element && node.matches(':disabled'))) {
    at.dispatchEvent(new PointerEvent('click', { ...pointer, detail: 1 }))
  }
  return undefined
}

/** Moves an item one place with its grip: Space picks it up, an arrow moves it, Space drops it. */
const nudge = async (mounted: Mounted, item: Element, by: -1 | 1): Promise<void> => {
  const grip = item.shadowRoot?.querySelector<HTMLElement>('[part~="grip"]')
  grip?.focus()
  for (const name of [' ', by > 0 ? 'ArrowDown' : 'ArrowUp', ' ']) {
    key(name, undefined)
    await settle(mounted)
  }
}

/** Drags an item by its grip with a mouse and lets go over one edge of another. */
const drag = async (item: Element, to: Element, edge: 'after' | 'before'): Promise<void> => {
  const grip = item.shadowRoot?.querySelector<HTMLElement>('[part~="grip"]')
  const from = grip?.getBoundingClientRect()
  const over = to.getBoundingClientRect()
  if (grip === null || grip === undefined || from === undefined) {
    return
  }
  const x = from.left + from.width / 2
  const send = (target: EventTarget, type: string, y: number) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
        composed: true,
        isPrimary: true,
        pointerId: 1,
        pointerType: 'mouse',
      }),
    )
  const start = from.top + from.height / 2
  const end = edge === 'after' ? over.bottom - over.height / 4 : over.top + over.height / 4
  send(grip, 'pointerdown', start)
  for (const y of [start + 8, (start + end) / 2, end]) {
    send(window, 'pointermove', y)
    await frame()
  }
  send(window, 'pointerup', end)
}

/** Performs one intent on the mounted setup. A clock's intent, a hold, and a pick are performed by `run`. */
const perform = async (
  mounted: Mounted,
  intent: Exclude<Intent, { kind: 'hide' | 'hold' | 'pick' | 'point' | 'show' | 'wait' }>,
): Promise<void> => {
  const item = (value: string | undefined) =>
    value === undefined ? mounted.root : (mounted.items.get(value) ?? mounted.root)
  switch (intent.kind) {
    case 'box':
      mounted.root.shadowRoot?.querySelectorAll<HTMLElement>('[part~="cell"]')[intent.at]?.click()
      return
    case 'drag':
      await drag(item(intent.item), item(intent.to), intent.edge)
      return
    case 'dismiss':
      dismiss(mounted, intent)
      return
    case 'focus': {
      if (intent.page === true) {
        focusPage(mounted)
        return
      }
      const target = item(intent.item) as Updatable & { focusItem?: () => void }
      if (typeof target.focusItem === 'function') {
        target.focusItem()
      } else {
        target.focus()
      }
      /* An element that takes no focus itself, as a splitter, has the first
         stop in its shadow tree focused, as a reader tabs to it. */
      if (!pathOf(deepActive() ?? document.body).includes(target)) {
        target.shadowRoot?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
      }
      return
    }
    case 'key':
      key(intent.key, intent.held)
      stepByKey(mounted, intent.key)
      return
    case 'type':
      await typeInto(mounted, intent, () => settle(mounted))
      return
    case 'leave':
      leave(mounted)
      return
    case 'slide':
      await slide(mounted, intent.to)
      return
    case 'adjust':
      adjust(mounted, intent.by)
      return
    case 'open':
    case 'close': {
      const target = item(intent.item)
      /* A bar's folded region opens by its toggle, where another element's
         item opens by its trigger. */
      if (isOpen(target) !== (intent.kind === 'open')) {
        const shadow = target.shadowRoot
        tap(
          shadow?.querySelector('[part~="trigger"]') ??
            shadow?.querySelector('[part~="toggle"]') ??
            target,
          undefined,
        )
      }
      return
    }
    case 'set': {
      const target = item(intent.item)
      if (intent.value === false) {
        target.removeAttribute(intent.prop)
      } else {
        target.setAttribute(intent.prop, intent.value === true ? '' : String(intent.value))
      }
      return
    }
    case 'move':
      await nudge(mounted, item(intent.item), intent.by)
      return
    case 'scroll':
      scroll(mounted.root, intent.x, intent.y)
      return
    case 'press': {
      if (intent.link !== undefined) {
        tap(mounted.root.querySelector(`a[href="#${intent.link}"]`) ?? mounted.root, intent.held)
        break
      }
      const pressed = item(intent.item)
      const part =
        intent.part === undefined
          ? pressed
          : pressed.shadowRoot?.querySelector(`[part~="${intent.part}"]`)
      tap(part ?? pressed, intent.held)
      return
    }
    case 'remove':
      mounted.root.addEventListener(`helix-${intent.event}`, (event) => {
        if (!event.defaultPrevented && event.target instanceof Element) {
          event.target.remove()
        }
      })
      return
    case 'refuse':
      for (const type of [
        `helix-${intent.event}`,
        ...(intent.event === 'change' ? ['change'] : []),
      ]) {
        /* In the capture phase, so an event that does not bubble, as an
           accordion section's `before-close`, is refused on its way to the
           item as well. */
        mounted.root.addEventListener(type, (event) => event.preventDefault(), { capture: true })
      }
      return
  }
}

/**
 * The events a family sends under their own names: a control's `change`, a
 * picture's answers, a section's `toggle`, a dialog's `close`, and a scroll
 * area's `scroll` and `scrollend`.
 */
const BARE: ReadonlySet<string> = new Set([
  'change',
  'close',
  'error',
  'load',
  'scroll',
  'scrollend',
  'toggle',
])

/** What an event carries: a custom event's detail, or a `toggle`'s two states. */
const carried = (event: Event): Readonly<Record<string, unknown>> => {
  if (event instanceof CustomEvent) {
    return plain(
      event.detail !== null && typeof event.detail === 'object'
        ? recordedDetail(event.detail as Readonly<Record<string, unknown>>)
        : event.detail,
    )
  }
  const { newState, oldState } = event as Event & { newState?: unknown; oldState?: unknown }
  return typeof newState === 'string' ? { newState, oldState } : {}
}

/**
 * The families a reader types into, moves along a track, picks a score in,
 * moves a divider in, or picks files into, whose `input` on each edit,
 * move, choice, or pick is
 * theirs and is recorded. Every other family's `input`
 * is the composed one its own `<input>` sends, which no record holds.
 */
const TYPED: ReadonlySet<string> = new Set([
  'color-input',
  'color-picker',
  'file-input',
  'input',
  'number-input',
  'pin-input',
  'rating',
  'slider',
  'splitter',
  'textarea',
])

/** The name an event goes by in a record: its type without `helix-`, and a bare one as it is. */
const nameOf = (type: string, family: string): string | undefined => {
  if (type.startsWith('helix-')) {
    return type.slice('helix-'.length)
  }
  return BARE.has(type) || (type === 'input' && TYPED.has(family)) ? type : undefined
}

/**
 * Mounts a scenario's setup, performs each intent, and returns what each one
 * did. Every element the setup made reports each event it sends itself, and
 * an event is read as refused once its intent has run. A scenario that
 * moves the fake clock is given `clock`, set as the timers capability first.
 */
export const run = async (scenario: Scenario, clock?: Clock): Promise<Step[]> => {
  const root = build(scenario.setup)
  const { heard, mounted } = mountSetup(root)
  const opened: string[] = []
  const follow = (event: Event) => {
    const link = event.composedPath().find((node) => node instanceof HTMLAnchorElement)
    if (!event.defaultPrevented && link instanceof HTMLAnchorElement && link.href !== '') {
      opened.push(link.getAttribute('href') ?? '')
      event.preventDefault()
    }
  }
  window.addEventListener('click', follow)
  const real = fakeImages()
  const unlay = laySections(scenario.setup)
  const unwatch = watchFocus(mounted)
  if (scenario.disabledFieldset === true) {
    const fieldset = document.createElement('fieldset')
    fieldset.disabled = true
    fieldset.append(root)
    document.body.append(fieldset)
  } else {
    document.body.append(root)
  }
  try {
    await settle(mounted)
    const steps: Step[] = []
    for (const intent of scenario.intents) {
      heard.length = 0
      opened.length = 0
      if (intent.kind === 'hide' || intent.kind === 'show' || intent.kind === 'wait') {
        const cannot = moveClock(clock, intent)
        if (cannot !== undefined) {
          steps.push({ cannot, intent: say(intent) })
          continue
        }
      } else if (intent.kind === 'hold') {
        const cannot = hold(mounted, intent, clock)
        if (cannot !== undefined) {
          steps.push({ cannot, intent: say(intent) })
          continue
        }
      } else if (intent.kind === 'point') {
        const cannot = await pointAt(mounted, intent.part, intent.x, intent.y)
        if (cannot !== undefined) {
          steps.push({ cannot, intent: say(intent) })
          continue
        }
      } else if (intent.kind === 'pick') {
        const cannot = pick(mounted, intent)
        if (cannot !== undefined) {
          steps.push({ cannot, intent: say(intent) })
          continue
        }
      } else {
        await perform(mounted, intent)
      }
      await settle(mounted)
      const events: Sent[] = heard.flatMap(({ event, from }) => {
        const name = nameOf(event.type, scenario.family)
        const detail = carried(event)
        return name === undefined ? [] : [{ canceled: event.defaultPrevented, detail, from, name }]
      })
      steps.push({ events, intent: say(intent), left: leftBy(mounted, opened, scenario.family) })
    }
    return steps
  } finally {
    window.removeEventListener('click', follow)
    real()
    unlay()
    unwatch()
    removePage()
    ;(deepActive() as HTMLElement | null)?.blur?.()
    root.remove()
  }
}
