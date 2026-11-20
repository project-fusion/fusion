/**
 * The style the element around gives a part of the element its box draws, laid
 * over the part's own, as `[part="dialog"]::part(surface)` is on the web.
 *
 * **It is resolved where the part stands**, under the window and the lengths of
 * the layer it is, so a palette's dialog stands a fifth of the window down.
 * **A shorthand it gives replaces the part's own longhands**, as a rule in the
 * outer scope does on the web, where React Native lets a side's own padding win
 * over `padding` whatever their order: the palette's `padding: 0` left the
 * dialog's sheet padding under its list.
 */
import { CORNERS } from '../style/apply'
import type { Resolved, Style } from '../style/resolved'
import type { Styling } from './styles'

/** The sides a padding or a margin longhand names. */
const SIDES = ['Bottom', 'End', 'Horizontal', 'Left', 'Right', 'Start', 'Top', 'Vertical'] as const

/** The longhands each shorthand resets. */
const RESETS: Readonly<Record<string, readonly string[]>> = {
  borderRadius: [
    ...CORNERS,
    'borderBottomLeftRadius',
    'borderBottomRightRadius',
    'borderTopLeftRadius',
    'borderTopRightRadius',
  ],
  margin: SIDES.map((side) => `margin${side}`),
  padding: SIDES.map((side) => `padding${side}`),
}

/** `own` with `given` laid over it, each shorthand in `given` clearing its longhands. */
const laidOver = (own: Style, given: Style): Style => {
  const out: Record<string, unknown> = { ...own }
  for (const name of Object.keys(given)) {
    for (const longhand of RESETS[name] ?? []) {
      delete out[longhand]
    }
  }
  return { ...out, ...given } as Style
}

/** A part's resolved style with what the element around gives it laid over it. */
export const withGiven = (
  styling: Styling,
  name: string,
  resolved: Resolved,
  box?: Readonly<Record<string, boolean | string>>,
): Resolved => {
  const given = styling.parts?.[name]?.({
    ...(box === undefined ? {} : { box }),
    measured: styling.base.measured,
    viewport: styling.base.viewport,
  })
  return given === undefined ? resolved : { ...resolved, style: laidOver(resolved.style, given) }
}
