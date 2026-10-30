/**
 * The machine a text field that opens a color picker runs, as a color input
 * does: the picker shows the last text that was a color, and a move in the
 * picker is an edit of the field's text, which the field's entry holds.
 */

import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { type ColorWords, colorName, parseColor } from '@fusion.dev/helix-core/color-picker'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useCallback, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { rnColor } from './color'
import type { Entered } from './entry'
import { boundTo, given, type HelixEvent } from './props'

/** What the field gives the verdict and its drawing. */
export interface ColorFielded {
  readonly behavior: Behavior
  /** Whether the text is no color. */
  readonly flawed: boolean
}

/**
 * Hosts what a field computes from its text, as the expansion binds it: the
 * box that draws the picker, and the values `picked`, `painted`, and `said`.
 * **A refusal in the field is a refusal in the picker**, so its square stays on
 * the color the field holds.
 */
export const useColorField = (
  family: Family,
  props: Props,
  use: MachineUse,
  entered: Entered | undefined,
): ColorFielded => {
  const text = entered?.value ?? ''
  const parsed = parseColor(text)
  const settled = useRef('')
  if (parsed !== null) {
    settled.current = text
  }
  const latest = useRef(entered)
  latest.current = entered
  const onBeforeChange = useCallback((event: HelixEvent<{ value?: string }>) => {
    if (latest.current?.ask(String(event.detail.value ?? '')) !== true) {
      event.preventDefault()
    }
  }, [])
  const onChange = useCallback(() => {
    latest.current?.commit()
  }, [])
  const where = locale().read()
  const words = (given(family, props, 'color-words') ?? {}) as Partial<ColorWords>
  /* The trigger's words, and in the swatch shape the color's. */
  const said =
    given(family, props, 'variant') !== 'swatch' || parsed === null
      ? String(given(family, props, 'trigger-label') ?? '')
      : formatMessage(
          String(given(family, props, 'swatch-label') ?? ''),
          { name: colorName(parsed, words, where), value: text },
          where,
        )
  const picker = boundTo(use, 'picker', 'part')
  const state = (name: string, value: string): Record<string, string> => {
    const bound = boundTo(use, name, 'state')
    return bound === undefined ? {} : { [bound]: value }
  }
  return {
    behavior: {
      marks: [],
      parts: {
        ...(picker === undefined
          ? {}
          : { [picker]: { view: { onBeforeChange, onChange, value: settled.current } } }),
        host: {
          states: {
            ...state('painted', parsed === null ? 'transparent' : rnColor(parsed)),
            ...state('picked', settled.current),
            ...state('said', said),
          },
        },
      },
    },
    flawed: text !== '' && parsed === null,
  }
}
