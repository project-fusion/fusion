/**
 * The view an `image` node draws its picture with: React Native's own
 * `Image`, or a fake that a test sets, as the conformance suite's fake image
 * source answers as its source says.
 */

import type { ComponentType } from 'react'
import { Image, type ImageProps } from 'react-native'

let drawn: ComponentType<ImageProps> = Image

/** The view a picture is drawn with now. */
export const pictureView = (): ComponentType<ImageProps> => drawn

/** Draws every picture with `view` from now on, or with `Image` again where it is left out. */
export const setPictureView = (view?: ComponentType<ImageProps>): void => {
  drawn = view ?? Image
}
