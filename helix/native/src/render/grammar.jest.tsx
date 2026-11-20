import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { Family, Rule } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { element } from './element'

/* What a region gives the elements passed into it, drawn: a hook a part
   sets, a `::slotted()` rule by the child's place, and the child's own
   `:host(:first-child)` rule. */

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* An item in miniature: its words take the item's `color` hook, and are bold
   where the item is the first passed in. */
const item: Family = {
  api: {
    events: [],
    props: [{ attribute: true, name: 'label', tier: 'headless', type: 'string' }],
    states: [],
  },
  name: 'item',
  rules: [
    rule({
      order: 0,
      set: [['color', { hook: { fallback: { text: '#000000' }, name: 'color' } }]],
      specificity: [0, 1, 0],
      target: 'face',
    }),
    rule({
      order: 1,
      set: [['font-weight', { text: '700' }]],
      specificity: [0, 3, 0],
      target: 'face',
      when: [{ kind: 'host-place', place: 'first' }],
    }),
  ],
  tag: 'helix-item',
  tree: [
    {
      children: [{ attributes: { says: { bind: 'label' } }, kind: 'text', name: 'words' }],
      kind: 'box',
      name: 'face',
    },
  ],
  version: '2.0',
}

/** A group whose `items` part holds the default region, under `rules`. */
const group = (rules: Rule[]): Family => ({
  api: { events: [], props: [], states: [] },
  name: 'group',
  rules,
  tag: 'helix-group',
  tree: [{ children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'items' }],
  version: '2.0',
})

const Item = element(item)

/** Draws `family` holding an item for each label. */
const draw = async (family: Family, labels: string[]) => {
  const Group = element(family)
  return render(
    <ThemeProvider tokens={{}}>
      <Group>
        {labels.map((label) => (
          <Item key={label} label={label} />
        ))}
      </Group>
    </ThemeProvider>,
  )
}

describe('what a region gives what is passed into it', () => {
  test('a hook a part sets reaches an element passed into a region inside it', async () => {
    const setting = group([
      rule({
        order: 0,
        set: [['--item-color', { text: '#ff0000' }]],
        specificity: [0, 1, 0],
        target: 'items',
      }),
    ])
    await draw(setting, ['One'])
    expect(screen.getByText('One')).toHaveStyle({ color: '#ff0000' })
    await draw(group([]), ['Alone'])
    expect(screen.getByText('Alone')).toHaveStyle({ color: '#000000' })
  })

  test('a slotted rule on every child but the last, and the first child’s own rule', async () => {
    const spaced = group([
      rule({
        order: 0,
        region: 'default',
        set: [['--item-color', { text: '#0000ff' }]],
        slotted: '*',
        specificity: [0, 2, 2],
        target: 'host',
        when: [{ condition: { kind: 'place', place: 'last' }, kind: 'not' }],
      }),
    ])
    await draw(spaced, ['First', 'Second', 'Third'])
    expect(screen.getByText('First')).toHaveStyle({ color: '#0000ff', fontWeight: '700' })
    expect(screen.getByText('Second')).toHaveStyle({ color: '#0000ff' })
    expect(screen.getByText('Second')).not.toHaveStyle({ fontWeight: '700' })
    expect(screen.getByText('Third')).toHaveStyle({ color: '#000000' })
  })
})
