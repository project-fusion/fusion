import type { Props } from './behavior'

/**
 * `data-color-mode` as a condition every rule may read, as the web's rules
 * read the attribute: present where an element's props name a mode, as shared
 * code writes it on a toast's stack that keeps to the light mode.
 */
export const colorModeOf = (props: Props): { readonly 'data-color-mode'?: string } => {
  const mode = props['data-color-mode']
  return typeof mode === 'string' && mode !== '' ? { 'data-color-mode': mode } : {}
}
