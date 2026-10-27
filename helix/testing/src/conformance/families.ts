/* The families the conformance suite holds, by their names in `helix/neutral`. */

/**
 * The families the suite holds, by their names in `helix/neutral`, and
 * `toggle-group` for Toggle's group, whose root is a set where Toggle's is a
 * toggle button on its own.
 */
export type Family =
  | 'accordion'
  | 'announcement'
  | 'app-header'
  | 'button'
  | 'button-group'
  | 'callout'
  | 'checkbox'
  | 'checkbox-group'
  | 'copy-button'
  | 'dialog'
  | 'drawer'
  | 'drilldown'
  | 'format-date'
  | 'image'
  | 'input'
  | 'list'
  | 'loader'
  | 'megamenu'
  | 'menu'
  | 'motion-toggle'
  | 'navigation'
  | 'outline'
  | 'popover'
  | 'qr-code'
  | 'scroll-area'
  | 'speed-dial'
  | 'switch'
  | 'tabs'
  | 'tag-group'
  | 'timeline'
  | 'toast'
  | 'toggle'
  | 'toggle-group'
  | 'toolbar'
  | 'tooltip'
  | 'tour'

/** The families the web half alone records until a phone draws them. None is staged now. */
export type Staged = never
