import type { OpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import * as icons from '@fusion.dev/helix-icons'
import * as regular from '@fusion.dev/helix-icons/regular'
import { glyphs } from '@fusion.dev/helix-native'
import { Alert, I18nManager, Linking } from 'react-native'

type Icon = { readonly content: string; readonly viewBox: string }

/* The glyphs the trees name, from Helix's own icons, by the name an icon has
   on the web. A caret along the line points the way the line reads, so right
   to left swaps them. */
const SIDED: Readonly<Record<string, Icon>> = {
  'caret-end': I18nManager.isRTL ? icons.caretLeft : icons.caretRight,
  'caret-start': I18nManager.isRTL ? icons.caretRight : icons.caretLeft,
}

/** An icon's export name, from its web name: `caret-end` is `caretEnd`. */
const exported = (name: string): string =>
  name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())

const named = (name: string): Icon | undefined =>
  SIDED[name] ?? (icons as unknown as Readonly<Record<string, Icon | undefined>>)[exported(name)]

/* The regular weight, which a part asks for where it draws a lighter glyph than
   the set's bold, as a checked menu row's tick. */
const light = (name: string): Icon | undefined =>
  (regular as unknown as Readonly<Record<string, Icon | undefined>>)[exported(name)]

/** Draws a Helix icon by its web name, in a color and at a size, with each
    path's own transform and paint, as the brand mark needs. */
export const Glyph = glyphs(named, light)

/* **Where a link goes in the gallery.** An address with a scheme opens with
   the phone's own handler. The examples link to places on a page, such as
   `#one`, which the gallery has no page for, so it says where the link leads. */
export const galleryLinks: OpenLink = {
  open: (href) => {
    if (/^[a-z][a-z\d+.-]*:/i.test(href)) {
      Linking.openURL(href).catch(() => undefined)
    } else {
      Alert.alert(`Opens ${href}`)
    }
  },
}
