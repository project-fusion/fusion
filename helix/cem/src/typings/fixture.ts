import type { HelixManifest } from '../types.js'

/**
 * A manifest holding one of each shape the typings have to tell apart: an
 * attribute named as its property, one named apart, a numeric one, one that
 * names no field, a getter, a static, a protected field, an event of its own
 * type, a bare event, and a platform event.
 */
export const MANIFEST: HelixManifest = {
  modules: [
    {
      declarations: [
        {
          attributes: [
            { description: 'The tone.', fieldName: 'tone', name: 'tone' },
            {
              description: 'The first page.\n\nStill the first page after a reset.',
              fieldName: 'defaultPage',
              name: 'default-page',
            },
            { fieldName: 'perView', name: 'per-view' },
            { fieldName: 'lineNumbers', name: 'line-numbers' },
            { fieldName: 'total', name: 'total' },
            {
              description: 'Names the field.',
              name: 'aria-label',
              type: { text: 'string | null' },
            },
          ],
          cssParts: [{ description: 'The box.', name: 'box' }],
          cssProperties: [{ description: 'The fill.', name: '--thing-fill' }],
          cssStates: [{ description: 'Settled.', name: 'settled' }],
          customElement: true,
          description: 'A thing.\n\nA second paragraph about the thing.',
          events: [
            {
              description: 'Before it checks.',
              name: 'helix-before-check',
              type: { text: 'HelixBeforeCheckEvent' },
            },
            { description: 'It changed.', name: 'change', type: { text: 'Event' } },
            { name: 'toggle', type: { text: 'ToggleEvent' } },
            { name: 'timeupdate', type: { text: 'Event' } },
          ],
          kind: 'class',
          members: [
            { kind: 'field', name: 'tone', type: { text: "'neutral' | 'danger'" } },
            { kind: 'field', name: 'defaultPage', type: { text: 'number' } },
            { kind: 'field', name: 'perView', type: { text: "number | 'auto'" } },
            { kind: 'field', name: 'lineNumbers', type: { text: 'boolean' } },
            { kind: 'field', name: 'total', type: { text: 'number' } },
            {
              description: 'Set by script.',
              kind: 'field',
              name: 'items',
              type: { text: 'string[]' },
            },
            { kind: 'field', name: 'count', readonly: true, type: { text: 'number' } },
            { kind: 'field', name: 'styles', static: true },
            { kind: 'field', name: 'namedBy', privacy: 'protected' },
            {
              kind: 'method',
              name: 'focus',
              parameters: [{ name: 'options', type: { text: 'FocusOptions' } }],
            },
          ],
          name: 'HelixThing',
          slots: [{ description: 'The body.', name: '' }],
          tagName: 'helix-thing',
        },
        { kind: 'class', name: 'NotAnElement' },
      ],
    },
  ],
}
