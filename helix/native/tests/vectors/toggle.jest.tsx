/*
 * Holds the native toggle host to the toggle machine's test vectors, the
 * list the machine's own spec and the web's `toggled` answer too. Each vector
 * draws a component that hosts the toggle from its starting context, presses
 * it step by step, refusing where the step says, and reads what the host
 * asked and told.
 */
import { setForm } from '@fusion.dev/helix-core/capabilities/form'
import { fakeForm } from '@fusion.dev/helix-core/capabilities/form/fake'
import type { ToggleContext } from '@fusion.dev/helix-core/machines/toggle/machine'
import { VECTORS } from '@fusion.dev/helix-core/machines/toggle/vectors'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Pressable, Text } from 'react-native'
import type { MachineUse } from '../../src/ir.generated'
import type { HelixEvent } from '../../src/machines/props'
import { useToggle } from '../../src/machines/toggle'
import type { Props } from '../../src/render/behavior'
import type { Family } from '../../src/style/form'

/** An element's form, as far as the toggle reads it. */
const FORM = {
  api: {
    events: [
      { cancelable: true, detail: ['checked'], name: 'before-toggle' },
      { bare: true, cancelable: false, detail: [], name: 'change' },
    ],
    props: [{ name: 'checked' }, { name: 'disabled' }, { name: 'mixed' }, { name: 'readonly' }],
    states: [],
  },
  name: 'checkbox',
  rules: [],
  tag: 'helix-checkbox',
  version: '1.0',
} as unknown as Family

const USE: MachineUse = {
  bind: {
    after: { event: 'change' },
    before: { event: 'before-toggle' },
    checked: { prop: 'checked' },
    disabled: { prop: 'disabled' },
    mixed: { prop: 'mixed' },
    part: { part: 'control' },
    readonly: { prop: 'readonly' },
  },
  machine: 'toggle',
}

/** A control that hosts a toggle and draws what it holds. */
const Control = (props: Props) => {
  const { behavior, turn } = useToggle(FORM, props, USE)
  const states = behavior.parts.control?.states
  return (
    <Pressable onPress={turn} testID="control">
      <Text testID="held">{`${states?.checked} ${states?.mixed}`}</Text>
    </Pressable>
  )
}

beforeEach(() => {
  setForm(fakeForm())
})

describe('the native toggle host, held to the toggle vectors', () => {
  for (const vector of VECTORS) {
    test(vector.name, async () => {
      const from: ToggleContext = vector.from
      const heard: string[] = []
      let refuse = false
      await render(
        <Control
          checked={from.checked}
          disabled={from.disabled}
          mixed={from.mixed}
          onBeforeToggle={(event: HelixEvent) => {
            heard.push('toggle')
            if (refuse) {
              event.preventDefault()
            }
          }}
          onChange={() => heard.push('announce')}
          readonly={from.readOnly}
        />,
      )
      for (const step of vector.steps) {
        heard.length = 0
        refuse = step.refuse === true
        await fireEvent.press(screen.getByTestId('control'))
        expect({
          heard: [...heard],
          held: screen.getByTestId('held').props.children,
        }).toEqual({
          heard: [...step.asks, ...step.effects.filter((effect) => effect === 'announce')],
          held: `${step.checked} ${step.mixed}`,
        })
      }
    })
  }
})
