/*
 * Android's blur target: the layer host draws the app inside expo-blur's
 * `BlurTargetView`, and a blur drawn over the app names it, so Android
 * blurs a layer's backdrop as iOS and the web do.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { createRef } from 'react'
import { Platform, Text } from 'react-native'
import { behaviorFor } from '../machines/compose'
import { LayerHostView } from '../root/layers'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { BlurTarget, OverTarget } from './blur-target'
import { element } from './element'

/** A family whose one part, `panel`, blurs 16 points behind what is passed in. */
const form: Family = {
  api: { events: [], props: [], states: [] },
  machines: [],
  name: 'sample',
  rules: [
    {
      kind: 'rule',
      order: 0,
      set: [['backdrop-filter', { function: { arguments: [{ text: '16px' }], name: 'blur' } }]],
      specificity: [0, 1, 0],
      target: 'panel',
      values: [],
      webOnly: false,
      when: [],
    },
  ],
  tag: 'helix-sample',
  tree: [
    { attributes: {}, children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'panel' },
  ],
  version: '2.0',
}

const Sample = element(form, behaviorFor(form))

/** The blur views drawn. */
const blursIn = (drawn: Awaited<ReturnType<typeof render>>) =>
  drawn.container.queryAll((node) => node.props.intensity !== undefined)

describe('Android’s blur target', () => {
  test('a blur over the app blurs the app’s target, by the method that keeps older phones fast', async () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    const target = createRef<unknown>()
    const drawn = await render(
      <ThemeProvider tokens={{}}>
        <OverTarget target={target}>
          <Sample>
            <Text>Over</Text>
          </Sample>
        </OverTarget>
      </ThemeProvider>,
    )
    const [blur] = blursIn(drawn)
    /* expo-blur hands its native view the target's view by its handle. */
    expect(Object.keys(blur?.props ?? {})).toContain('blurTargetId')
    expect(blur?.props.blurMethod).toBe('dimezisBlurViewSdk31Plus')
  })

  test('a blur inside the target draws its own background alone', async () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    const target = createRef<unknown>()
    const drawn = await render(
      <ThemeProvider tokens={{}}>
        <BlurTarget target={target}>
          <Sample>
            <Text>Inside</Text>
          </Sample>
        </BlurTarget>
      </ThemeProvider>,
    )
    expect(blursIn(drawn)).toEqual([])
    expect(target.current).not.toBeNull()
    expect(screen.getByText('Inside')).toBeTruthy()
  })

  test('the layer host draws the app inside the target on Android, and draws no target on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    const android = await render(
      <ThemeProvider tokens={{}}>
        <LayerHostView>
          <Sample>
            <Text>App</Text>
          </Sample>
        </LayerHostView>
      </ThemeProvider>,
    )
    expect(blursIn(android)).toEqual([])
    await android.unmount()
    jest.replaceProperty(Platform, 'OS', 'ios')
    const ios = await render(
      <ThemeProvider tokens={{}}>
        <LayerHostView>
          <Sample>
            <Text>App</Text>
          </Sample>
        </LayerHostView>
      </ThemeProvider>,
    )
    expect(
      blursIn(ios).map((node) => node.props.blurMethod === 'dimezisBlurViewSdk31Plus'),
    ).toEqual([false])
  })
})
