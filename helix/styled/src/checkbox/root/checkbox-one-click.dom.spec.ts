import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * One press, one click, as from a native control, on every host that passes a
 * click to the control inside it.
 *
 * **`HostClickController` sent a second click.** Checkbox, Switch, Radio and
 * Toggle pass a click on the host to their control, and that click was
 * composed, so it crossed the shadow root after the host's own: a listener on
 * the host heard two clicks for one `click()` or one press on a `<label for>`,
 * where one on a native `<input type="checkbox">` hears one. Measured in
 * Chromium on both tiers before the fix. Button, Icon Button, Copy Button,
 * Tab, Menu Item, Drilldown Item and Speed Dial Item pass `click()` to their
 * control by their own override, and are held here to the same count.
 *
 * Across families and both tiers in one file, because what is asserted is the
 * shared path and the native element beside it. Each case is counted at the
 * host, and at the document in both phases, for what a page or a framework's
 * root listener hears.
 */
/** The families whose hosts are pressed. */
const FAMILIES = [
  'button',
  'checkbox',
  'copy-button',
  'drilldown',
  'icon-button',
  'menu',
  'radio',
  'speed-dial',
  'switch',
  'tabs',
  'toggle',
]

beforeAll(async () => {
  registerDom()
  /* The styled tier first, which brings the headless tier it extends, then
     each headless family by name. One at a time, so each module is evaluated
     once. */
  for (const family of FAMILIES) {
    await import(`../../${family}/index.js`)
  }
  for (const family of FAMILIES) {
    await import(`@fusion.dev/helix-headless/${family}`)
  }
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** A host to press, from the markup it sits in, and the part that is its control. */
interface Case {
  /** What the case is called in the test's name. */
  name: string
  /** The markup mounted. The host is the element with `id="host"`. */
  markup: string
  /** The part the host passes a click to, or nothing for a native element. */
  control?: string
  /** Whether the press sends `input` from the host, once. */
  input?: boolean
  /** Whether the press sends `change` from the host, once. */
  change?: boolean
}

/** What one press was heard as. */
interface Heard {
  /** Clicks at the host. */
  host: number
  /** Clicks at the document, in the capture phase. */
  capture: number
  /** Clicks at the document, in the bubble phase. */
  bubble: number
  /** `input` events at the host. */
  input: number
  /** `change` events at the host. */
  change: number
}

/** The cases for one tier, by its tag prefix. */
const hosts = (tier: string): Case[] => [
  {
    change: true,
    control: 'control',
    input: true,
    markup: `<${tier}checkbox id="host">C</${tier}checkbox>`,
    name: 'Checkbox',
  },
  {
    change: true,
    control: 'control',
    input: true,
    markup: `<${tier}switch id="host">S</${tier}switch>`,
    name: 'Switch',
  },
  {
    control: 'item',
    markup: `<${tier}radio-group label="R"><${tier}radio value="a">A</${tier}radio><${tier}radio id="host" value="b">B</${tier}radio></${tier}radio-group>`,
    name: 'Radio',
  },
  {
    change: true,
    control: 'item',
    markup: `<${tier}toggle id="host">T</${tier}toggle>`,
    name: 'Toggle',
  },
  {
    control: 'item',
    markup: `<${tier}toggle-group label="T"><${tier}toggle value="a">A</${tier}toggle><${tier}toggle id="host" value="b">B</${tier}toggle></${tier}toggle-group>`,
    name: 'Toggle in a group',
  },
  { control: 'button', markup: `<${tier}button id="host">B</${tier}button>`, name: 'Button' },
  {
    control: 'button',
    markup: `<${tier}icon-button id="host" label="Save"></${tier}icon-button>`,
    name: 'Icon Button',
  },
  {
    control: 'button',
    markup: `<${tier}copy-button id="host" value="x"></${tier}copy-button>`,
    name: 'Copy Button',
  },
  { control: 'tab', markup: `<${tier}tab id="host" value="one">One</${tier}tab>`, name: 'Tab' },
  {
    control: 'item',
    markup: `<${tier}menu-item id="host" value="a">Open</${tier}menu-item>`,
    name: 'Menu Item',
  },
  {
    control: 'item',
    markup: `<${tier}drilldown-item id="host" value="a">Settings</${tier}drilldown-item>`,
    name: 'Drilldown Item',
  },
  {
    control: 'item',
    markup: `<${tier}speed-dial-item id="host" value="save" label="Save"></${tier}speed-dial-item>`,
    name: 'Speed Dial Item',
  },
]

/** The native elements the counts are held to. */
const NATIVE: Case[] = [
  {
    change: true,
    input: true,
    markup: '<input id="host" type="checkbox">',
    name: 'a native checkbox',
  },
  { markup: '<button id="host" type="button">B</button>', name: 'a native button' },
]

/** Mounts a case and waits until its host has rendered. */
const host = async (one: Case): Promise<HTMLElement> => {
  await mount(one.markup)
  const found = document.getElementById('host') as HTMLElement & Partial<Updatable>
  await found.updateComplete
  return found
}

/** Waits until the mounted tree, a group around its host included, has rendered. */
const settled = async (): Promise<void> => {
  const root = document.body.firstElementChild as (HTMLElement & Partial<Updatable>) | null
  if (root?.updateComplete) {
    await settle(root as Updatable)
  }
  await (document.getElementById('host') as HTMLElement & Partial<Updatable>).updateComplete
}

/** Counts the clicks, `input` and `change` that `press` sends. */
const hear = (target: HTMLElement, press: () => void): Heard => {
  const heard: Heard = { bubble: 0, capture: 0, change: 0, host: 0, input: 0 }
  const onHost = (): void => {
    heard.host += 1
  }
  const onCapture = (): void => {
    heard.capture += 1
  }
  const onBubble = (): void => {
    heard.bubble += 1
  }
  const onInput = (): void => {
    heard.input += 1
  }
  const onChange = (): void => {
    heard.change += 1
  }
  target.addEventListener('click', onHost)
  target.addEventListener('input', onInput)
  target.addEventListener('change', onChange)
  document.addEventListener('click', onCapture, true)
  document.addEventListener('click', onBubble)
  try {
    press()
  } finally {
    target.removeEventListener('click', onHost)
    target.removeEventListener('input', onInput)
    target.removeEventListener('change', onChange)
    document.removeEventListener('click', onCapture, true)
    document.removeEventListener('click', onBubble)
  }
  return heard
}

/** What one press is heard as: one click everywhere, and one `input` and `change` where the case sends them. */
const once = (one: Case): Heard => ({
  bubble: 1,
  capture: 1,
  change: one.change ? 1 : 0,
  host: 1,
  input: one.input ? 1 : 0,
})

/** A host's checked or chosen state, whichever it has. */
const state = (target: HTMLElement): unknown => {
  const read = target as HTMLElement & { checked?: boolean; selected?: boolean }
  return read.checked ?? read.selected
}

/** A case's name with its tier, for the test's name. */
const title = (one: Case): string =>
  `on ${one.name}${one.control === undefined ? '' : one.markup.includes('helix-headless-') ? ', headless' : ', styled'}`

const ALL = [...NATIVE, ...hosts('helix-headless-'), ...hosts('helix-')]
/* The hosts `HostClickController` serves, and the native checkbox beside them. */
const FORWARDED = [
  NATIVE[0] as Case,
  ...['helix-headless-', 'helix-'].flatMap((tier) =>
    hosts(tier).filter((one) =>
      ['Checkbox', 'Switch', 'Radio', 'Toggle', 'Toggle in a group'].includes(one.name),
    ),
  ),
]
const BOXES = ALL.filter((one) => one.input)

describe('one click() is one click', () => {
  for (const one of ALL) {
    test(title(one), async () => {
      const target = await host(one)
      expect(hear(target, () => target.click())).toEqual(once(one))
    })
  }
})

describe('one press on the control inside is one click', () => {
  for (const one of ALL.filter((each) => each.control)) {
    test(title(one), async () => {
      const target = await host(one)
      const control = part(target, one.control as string) as HTMLElement
      expect(hear(target, () => control.click())).toEqual(once(one))
    })
  }
})

describe('a click sent to the host moves the control, and is the only click', () => {
  /* What a `<label for>` and a press on the host's own box send: a click that
     starts at the host. The control moves, and the page hears that one click. */
  for (const one of FORWARDED) {
    test(title(one), async () => {
      const target = await host(one)
      const before = state(target)
      const heard = hear(target, () =>
        target.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }),
        ),
      )
      await settled()
      expect(heard).toEqual(once(one))
      expect(state(target)).toBe(!before)
    })
  }
})

describe('a box keeps its state when the one click is canceled', () => {
  for (const one of BOXES) {
    test(title(one), async () => {
      const target = await host(one)
      const cancel = (event: Event): void => event.preventDefault()
      target.addEventListener('click', cancel)
      const heard = hear(target, () => target.click())
      target.removeEventListener('click', cancel)
      await settled()
      expect(heard).toEqual({ bubble: 1, capture: 1, change: 0, host: 1, input: 0 })
      expect(state(target)).toBe(false)
    })
  }
})

describe('a disabled box sends no click', () => {
  for (const one of BOXES) {
    test(title(one), async () => {
      const target = await host({
        ...one,
        markup: one.markup.replace('id="host"', 'id="host" disabled'),
      })
      expect(hear(target, () => target.click())).toEqual({
        bubble: 0,
        capture: 0,
        change: 0,
        host: 0,
        input: 0,
      })
      expect(state(target)).toBe(false)
    })
  }
})
