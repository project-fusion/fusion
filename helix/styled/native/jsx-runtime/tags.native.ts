/* Each `helix-*` tag as the native component of that name, and the DOM
   elements shared code may hold as the words and boxes they draw. */
import * as React from 'react'
import { HelixAccordion, HelixAccordionItem } from '../accordion/index.native'
import { HelixAnnouncement } from '../announcement/index.native'
import { HelixAppHeader } from '../app-header/index.native'
import { HelixAvatar, HelixAvatarGroup } from '../avatar/index.native'
import { HelixBadge } from '../badge/index.native'
import { HelixBlockquote } from '../blockquote/index.native'
import { HelixBreadcrumb, HelixBreadcrumbs } from '../breadcrumbs/index.native'
import { HelixButton } from '../button/index.native'
import { HelixButtonGroup } from '../button-group/index.native'
import { HelixCallout } from '../callout/index.native'
import { HelixCard } from '../card/index.native'
import { HelixCheckbox } from '../checkbox/index.native'
import { HelixCheckboxGroup } from '../checkbox-group/index.native'
import { HelixCode } from '../code/index.native'
import { HelixColorInput } from '../color-input/index.native'
import { HelixColorPicker } from '../color-picker/index.native'
import { HelixCopyButton } from '../copy-button/index.native'
import { HelixDescriptionList, HelixDescriptionListItem } from '../description-list/index.native'
import { HelixDialog } from '../dialog/index.native'
import { HelixDivider } from '../divider/index.native'
import { HelixDrawer } from '../drawer/index.native'
import { HelixDrilldown, HelixDrilldownItem } from '../drilldown/index.native'
import { HelixEmpty } from '../empty/index.native'
import { HelixFileInput } from '../file-input/index.native'
import { HelixFlex } from '../flex/index.native'
import { HelixFormatDate } from '../format-date/index.native'
import { HelixGrid } from '../grid/index.native'
import { HelixIcon } from '../icon/index.native'
import { HelixIconButton } from '../icon-button/index.native'
import { HelixImage } from '../image/index.native'
import { HelixInput } from '../input/index.native'
import { HelixKbd } from '../kbd/index.native'
import { HelixList, HelixListItem } from '../list/index.native'
import { HelixLoader } from '../loader/index.native'
import { HelixMegamenu, HelixMegamenuGroup, HelixMegamenuItem } from '../megamenu/index.native'
import { HelixMenu, HelixMenuItem, HelixMenuSection } from '../menu/index.native'
import { HelixMeter, HelixMeterSegment } from '../meter/index.native'
import { HelixMotionToggle } from '../motion-toggle/index.native'
import { HelixNavigation, HelixNavigationItem } from '../navigation/index.native'
import { HelixNumberInput } from '../number-input/index.native'
import { HelixObjectInspector } from '../object-inspector/index.native'
import { HelixOutline, HelixOutlineSection } from '../outline/index.native'
import { HelixPinInput } from '../pin-input/index.native'
import { HelixPopover } from '../popover/index.native'
import { HelixProgress } from '../progress/index.native'
import { HelixQrCode } from '../qr-code/index.native'
import { HelixQuote } from '../quote/index.native'
import { HelixRadio, HelixRadioGroup } from '../radio/index.native'
import { HelixRating } from '../rating/index.native'
import { HelixScrollArea } from '../scroll-area/index.native'
import { HelixSkeleton } from '../skeleton/index.native'
import { HelixSkipLink } from '../skip-link/index.native'
import { HelixSlider } from '../slider/index.native'
import { HelixSpeedDial, HelixSpeedDialGroup, HelixSpeedDialItem } from '../speed-dial/index.native'
import { HelixSplitter } from '../splitter/index.native'
import { HelixStat, HelixStatGroup } from '../stat/index.native'
import { HelixStep, HelixSteps } from '../steps/index.native'
import { HelixSwitch } from '../switch/index.native'
import { HelixTable, HelixTableCell, HelixTableColumn, HelixTableRow } from '../table/index.native'
import { HelixTab, HelixTabPanel, HelixTabs } from '../tabs/index.native'
import { HelixTag, HelixTagGroup } from '../tag/index.native'
import { HelixText } from '../text/index.native'
import { HelixTextarea } from '../textarea/index.native'
import { HelixTimeline, HelixTimelineGroup, HelixTimelineItem } from '../timeline/index.native'
import { HelixToast, HelixToastItem } from '../toast/index.native'
import { HelixToggle, HelixToggleGroup } from '../toggle/index.native'
import { HelixToolbar } from '../toolbar/index.native'
import { HelixTooltip } from '../tooltip/index.native'
import { HelixTour, HelixTourStop } from '../tour/index.native'
import { HelixTree, HelixTreeItem } from '../tree/index.native'
import { HelixTrend } from '../trend/index.native'
import { HelixVirtualList } from '../virtual-list/index.native'
import { Anchor, Box, Fieldset, Legend, type Props, RawSvg, Span, SVG_SHAPES } from './words.native'

type Heard = { detail?: { value?: unknown }; target?: { value?: unknown } }

/* **A set's choice is held as the element holds it under React.** The
   attribute starts it, a press moves it, and the example setting a new value
   moves it again. Native, the prop is controlled, and a list written
   `value="report"` would never take a press. */
const held = (Target: unknown, chosen: string, after: string, read: (event: Heard) => unknown) => {
  const Held = (props: Props) => {
    const given = props[chosen]
    const [now, setNow] = React.useState(given)
    const last = React.useRef(given)
    if (given !== last.current) {
      last.current = given
      setNow(given)
    }
    const heard = props[after]
    return React.createElement(Target as React.ElementType, {
      ...props,
      [after]: (event: Heard) => {
        setNow(read(event))
        if (typeof heard === 'function') {
          heard(event)
        }
      },
      [chosen]: given === undefined ? undefined : now,
    })
  }
  return Held
}

/* A list's change carries the list's value under `target`, and a tab set's
   activate carries the tab under `detail`, as on the web. So do a button
   group's change and a tag group's. */
const ButtonGroup = held(HelixButtonGroup, 'value', 'onChange', (event) => event.target?.value)
const List = held(HelixList, 'value', 'onChange', (event) => event.target?.value)
const Tabs = held(HelixTabs, 'active', 'onActivate', (event) => event.detail?.value)
const Steps = held(HelixSteps, 'active', 'onActivate', (event) => event.detail?.value)
const TagGroup = held(HelixTagGroup, 'value', 'onChange', (event) => event.target?.value)

export const TAGS: Readonly<Record<string, unknown>> = {
  a: Anchor,
  div: Box,
  fieldset: Fieldset,
  form: Box,
  'helix-accordion': HelixAccordion,
  'helix-accordion-item': HelixAccordionItem,
  'helix-announcement': HelixAnnouncement,
  'helix-app-header': HelixAppHeader,
  'helix-avatar': HelixAvatar,
  'helix-avatar-group': HelixAvatarGroup,
  'helix-badge': HelixBadge,
  'helix-blockquote': HelixBlockquote,
  'helix-breadcrumb': HelixBreadcrumb,
  'helix-breadcrumbs': HelixBreadcrumbs,
  'helix-button': HelixButton,
  'helix-button-group': ButtonGroup,
  'helix-callout': HelixCallout,
  'helix-card': HelixCard,
  'helix-checkbox': HelixCheckbox,
  'helix-checkbox-group': HelixCheckboxGroup,
  'helix-code': HelixCode,
  'helix-color-input': HelixColorInput,
  'helix-color-picker': HelixColorPicker,
  'helix-copy-button': HelixCopyButton,
  'helix-description-list': HelixDescriptionList,
  'helix-description-list-item': HelixDescriptionListItem,
  'helix-dialog': HelixDialog,
  'helix-divider': HelixDivider,
  'helix-drawer': HelixDrawer,
  'helix-drilldown': HelixDrilldown,
  'helix-drilldown-item': HelixDrilldownItem,
  'helix-empty': HelixEmpty,
  'helix-file-input': HelixFileInput,
  'helix-flex': HelixFlex,
  'helix-format-date': HelixFormatDate,
  'helix-grid': HelixGrid,
  'helix-icon': HelixIcon,
  'helix-icon-button': HelixIconButton,
  'helix-image': HelixImage,
  'helix-input': HelixInput,
  'helix-kbd': HelixKbd,
  'helix-list': List,
  'helix-list-item': HelixListItem,
  'helix-loader': HelixLoader,
  'helix-megamenu': HelixMegamenu,
  'helix-megamenu-group': HelixMegamenuGroup,
  'helix-megamenu-item': HelixMegamenuItem,
  'helix-menu': HelixMenu,
  'helix-menu-item': HelixMenuItem,
  'helix-menu-section': HelixMenuSection,
  'helix-meter': HelixMeter,
  'helix-meter-segment': HelixMeterSegment,
  'helix-motion-toggle': HelixMotionToggle,
  'helix-navigation': HelixNavigation,
  'helix-navigation-item': HelixNavigationItem,
  'helix-number-input': HelixNumberInput,
  'helix-object-inspector': HelixObjectInspector,
  'helix-outline': HelixOutline,
  'helix-outline-section': HelixOutlineSection,
  'helix-pin-input': HelixPinInput,
  'helix-popover': HelixPopover,
  'helix-progress': HelixProgress,
  'helix-qr-code': HelixQrCode,
  'helix-quote': HelixQuote,
  'helix-radio': HelixRadio,
  'helix-radio-group': HelixRadioGroup,
  'helix-rating': HelixRating,
  'helix-scroll-area': HelixScrollArea,
  'helix-skeleton': HelixSkeleton,
  'helix-skip-link': HelixSkipLink,
  'helix-slider': HelixSlider,
  'helix-speed-dial': HelixSpeedDial,
  'helix-speed-dial-group': HelixSpeedDialGroup,
  'helix-speed-dial-item': HelixSpeedDialItem,
  'helix-splitter': HelixSplitter,
  'helix-stat': HelixStat,
  'helix-stat-group': HelixStatGroup,
  'helix-step': HelixStep,
  'helix-steps': Steps,
  'helix-switch': HelixSwitch,
  'helix-tab': HelixTab,
  'helix-tab-panel': HelixTabPanel,
  'helix-table': HelixTable,
  'helix-table-cell': HelixTableCell,
  'helix-table-column': HelixTableColumn,
  'helix-table-row': HelixTableRow,
  'helix-tabs': Tabs,
  'helix-tag': HelixTag,
  'helix-tag-group': TagGroup,
  'helix-text': HelixText,
  'helix-textarea': HelixTextarea,
  'helix-timeline': HelixTimeline,
  'helix-timeline-group': HelixTimelineGroup,
  'helix-timeline-item': HelixTimelineItem,
  'helix-toast': HelixToast,
  'helix-toast-item': HelixToastItem,
  'helix-toggle': HelixToggle,
  'helix-toggle-group': HelixToggleGroup,
  'helix-toolbar': HelixToolbar,
  'helix-tooltip': HelixTooltip,
  'helix-tour': HelixTour,
  'helix-tour-stop': HelixTourStop,
  'helix-tree': HelixTree,
  'helix-tree-item': HelixTreeItem,
  'helix-trend': HelixTrend,
  'helix-virtual-list': HelixVirtualList,
  legend: Legend,
  p: Span,
  span: Span,
  strong: Span,
  svg: RawSvg,
  ...SVG_SHAPES,
}

/** Whether a phone draws `tag` as a Helix component. */
export const hasComponent = (tag: string): boolean => tag.startsWith('helix-') && tag in TAGS
