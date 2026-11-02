/*
 * A family that draws a picture, written in the shape the compiler writes,
 * since no neutral family draws one yet: its image fits by `object-fit:
 * cover`, is unseen while loading, seen once loaded, and half seen in error.
 */
import { behaviorFor } from '../machines/compose'
import type { Family, Rule } from '../style/form'
import { element } from './element'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

export const picture = (empty?: 'error'): Family => ({
  api: {
    events: [
      { bare: true, cancelable: false, detail: [], name: 'error' },
      { bare: true, cancelable: false, detail: [], name: 'load' },
    ],
    props: [
      { attribute: true, name: 'alt', tier: 'headless', type: 'string' },
      { attribute: true, default: '', name: 'src', tier: 'headless', type: 'string' },
    ],
    states: ['error', 'loaded', 'loading'],
  },
  machines: [
    {
      bind: {
        error: { event: 'error' },
        load: { event: 'load' },
        part: { part: 'image' },
        src: { prop: 'src' },
      },
      machine: 'load',
    },
  ],
  name: 'picture',
  rules: [
    rule({
      order: 0,
      set: [
        ['object-fit', { text: 'cover' }],
        ['opacity', { number: 0 }],
      ],
      specificity: [0, 1, 0],
      target: 'image',
    }),
    rule({
      order: 1,
      set: [['opacity', { number: 1 }]],
      specificity: [0, 2, 0],
      target: 'image',
      when: [{ kind: 'state', name: 'loaded' }],
    }),
    rule({
      order: 2,
      set: [['opacity', { number: 0.5 }]],
      specificity: [0, 2, 0],
      target: 'image',
      when: [{ kind: 'state', name: 'error' }],
    }),
  ],
  tag: 'helix-picture',
  tree: [
    {
      attributes: {
        alt: { bind: 'alt' },
        ...(empty === undefined ? {} : { empty }),
        fails: 'error',
        loads: 'load',
        src: { bind: 'src' },
      },
      kind: 'image',
      name: 'image',
    },
  ],
  version: '2.0',
})

/** A picture's component, its image found by `image`. */
export const made = (empty?: 'error') => {
  const form = picture(empty)
  const behavior = behaviorFor(form)
  return element(form, (family, given) => {
    const bound = behavior(family, given)
    const own = bound.parts.image
    return {
      ...bound,
      parts: { ...bound.parts, image: { ...own, view: { ...own?.view, testID: 'image' } } },
    }
  })
}
