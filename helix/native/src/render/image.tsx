/**
 * A picture an `image` node loads: React Native's own `Image`, which takes
 * the part's `object-fit` as its `objectFit`, as an `<img>` takes it on the
 * web.
 */

import type { ReactNode } from 'react'
import { View } from 'react-native'
import type { Node } from '../style/form'
import type { Style } from '../style/resolved'
import { wrapped } from './behavior'
import { pictureView } from './picture'
import { silent } from './semantics'
import { bound, fromText, laid, resolve, type Scope, split } from './styles'
import { SvgPicture, svgFromUri } from './svg-picture'

/**
 * Draws an image node: its picture from its `src`, read by a screen reader
 * as an image named by its `alt`. **An empty `alt` is decoration**, which a
 * screen reader passes over, as on the web. A picture with no source draws
 * its box and nothing in it. The load machine hears the picture through the
 * handlers it lays over the view.
 */
export const drawImage = (scope: Scope, node: Node, text: Style): ReactNode => {
  const resolved = resolve(scope, node, fromText(text))
  const [box] = split(resolved.style)
  const src = bound(scope, node.attributes?.src, node.name)
  const alt = bound(scope, node.attributes?.alt, node.name)
  const said =
    alt === ''
      ? silent
      : {
          accessibilityRole: 'image' as const,
          accessible: true,
          ...(typeof alt === 'string' ? { accessibilityLabel: alt } : {}),
        }
  const view = laid(scope.behavior, node.name, { ...said, style: box }, scope.item)
  const Image = pictureView()
  const markup = typeof src === 'string' ? svgFromUri(src) : undefined
  const picture =
    markup !== undefined ? (
      <SvgPicture key={node.name} {...view} markup={markup} />
    ) : typeof src === 'string' && src !== '' ? (
      <Image key={node.name} {...view} source={{ uri: src }} />
    ) : (
      <View key={node.name} {...view} />
    )
  return wrapped(scope.behavior, node.name, picture, node.name)
}
