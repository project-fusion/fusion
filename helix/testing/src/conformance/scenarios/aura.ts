import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Aura, whose field is drawn on the GPU and out of a screen
 * reader's reach. The record holds its pause control: the press that holds
 * the field and lets it run again, and the `change` it says each time.
 */

/** Auras: the pause control turning the field, and a field that starts paused. */
export const AURA: readonly Scenario[] = [
  {
    family: 'aura',
    intents: [
      { kind: 'press', part: 'pause' },
      { kind: 'press', part: 'pause' },
    ],
    name: 'the pause control holds the field and lets it run again, and says change each time',
    setup: el('helix-aura', { 'pause-control': true }),
  },
  {
    family: 'aura',
    intents: [{ kind: 'press', part: 'pause' }],
    name: 'a field that starts paused runs on a press',
    setup: el('helix-aura', { 'pause-control': true, paused: true }),
  },
]
