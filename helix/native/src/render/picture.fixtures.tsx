import { useEffect, useRef } from 'react'
import { Image, type ImageProps } from 'react-native'

/*
 * A fake image source for the native specs: a picture that answers as its
 * source says, once it is drawn and again at each new source. One that
 * loads calls `onLoad` with a picture 400 by 238 pixels, one that fails
 * calls `onError`, and one that hangs calls nothing. A source that is not fake answers nothing, as Jest loads
 * no picture.
 *
 * **The sources are written as `@fusion.dev/helix-testing/conformance`
 * writes them**, so the conformance suite's `fakeImage` answers here too.
 * It is not imported: a file under `src` imports nothing the published
 * package does not ship.
 */

/** How a fake source answers. */
type Outcome = 'fails' | 'hangs' | 'loads'

/** What every fake source starts with, as the conformance suite writes it. */
const FAKE = 'helix-fake-image:'

/** A fake source that answers as `outcome` says, `name` telling two of one outcome apart. */
export const fakeImage = (outcome: Outcome, name = 'picture'): string => `${FAKE}${outcome}/${name}`

/** How a source answers, where it is a fake one. */
const outcomeOf = (uri: string): Outcome | undefined => {
  const outcome = uri.startsWith(FAKE) ? uri.slice(FAKE.length).split('/')[0] : undefined
  return outcome === 'fails' || outcome === 'hangs' || outcome === 'loads' ? outcome : undefined
}

/** The URI a picture's source names, where it names one. */
const uriOf = (source: ImageProps['source']): string =>
  typeof source === 'object' && source !== null && !Array.isArray(source)
    ? ((source as { readonly uri?: string }).uri ?? '')
    : ''

/** A picture drawn as `Image` is, that answers as its fake source says. */
export const FakePicture = (props: ImageProps) => {
  const uri = uriOf(props.source)
  const latest = useRef(props)
  latest.current = props
  useEffect(() => {
    const { onError, onLoad } = latest.current
    const outcome = outcomeOf(uri)
    if (outcome === 'loads') {
      onLoad?.({ nativeEvent: { source: { height: 238, uri, width: 400 } } } as Parameters<
        NonNullable<ImageProps['onLoad']>
      >[0])
    } else if (outcome === 'fails') {
      onError?.({ nativeEvent: { error: `${uri} fails` } } as Parameters<
        NonNullable<ImageProps['onError']>
      >[0])
    }
  }, [uri])
  return <Image {...props} />
}
