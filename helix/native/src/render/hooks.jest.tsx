import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import type { Family, Rule } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import type { Props, UseBehavior } from './behavior'
import { element } from './element'

/* The `hooks` prop, as an inline `style` sets a hook on the web: it stands
   over the hook the element's own `:host` rule sets, the one an enclosing
   component sets, and the rule's fallback, and the components inside
   inherit it. */

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/** A face filled with `--probe-fill-color`, `#111111` without it, holding what is passed in. */
const probe: Family = {
  api: {
    events: [],
    props: [{ attribute: true, name: 'tone', tier: 'styled', type: ['loud'] }],
    states: [],
  },
  name: 'probe',
  rules: [
    rule({
      order: 0,
      set: [['--probe-fill-color', { text: '#444444' }]],
      specificity: [0, 2, 0],
      target: 'host',
      when: [{ kind: 'attribute', name: 'tone', value: 'loud' }],
    }),
    rule({
      order: 1,
      set: [['background-color', { hook: { fallback: { text: '#111111' }, name: 'fill-color' } }]],
      specificity: [0, 1, 0],
      target: 'face',
    }),
  ],
  tag: 'helix-probe',
  tree: [{ children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'face' }],
  version: '2.0',
}

/** An enclosing component that sets the probe's hook on what it holds. */
const frame: Family = {
  api: { events: [], props: [], states: [] },
  name: 'frame',
  rules: [
    rule({
      order: 0,
      set: [['--probe-fill-color', { text: '#222222' }]],
      specificity: [0, 1, 0],
      target: 'host',
    }),
  ],
  tag: 'helix-frame',
  tree: [{ children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'body' }],
  version: '2.0',
}

/** A behavior that gives the face a test ID from the element's own `testID` prop. */
const tagged: UseBehavior = (_family, props: Props) => ({
  marks: [],
  parts: { face: { view: { testID: String(props.testID ?? 'face') } } },
})

const Probe = element(probe, tagged)
const Frame = element(frame)

const draw = async (children: ReactNode) => {
  await render(<ThemeProvider tokens={{ 'color-foreground': '#000000' }}>{children}</ThemeProvider>)
}

const fill = (id = 'face') => screen.getByTestId(id)

describe('the hooks prop', () => {
  test('stands over the rule’s fallback, by the hook’s name in camel case', async () => {
    await draw(<Probe />)
    expect(fill()).toHaveStyle({ backgroundColor: '#111111' })
    await draw(<Probe hooks={{ fillColor: '#333333' }} />)
    expect(fill()).toHaveStyle({ backgroundColor: '#333333' })
  })

  test('stands over the hook the element’s own `:host` rule sets', async () => {
    await draw(<Probe tone="loud" />)
    expect(fill()).toHaveStyle({ backgroundColor: '#444444' })
    await draw(<Probe hooks={{ fillColor: '#333333' }} tone="loud" />)
    expect(fill()).toHaveStyle({ backgroundColor: '#333333' })
  })

  test('stands over the hook an enclosing component sets', async () => {
    await draw(
      <Frame>
        <Probe />
      </Frame>,
    )
    expect(fill()).toHaveStyle({ backgroundColor: '#222222' })
    await draw(
      <Frame>
        <Probe hooks={{ fillColor: '#333333' }} />
      </Frame>,
    )
    expect(fill()).toHaveStyle({ backgroundColor: '#333333' })
  })

  test('reaches the components inside, as an inherited custom property does', async () => {
    await draw(
      <Probe hooks={{ fillColor: '#333333' }} testID="outer">
        <Probe testID="inner" />
      </Probe>,
    )
    expect(fill('outer')).toHaveStyle({ backgroundColor: '#333333' })
    expect(fill('inner')).toHaveStyle({ backgroundColor: '#333333' })
  })
})
