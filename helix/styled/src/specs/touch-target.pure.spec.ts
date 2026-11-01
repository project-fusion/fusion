import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A press reaches `--helix-size-target`: 24 under a mouse and 44 on a touch
 * screen, in a transparent box that moves nothing drawn.
 *
 * Measured with touch emulation at 390 wide on October 31, 2026, before this:
 * 35 of 232 focusable elements under 24 and 40 at 44 or more.
 *
 * Read from the sheets, because the pointer is a media query a spec in a page
 * cannot switch.
 */
const SRC = join(import.meta.dir, '..')

const TARGETS: [sheet: string, selector: string][] = [
  ['button/root/button-root.css', '[part="button"]::after'],
  ['icon-button/root/icon-button-root.css', '[part="button"]::after'],
  ['tabs/tab/tab.css', '[part="tab"]::after'],
  ['tabs/tab/tab.css', '[part="dismiss"]::after'],
  ['tag/root/tag-root.css', '[part="dismiss"]::after'],
  ['date-input/root/date-input-root.css', '[part="trigger"]'],
  ['time-input/root/time-input-root.css', '[part="trigger"]::after'],
  ['color-input/root/color-input-root.css', '[part="trigger"]::after'],
  ['input/root/input-root.css', '[part="clear"]::after'],
  ['input/root/input-root.css', '[part~="reveal"]::after'],
  ['textarea/root/textarea-root.css', '[part="clear"]::after'],
  ['number-input/root/number-input-root.css', '[part="increment"]::after'],
  ['number-input/root/number-input-root.css', '[part="decrement"]::after'],
  ['select/root/select-root.css', '[part="trigger"]::after'],
  ['pagination/root/pagination-root.css', '[part~="page"]::after'],
  ['pagination/root/pagination-root.css', '[part="previous"]::after'],
  ['pagination/root/pagination-root.css', '[part="next"]::after'],
  ['pagination/root/pagination-root.css', '[part="first"]::after'],
  ['pagination/root/pagination-root.css', '[part="last"]::after'],
  ['dialog/root/dialog-root.css', '[part="dismiss"]::after'],
  ['drawer/root/drawer-root.css', '[part="dismiss"]::after'],
  ['toast/item/toast-item.css', '[part="dismiss"]::after'],
  ['callout/root/callout-root.css', '[part="dismiss"]::after'],
  ['announcement/root/announcement-root.css', '[part="dismiss"]::after'],
  ['toggle/root/toggle-root.css', '[part="item"]::after'],
  ['app-header/root/app-header-root.css', '[part="toggle"]::after'],
  ['carousel/root/carousel-root.css', '[part~="indicator"]::after'],
  ['filter-input/chip/filter-chip.css', '[part="dismiss"]::after'],
  ['rating/root/rating-root.css', '[part="option"]::after'],
  ['date-picker/root/date-picker-root.css', '[part="previous"]::after'],
  ['date-picker/root/date-picker-root.css', '[part="next"]::after'],
  ['notifications/root/notifications-root.css', '[part="mark-all"]::after'],
  ['megamenu/root/megamenu-root.css', '[part="trigger"]::after'],
  ['table/column/table-column.css', '[part="sort"]::after'],
  ['notifications/notification/notification.css', '[part="dismiss"]::after'],
  ['chat/composer/chat-composer.css', '[part="send"]::after'],
  ['chat/message/chat-message.css', '[part="retry"]::after'],
  ['video/root/video-root.css', '[part="controls"] :where(a, button)::after'],
  ['filter-input/chip/filter-chip.css', '[part="dismiss"]::after'],
]

/* Rows sit against each other, so the row itself is the target on a touch screen. */
const ROWS = [
  'accordion/item/accordion-item.css',
  'checkbox/root/checkbox-root.css',
  'drilldown/item/drilldown-item.css',
  'log/group/log-group.css',
  'object-inspector/root/object-inspector-root.css',
  'outline/root/outline-root.css',
  'radio/root/radio-root.css',
  'shared/row/row.css',
  'switch/root/switch-root.css',
  'tree/item/tree-item.css',
]

describe('a control reaches the target', () => {
  for (const [sheet, selector] of TARGETS) {
    test(`${sheet} ${selector}`, () => {
      const css = readFileSync(join(SRC, sheet), 'utf8')
      const start = css.indexOf(`${selector} {`)
      expect(start).toBeGreaterThan(-1)
      expect(css.slice(start, css.indexOf('}', start))).toContain('var(--helix-size-target)')
    })
  }

  for (const sheet of ROWS) {
    test(`${sheet} grows to the target under a coarse pointer`, () => {
      const css = readFileSync(join(SRC, sheet), 'utf8')
      expect(css).toMatch(
        /@media \(pointer: coarse\)[^@]*min-block-size: var\(--helix-size-target\)/,
      )
    })
  }
})
