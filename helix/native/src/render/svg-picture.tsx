/**
 * A picture whose source is SVG markup in a `data:` address, as an `<img>` draws
 * one on the web. **React Native's `Image` decodes no SVG**, so it stays blank:
 * this draws the markup through `react-native-svg`, in the box the image's rules
 * give it, and answers the load machine as the picture would.
 */
import { useEffect } from 'react'
import { View, type ViewProps } from 'react-native'
import { svg } from './vector'

const SVG_DATA = /^data:image\/svg\+xml(;[^,]*)?,/i

/** The markup a `data:` address holds, or `undefined` for any other address. */
export const svgFromUri = (uri: string): string | undefined => {
  const lead = SVG_DATA.exec(uri)
  if (lead === null) {
    return undefined
  }
  const body = uri.slice(lead[0].length)
  try {
    const decoded = lead[1]?.toLowerCase().includes('base64')
      ? (globalThis as unknown as { atob: (text: string) => string }).atob(body)
      : decodeURIComponent(body)
    return decoded
  } catch {
    return ''
  }
}

/** How a picture's `object-fit` fits its markup, as `preserveAspectRatio` says. */
const FIT: Readonly<Record<string, string>> = {
  contain: 'xMidYMid meet',
  cover: 'xMidYMid slice',
  fill: 'none',
  none: 'xMidYMid meet',
  'scale-down': 'xMidYMid meet',
}

type Picture = ViewProps & {
  readonly markup: string
  readonly onError?: (event: unknown) => void
  readonly onLoad?: (event: unknown) => void
}

/** The markup in the image's box. Markup with no drawing in it fails, as a broken `<img>` does. */
export const SvgPicture = ({ markup, onError, onLoad, style, ...view }: Picture) => {
  const fit = (Array.isArray(style) ? Object.assign({}, ...style.flat(9)) : style)?.objectFit
  useEffect(() => {
    if (markup.includes('<svg')) {
      onLoad?.({ nativeEvent: { source: {} } })
    } else {
      onError?.({ nativeEvent: { error: 'The address holds no SVG.' } })
    }
  }, [markup, onError, onLoad])
  const { SvgXml } = svg()
  return (
    <View {...view} style={style}>
      {markup.includes('<svg') ? (
        <SvgXml
          height="100%"
          preserveAspectRatio={FIT[String(fit)] ?? 'none'}
          width="100%"
          xml={markup}
        />
      ) : null}
    </View>
  )
}
