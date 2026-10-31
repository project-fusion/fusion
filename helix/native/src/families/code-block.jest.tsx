import { registerTokens } from '@fusion.dev/helix-core/code-block'
import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, StyleSheet } from 'react-native'
import { HelixRoot } from '../index'
import { lineBoxes } from '../machines/code-block-model'
import { HelixCodeBlock } from './code-block/index.native'

type Drawn = (given: Record<string, unknown>) => React.ReactNode
const Block = HelixCodeBlock as unknown as Drawn

const draw = async (props: Record<string, unknown>, code: React.ReactNode) =>
  render(
    <HelixRoot>
      <Block {...props}>{code}</Block>
    </HelixRoot>,
  )

/** What a phone's text layout says of the code's lines, one row each. */
const layOut = (texts: readonly string[], width = 100) =>
  texts.map((text, at) => ({ height: 20, text, width, y: at * 20 }))

/** The paragraph of code, which hears its layout. */
const paragraph = () =>
  screen.root?.queryAll((node) => typeof node.props.onTextLayout === 'function')[0]

describe('code block', () => {
  test('a highlight is read into runs, from its tags and inline styles', async () => {
    await draw(
      { highlight: () => '<b>const</b> a &lt; <span style="color:#ff0000">one</span>' },
      'const a < one',
    )
    expect(screen.getByText('const')).toBeTruthy()
    expect(screen.getByText(' a < ')).toBeTruthy()
    expect(JSON.stringify(screen.toJSON())).toContain('"fontWeight":"bold"')
    expect(JSON.stringify(screen.toJSON())).toContain('"color":"#ff0000"')
  })

  test('a highlight that throws costs the reader nothing', async () => {
    const heard = jest.fn()
    ;(globalThis as { reportError?: unknown }).reportError = heard
    await draw(
      {
        highlight: () => {
          throw new Error('no')
        },
      },
      'plain',
    )
    expect(screen.getByText('plain')).toBeTruthy()
    expect(heard).toHaveBeenCalled()
    ;(globalThis as { reportError?: unknown }).reportError = undefined
  })

  test('tokens draw runs', async () => {
    await draw({ tokens: () => [{ color: '#111111', text: 'x' }] }, 'x')
    expect(JSON.stringify(screen.toJSON())).toContain('"color":"#111111"')
  })

  test('tokens a page registers reach a block drawn already, and a syntax name reads the theme', async () => {
    await draw({}, 'word')
    await act(async () => {
      registerTokens(() => [{ syntax: 'keyword', text: 'word' }])
    })
    const drawn = JSON.stringify(screen.toJSON())
    await act(async () => {
      registerTokens(undefined)
    })
    expect(drawn).toContain('word')
    expect(drawn).not.toContain('color-syntax')
  })

  test('a mark stands where its lines were laid out, and waits for them', async () => {
    await draw({ markLines: '2' }, 'one\ntwo\nthree')
    await fireEvent(paragraph() as never, 'textLayout', {
      nativeEvent: { lines: layOut(['one\n', 'two\n', 'three']) },
    })
    const placed = JSON.stringify(screen.toJSON())
    expect(placed).toContain('"top":20')
    expect(placed).toContain('"height":20')
  })

  test('a line that wraps counts its rows, for a band and a number', () => {
    expect(
      lineBoxes('long line\nnext', [
        { height: 20, text: 'long ', width: 40, y: 0 },
        { height: 20, text: 'line\n', width: 40, y: 20 },
        { height: 20, text: 'next', width: 40, y: 40 },
      ]),
    ).toEqual([
      { bottom: 40, top: 0 },
      { bottom: 60, top: 40 },
    ])
  })

  test('an empty line is one row', () => {
    expect(lineBoxes('a\n\nb', layOut(['a\n', '\n', 'b']))).toEqual([
      { bottom: 20, top: 0 },
      { bottom: 40, top: 20 },
      { bottom: 60, top: 40 },
    ])
  })

  test('the expand button stands only while the cap hides lines, and shows them', async () => {
    await draw({ expandable: true, label: 'a.css' }, 'one\ntwo')
    const hidden = () =>
      (
        StyleSheet.flatten(
          screen.root
            ?.queryAll((node) => node.props.accessibilityState?.expanded !== undefined)
            .at(-1)?.props.style,
        ) as { display?: string }
      ).display
    expect(hidden()).toBe('none')
    await fireEvent(paragraph() as never, 'textLayout', {
      nativeEvent: { lines: layOut(['one\n', 'two']) },
    })
    const box = screen.root?.queryAll((node) => typeof node.props.onLayout === 'function')
    for (const node of box ?? []) {
      await fireEvent(node as never, 'layout', {
        nativeEvent: { layout: { height: 20, width: 200, x: 0, y: 0 } },
      })
    }
    expect(hidden()).not.toBe('none')
    expect(screen.getByText('Show all lines')).toBeTruthy()
  })

  test('a diff folds its unchanged lines, and a press shows them', async () => {
    const patch = `--- a/a.ts
+++ b/a.ts
@@ -1,5 +1,5 @@
 one
 two
 three
-four
+FOUR
`
    await draw({ contextLines: 0, diff: true }, patch)
    expect(screen.getByText('a.ts')).toBeTruthy()
    expect(screen.getByText('Show 3 unchanged lines')).toBeTruthy()
    await fireEvent.press(screen.getByText('Show 3 unchanged lines'))
    expect(screen.getByText('Hide 3 unchanged lines')).toBeTruthy()
    expect(screen.getByText('two')).toBeTruthy()
  })

  test('the words of a changed line stand apart from the rest', async () => {
    const patch = `--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
-old value
+new value
`
    await draw({ diff: true }, patch)
    expect(screen.getByText('old')).toBeTruthy()
    expect(screen.getByText('new')).toBeTruthy()
  })

  test('a held block is a file, and only the one shown draws', async () => {
    await draw({}, [
      <Block key="a" label="a.ts">
        first
      </Block>,
      <Block key="b" label="b.ts">
        second
      </Block>,
    ])
    expect(screen.getByText('first')).toBeTruthy()
    expect(screen.queryByText('second')).toBeNull()
    await fireEvent.press(screen.getByText('b.ts'))
    expect(screen.queryByText('first')).toBeNull()
    expect(screen.getByText('second')).toBeTruthy()
  })
})

describe('a split on a phone', () => {
  const PATCH = '--- a/a.ts\n+++ b/a.ts\n@@ -1,1 +1,1 @@\n-old line\n+new line\n'

  /** What a split draws before anything is laid out, in a window `width` wide. */
  const firstFrame = async (width: number) => {
    const window = jest.spyOn(Dimensions, 'get').mockReturnValue({
      fontScale: 1,
      height: 800,
      scale: 3,
      width,
    })
    await draw({ diff: true, variant: 'split' }, PATCH)
    window.mockRestore()
    return JSON.stringify(screen.toJSON())
  }

  test('a window too narrow for two columns stacks them from the first frame', async () => {
    expect(await firstFrame(390)).not.toBe(await firstFrame(1000))
  })
})
