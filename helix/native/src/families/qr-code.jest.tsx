/*
 * The generated QR Code, drawn from its real intermediate form: a picture
 * named by its label, or by the word for a code and a web address after it,
 * drawn as the body and the corner squares in a hundred-unit square with the
 * quiet zone around, in ink on paper. A value too long for a code draws the
 * fallback and sends `error`. `test:native` writes the component beside this
 * file.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { dark } from '../theme/dark.generated'
import { HelixTheme } from '../theme/helix-theme'
import { light } from '../theme/light.generated'
import { useTheme } from '../theme/theme'
import { type Drawn, nodes, styleOf } from './drawn'
import { HelixQrCode } from './qr-code/index.native'

const themed = (children: ReactNode, mode: 'dark' | 'light' = 'light') => (
  <HelixTheme mode={mode}>{children}</HelixTheme>
)

const all = (): Drawn[] => nodes(screen.toJSON())
const paths = (): Drawn[] => all().filter((node) => node.type === 'RNSVGPath')
const host = (): Drawn | undefined => all()[0]

const Scheme = () => <Text>{useTheme().mode}</Text>

describe('the generated QR Code', () => {
  test('is a picture named by the word for a code and the address it opens', async () => {
    await render(themed(<HelixQrCode value="https://fusion.dev/helix" />))
    const named = all().find((node) => node.props.accessibilityRole === 'image')
    expect(named?.props.accessibilityLabel).toBe('QR code, https://fusion.dev/helix')
  })

  test('never reads a value that is no web address', async () => {
    await render(themed(<HelixQrCode value="WIFI:S:Home;P:secret;;" />))
    const named = all().find((node) => node.props.accessibilityRole === 'image')
    expect(named?.props.accessibilityLabel).toBe('QR code')
  })

  test('draws the body and the corner squares in ink on paper, in both schemes', async () => {
    await render(themed(<HelixQrCode label="Open the menu" value="hello" />, 'dark'))
    expect(paths()).toHaveLength(2)
    expect(String(paths()[0]?.props.d).startsWith('M')).toBe(true)
    expect(styleOf(host() ?? { props: {} }).backgroundColor).toBe(dark['color-foreground-media'])
    expect(styleOf(host() ?? { props: {} }).width).toBe(192)
  })

  test('raises the level for a logo, as the web does, and draws the logo on the paper', async () => {
    const view = await render(themed(<HelixQrCode value="hello" />))
    const plain = paths()[0]?.props.d
    await view.rerender(themed(<HelixQrCode logo={<Text>F</Text>} value="hello" />))
    expect(paths()[0]?.props.d).not.toBe(plain)
    expect(screen.getByText('F')).toBeTruthy()
    const logo = all().find(
      (node) =>
        styleOf(node).position === 'absolute' &&
        styleOf(node).backgroundColor === light['color-foreground-media'],
    )
    expect(logo).toBeDefined()
  })

  test('hides the plate where no logo is passed, and shrinks in a row as the web does', async () => {
    await render(themed(<HelixQrCode value="hello" />))
    const plate = all().find(
      (node) =>
        styleOf(node).position === 'absolute' &&
        styleOf(node).backgroundColor === light['color-foreground-media'],
    )
    expect(styleOf(plate ?? { props: {} }).display).toBe('none')
    expect(styleOf(host() ?? { props: {} })).toMatchObject({ flexShrink: 1, minWidth: 0 })
  })

  test('a value too long draws the fallback and no code', async () => {
    const onError = jest.fn()
    const view = await render(
      themed(
        <HelixQrCode correction="H" fallback={<Text>Too long</Text>} onError={onError} value="" />,
      ),
    )
    await view.rerender(
      themed(
        <HelixQrCode
          correction="H"
          fallback={<Text>Too long</Text>}
          onError={onError}
          value={'x'.repeat(4000)}
        />,
      ),
    )
    expect(paths()).toHaveLength(0)
    expect(screen.getByText('Too long')).toBeTruthy()
    expect(onError).toHaveBeenCalledTimes(1)
  })
  test('a value too long from the start sends `error` once as it is drawn, as the web does', async () => {
    const onError = jest.fn()
    const view = await render(themed(<HelixQrCode onError={onError} value={'x'.repeat(4000)} />))
    expect(onError).toHaveBeenCalledTimes(1)
    await view.rerender(themed(<HelixQrCode onError={onError} value={'x'.repeat(4000)} />))
    expect(onError).toHaveBeenCalledTimes(1)
  })

  test('a value too long replaced by another, or a new level, sends `error` again, as the web does', async () => {
    const onError = jest.fn()
    const view = await render(themed(<HelixQrCode onError={onError} value={'x'.repeat(4000)} />))
    await view.rerender(themed(<HelixQrCode onError={onError} value={'y'.repeat(4000)} />))
    expect(onError).toHaveBeenCalledTimes(2)
    await view.rerender(
      themed(<HelixQrCode correction="L" onError={onError} value={'y'.repeat(4000)} />),
    )
    expect(onError).toHaveBeenCalledTimes(3)
    await view.rerender(themed(<HelixQrCode correction="L" onError={onError} value="short" />))
    expect(onError).toHaveBeenCalledTimes(3)
  })

  test('keeps its square as it shrinks, its height following its width', async () => {
    await render(themed(<HelixQrCode value="hello" />))
    const style = styleOf(host() ?? { props: {} })
    expect(style.aspectRatio).toBe(1)
    expect(style.height).toBeUndefined()
  })

  test('draws the mark on its paper in the light scheme, in a dark page', async () => {
    await render(themed(<HelixQrCode logo={<Scheme />} value="hello" />, 'dark'))
    expect(screen.getByText('light')).toBeTruthy()
  })
})
