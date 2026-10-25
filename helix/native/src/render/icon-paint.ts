/**
 * An icon's markup with each `var()` it paints with written as a color,
 * which `react-native-svg` can draw. **A brand mark paints with the theme**,
 * as the Fusion mark's gradient stops say
 * `var(--logo-color-from, var(--helix-color-primary))`: a Helix token is the
 * theme's value for it, any other property is its fallback, and one with
 * neither is the color the icon is drawn in, as it would be on the web where
 * `currentColor` stands in.
 */
export const paintedMarkup = (
  markup: string,
  tokens: Readonly<Record<string, unknown>>,
  color: string,
): string => {
  const VAR = /var\(\s*--([a-z0-9-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/i
  let out = markup
  /* Outside in: a `var()` whose fallback is another `var()` becomes that
     one, which the next pass reads. */
  for (let found = VAR.exec(out); found !== null; found = VAR.exec(out)) {
    const [whole, name = '', fallback] = found
    const token = name.startsWith('helix-') ? tokens[name.slice('helix-'.length)] : undefined
    const value = typeof token === 'string' && token !== '' ? token : fallback?.trim() || color
    out = out.replace(whole, value)
  }
  return out
}
