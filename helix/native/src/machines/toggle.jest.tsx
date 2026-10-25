import { setForm } from '@fusion.dev/helix-core/capabilities/form'
import { type FakeForm, fakeForm } from '@fusion.dev/helix-core/capabilities/form/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { element } from '../render/element'
import type { Family } from '../style/form'
import { behaviorFor } from './compose'
import type { HelixEvent } from './props'

/** A prop as the form writes one, with its default where it has one. */
const prop = (name: string, value?: boolean | string) => ({
  attribute: true,
  ...(value === undefined ? {} : { default: value }),
  name,
  tier: 'headless',
  type: typeof value === 'string' ? 'string' : 'boolean',
})

/* A checkbox in miniature, bound as the expansion binds an element with a
   `toggle` and a pressable that `toggles` it. */
const checkbox = {
  api: {
    events: [
      { cancelable: true, detail: ['checked'], name: 'before-toggle' },
      { bare: true, cancelable: false, detail: [], name: 'change' },
    ],
    props: [
      prop('checked'),
      prop('default-checked', false),
      prop('disabled', false),
      prop('indeterminate', false),
      prop('readonly', false),
      prop('value', 'on'),
    ],
    states: [],
    toggle: {
      after: 'change',
      before: 'before-toggle',
      checked: 'checked',
      initial: 'default-checked',
      mixed: 'indeterminate',
      readonly: 'readonly',
    },
  },
  machines: [
    {
      bind: { disabled: { prop: 'disabled' }, keys: { key: ' ' }, part: { part: 'control' } },
      machine: 'press',
    },
    {
      bind: {
        after: { event: 'change' },
        before: { event: 'before-toggle' },
        checked: { prop: 'checked' },
        disabled: { prop: 'disabled' },
        mixed: { prop: 'indeterminate' },
        part: { part: 'control' },
        readonly: { prop: 'readonly' },
        seed: { prop: 'default-checked' },
      },
      machine: 'toggle',
    },
  ],
  name: 'checkbox',
  rules: [],
  tag: 'helix-checkbox',
  tree: [
    {
      attributes: {
        disabled: { bind: 'disabled' },
        keys: 'space',
        role: 'checkbox',
        toggles: true,
      },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'pressable',
      name: 'control',
    },
  ],
  version: '1.0',
} as unknown as Family

const Checkbox = element(checkbox, behaviorFor(checkbox))

/* A toggle button in miniature: the same toggle, on a pressable whose form
   names no `keys`, so Enter and Space both press it, as they press a button. */
const button = {
  ...checkbox,
  machines: [
    { bind: { disabled: { prop: 'disabled' }, part: { part: 'control' } }, machine: 'press' },
    checkbox.machines?.[1],
  ],
  name: 'toggle',
  tag: 'helix-toggle',
  tree: [
    {
      attributes: { disabled: { bind: 'disabled' }, role: 'button', toggles: true },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'pressable',
      name: 'control',
    },
  ],
} as unknown as Family

const ToggleButton = element(button, behaviorFor(button))

type Turn = HelixEvent<{ checked?: boolean }, { checked?: boolean; value?: string }>

/** What a screen reader hears the box is: checked, unchecked, or mixed. */
const state = () => screen.getByRole('checkbox').props.accessibilityState?.checked

/** A press on the box, as a tap does. */
const press = () => fireEvent.press(screen.getByRole('checkbox'))

let form: FakeForm<unknown> = fakeForm()
let keys: FakeKeys<unknown> = fakeKeys()
/* The parts listening for keys, in the order they started. */
let heard: unknown[] = []

/** Presses `key` on the first part listening for keys. */
const pressKey = (key: string) => act(() => void keys.press(heard[0], key))

beforeEach(() => {
  const fake = fakeKeys<unknown>()
  heard = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      heard.push(node)
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
  form = fakeForm()
  setForm(form)
})

afterEach(() => {
  setForm(fakeForm())
})

describe('a toggle bound through its form', () => {
  test('asks with the state a press proposes, turns, then tells, and the box says so', async () => {
    const heard: string[] = []
    await render(
      <Checkbox
        onBeforeToggle={(event: Turn) =>
          heard.push(`before ${event.detail.checked} from ${event.target.checked}`)
        }
        onChange={(event: Turn) =>
          heard.push(`change to ${event.target.checked}, ${event.target.value}`)
        }
      >
        Terms
      </Checkbox>,
    )
    expect(state()).toBe(false)
    await press()
    expect(state()).toBe(true)
    await press()
    expect(state()).toBe(false)
    expect(heard).toEqual([
      'before true from false',
      'change to true, on',
      'before false from true',
      'change to false, on',
    ])
  })

  test('stays as it was and tells nothing where a handler refuses the turn', async () => {
    const heard: string[] = []
    await render(
      <Checkbox
        onBeforeToggle={(event: Turn) => event.preventDefault()}
        onChange={() => heard.push('change')}
      >
        Terms
      </Checkbox>,
    )
    await press()
    expect([state(), heard]).toEqual([false, []])
  })

  test('starts where its seed says, and tells nothing for it', async () => {
    const heard: string[] = []
    await render(
      <Checkbox defaultChecked onChange={() => heard.push('change')}>
        Terms
      </Checkbox>,
    )
    expect([state(), heard]).toEqual([true, []])
  })

  test('takes a written state with nothing sent, and a press still turns it', async () => {
    const heard: string[] = []
    const onChange = () => heard.push('change')
    const view = await render(
      <Checkbox checked={false} onChange={onChange}>
        Terms
      </Checkbox>,
    )
    await view.rerender(
      <Checkbox checked onChange={onChange}>
        Terms
      </Checkbox>,
    )
    expect([state(), heard]).toEqual([true, []])
    await press()
    expect([state(), heard]).toEqual([false, ['change']])
  })

  test('shows mixed until a press resolves it, and shows it again where written again', async () => {
    const view = await render(<Checkbox indeterminate>Terms</Checkbox>)
    expect(state()).toBe('mixed')
    await press()
    expect(state()).toBe(true)
    await view.rerender(<Checkbox indeterminate={false}>Terms</Checkbox>)
    await view.rerender(<Checkbox indeterminate>Terms</Checkbox>)
    expect(state()).toBe('mixed')
  })

  test('asks nothing and stays as it was while read-only or disabled', async () => {
    for (const flags of [{ readonly: true }, { disabled: true }]) {
      const heard: string[] = []
      const view = await render(
        <Checkbox {...flags} onBeforeToggle={() => heard.push('before')}>
          Terms
        </Checkbox>,
      )
      await press()
      expect([state(), heard]).toEqual([false, []])
      await view.unmount()
    }
  })

  test('hands the form capability the value while checked, from the mount on, and no control', async () => {
    await render(<Checkbox value="yes">Terms</Checkbox>)
    await press()
    expect(form.values).toEqual([
      { node: null, value: null },
      { node: null, value: 'yes' },
    ])
  })

  /* The web's Checkbox and Switch are a native checkbox, which Space presses
     and Enter does not. A Toggle and a Motion Toggle are a button, which both
     press. Each form says which with its pressable's `keys`. */
  test('turns on Space alone where its form names Space, and on Enter and Space where it names none', async () => {
    const view = await render(<Checkbox>Terms</Checkbox>)
    await pressKey('Enter')
    expect(state()).toBe(false)
    await pressKey(' ')
    expect(state()).toBe(true)
    await view.unmount()
    heard = []
    await render(<ToggleButton>Bold</ToggleButton>)
    /* A button that toggles is announced as a toggle button. */
    const pressed = () => screen.getByRole('togglebutton').props.accessibilityState?.checked
    await pressKey('Enter')
    expect(pressed()).toBe(true)
    await pressKey(' ')
    expect(pressed()).toBe(false)
  })
})
