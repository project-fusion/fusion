import type { Family, Scenario, Staged } from './format.js'
import { ACCORDION } from './scenarios/accordion.js'
import { ANNOUNCEMENT } from './scenarios/announcement.js'
import { APP_HEADER } from './scenarios/app-header.js'
import { BUTTON } from './scenarios/button.js'
import { BUTTON_GROUP } from './scenarios/button-group.js'
import { CALLOUT } from './scenarios/callout.js'
import { CHAT } from './scenarios/chat.js'
import { CHECKBOX_GROUP } from './scenarios/checkbox-group.js'
import { CODE_BLOCK } from './scenarios/code-block.js'
import { COLOR_INPUT } from './scenarios/color-input.js'
import { COLOR_PICKER } from './scenarios/color-picker.js'
import { COPY_BUTTON } from './scenarios/copy-button.js'
import { DIALOG } from './scenarios/dialog.js'
import { DRAWER } from './scenarios/drawer.js'
import { DRILLDOWN } from './scenarios/drilldown.js'
import { FILE_INPUT } from './scenarios/file-input.js'
import { FORMAT_DATE } from './scenarios/format-date.js'
import { IMAGE } from './scenarios/image.js'
import { INPUT } from './scenarios/input.js'
import { LIST } from './scenarios/list.js'
import { LOADER } from './scenarios/loader.js'
import { LOG } from './scenarios/log.js'
import { MEGAMENU } from './scenarios/megamenu.js'
import { MENU } from './scenarios/menu.js'
import { NAVIGATION } from './scenarios/navigation.js'
import { NOTIFICATIONS } from './scenarios/notifications.js'
import { NUMBER_INPUT } from './scenarios/number-input.js'
import { OBJECT_INSPECTOR } from './scenarios/object-inspector.js'
import { OUTLINE } from './scenarios/outline.js'
import { PIN_INPUT } from './scenarios/pin-input.js'
import { POPOVER } from './scenarios/popover.js'
import { QR_CODE } from './scenarios/qr-code.js'
import { RATING } from './scenarios/rating.js'
import { SCROLL_AREA } from './scenarios/scroll-area.js'
import { SLIDER } from './scenarios/slider.js'
import { SPEED_DIAL } from './scenarios/speed-dial.js'
import { SPLITTER } from './scenarios/splitter.js'
import { TABLE } from './scenarios/table.js'
import { TABS } from './scenarios/tabs.js'
import { TAG_GROUP } from './scenarios/tag-group.js'
import { TEXTAREA } from './scenarios/textarea.js'
import { TIMELINE } from './scenarios/timeline.js'
import { TOAST } from './scenarios/toast.js'
import { CHECKBOX, MOTION_TOGGLE, SWITCH, TOGGLE } from './scenarios/toggle.js'
import { TOGGLE_GROUP } from './scenarios/toggle-group.js'
import { TOOLBAR } from './scenarios/toolbar.js'
import { TOOLTIP } from './scenarios/tooltip.js'
import { TOUR } from './scenarios/tour.js'
import { TREE } from './scenarios/tree.js'
import { VIRTUAL_LIST } from './scenarios/virtual-list.js'

export * from './clock.js'
export * from './compare.js'
export * from './format.js'
export * from './images.js'
export * from './setup.js'

/** Every family's scenarios, by the family's name. */
export const SCENARIOS: Readonly<Record<Family, readonly Scenario[]>> = {
  accordion: ACCORDION,
  announcement: ANNOUNCEMENT,
  'app-header': APP_HEADER,
  button: BUTTON,
  'button-group': BUTTON_GROUP,
  callout: CALLOUT,
  chat: CHAT,
  checkbox: CHECKBOX,
  'checkbox-group': CHECKBOX_GROUP,
  'code-block': CODE_BLOCK,
  'color-input': COLOR_INPUT,
  'color-picker': COLOR_PICKER,
  'copy-button': COPY_BUTTON,
  dialog: DIALOG,
  drawer: DRAWER,
  drilldown: DRILLDOWN,
  'file-input': FILE_INPUT,
  'format-date': FORMAT_DATE,
  image: IMAGE,
  input: INPUT,
  list: LIST,
  loader: LOADER,
  log: LOG,
  megamenu: MEGAMENU,
  menu: MENU,
  'motion-toggle': MOTION_TOGGLE,
  navigation: NAVIGATION,
  notifications: NOTIFICATIONS,
  'number-input': NUMBER_INPUT,
  'object-inspector': OBJECT_INSPECTOR,
  outline: OUTLINE,
  'pin-input': PIN_INPUT,
  popover: POPOVER,
  'qr-code': QR_CODE,
  rating: RATING,
  'scroll-area': SCROLL_AREA,
  slider: SLIDER,
  'speed-dial': SPEED_DIAL,
  splitter: SPLITTER,
  switch: SWITCH,
  table: TABLE,
  tabs: TABS,
  'tag-group': TAG_GROUP,
  textarea: TEXTAREA,
  timeline: TIMELINE,
  toast: TOAST,
  toggle: TOGGLE,
  'toggle-group': TOGGLE_GROUP,
  toolbar: TOOLBAR,
  tooltip: TOOLTIP,
  tour: TOUR,
  tree: TREE,
  'virtual-list': VIRTUAL_LIST,
}

/**
 * The scenarios written before their family's native component exists, by
 * the family's name. The web half runs them and records them, and neither
 * React Native nor the comparison reads them until the family moves to
 * `SCENARIOS`. None is staged now.
 */
export const STAGED: Readonly<Record<Staged, readonly Scenario[]>> = {}
