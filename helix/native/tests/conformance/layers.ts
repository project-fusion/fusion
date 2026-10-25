import type { Intent } from '@fusion.dev/helix-testing/conformance'
import { jest } from '@jest/globals'
import { act, fireEvent, screen } from '@testing-library/react-native'
import { BackHandler } from 'react-native'
import { formOf, HOST_STATES } from './forms'
import { key } from './input'
import type { Run } from './views'

/*
 * The React Native half's layer intents: the page's control that holds
 * focus before a layer opens, and the ways a reader dismisses an open
 * layer, each as a phone sends it.
 */

/** The page's control a `focus` with `page` puts focus on, which a record names `page`. */
export const PAGE = { isConnected: true, page: true }

/* Android's back, as the layers that listen for it ask to hear it: Jest
   draws the components as iOS draws them, where no back is sent, so the
   harness keeps each handler and calls the last, as Android does. */
const backs: ((event: never) => boolean | null | undefined)[] = []
jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, handler) => {
  backs.push(handler as never)
  return {
    remove: () => {
      backs.splice(backs.indexOf(handler as never), 1)
    },
  }
})

/** The host views drawn, the app's and the layer host's, whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) => {
  const root = screen.root
  return root === null ? [] : [root, ...root.queryAll(() => true)].filter((one) => test(one.props))
}

/**
 * Whether the element's form opens a layer, and whether it stands open, as
 * its machine last said. A stack of messages, whose layer opens on what it
 * holds, as a toast's, says nothing, as the web records nothing of it.
 */
export const layerIn = (run: Run): { readonly layer?: boolean } => {
  const { tag } = run.scenario.setup
  const form = formOf(tag)
  const layered =
    form.api?.notices === undefined && (form.machines ?? []).some((use) => use.machine === 'layer')
  return layered ? { layer: HOST_STATES.get(tag)?.open === true } : {}
}

/**
 * Dismisses the open layer as a phone sends a reader's dismissal: Escape
 * from a hardware keyboard, Android's back, VoiceOver's escape on the
 * layer's view, or a press on a modal layer's scrim, or on the app outside
 * any other.
 */
export const dismissIn = async (
  run: Run,
  by: Extract<Intent, { kind: 'dismiss' }>['by'],
): Promise<string | undefined> => {
  switch (by) {
    case 'escape':
      if (run.focus.focused() === null) {
        run.focus.place(PAGE)
      }
      await key(run, { key: 'Escape', kind: 'key' })
      return undefined
    case 'back':
      await act(async () => {
        backs.at(-1)?.({} as never)
      })
      return undefined
    case 'reader': {
      const [layer] = viewsWhere((props) => typeof props.onAccessibilityEscape === 'function')
      if (layer === undefined) {
        return 'No layer stands open to hear the screen reader’s escape.'
      }
      await act(async () => (layer.props.onAccessibilityEscape as () => void)())
      return undefined
    }
    case 'outside': {
      const [scrim] = viewsWhere(
        (props) => props.importantForAccessibility === 'no' && props.accessible === false,
      )
      if (scrim !== undefined) {
        await fireEvent.press(scrim)
        return undefined
      }
      /* Each view the touch passes on its way down hears it as it starts,
         the layer host's view among them, as a touch's capture runs. */
      const around = viewsWhere((props) => typeof props.onTouchStartCapture === 'function')
      if (around.length === 0) {
        return 'The app draws no view a touch outside a layer lands on.'
      }
      for (const one of around) {
        await fireEvent(one, 'touchStartCapture', { nativeEvent: { pageX: 1, pageY: 1 } })
      }
      return undefined
    }
  }
}
