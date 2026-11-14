/* Each `helix-*` tag as the native component of that name, and the DOM
   elements shared code may hold as the words and boxes they draw. */
import * as React from 'react'
import { HelixAccordion, HelixAccordionItem } from '../accordion/index.native'
import { HelixAnnouncement } from '../announcement/index.native'
import { HelixAppHeader } from '../app-header/index.native'
import { HelixAreaChart } from '../area-chart/index.native'
import { HelixAura } from '../aura/index.native'
import { HelixAvatar, HelixAvatarGroup } from '../avatar/index.native'
import { HelixBadge } from '../badge/index.native'
import { HelixBarChart } from '../bar-chart/index.native'
import { HelixBlockquote } from '../blockquote/index.native'
import { HelixBreadcrumb, HelixBreadcrumbs } from '../breadcrumbs/index.native'
import { HelixButton } from '../button/index.native'
import { HelixCallout } from '../callout/index.native'
import { HelixCard } from '../card/index.native'
import { HelixCarousel } from '../carousel/index.native'
import { HelixChat, HelixChatComposer, HelixChatMessage } from '../chat/index.native'
import { HelixCheckbox } from '../checkbox/index.native'
import { HelixCheckboxGroup } from '../checkbox-group/index.native'
import { HelixCode } from '../code/index.native'
import { HelixCodeBlock } from '../code-block/index.native'
import { HelixColorInput } from '../color-input/index.native'
import { HelixColorPicker } from '../color-picker/index.native'
import { HelixCombobox } from '../combobox/index.native'
import { HelixCommand } from '../command/index.native'
import { HelixCopyButton } from '../copy-button/index.native'
import { HelixDataTable } from '../data-table/index.native'
import { HelixDateInput } from '../date-input/index.native'
import { HelixDatePicker } from '../date-picker/index.native'
import { HelixDescriptionList, HelixDescriptionListItem } from '../description-list/index.native'
import { HelixDialog } from '../dialog/index.native'
import { HelixDivider } from '../divider/index.native'
import { HelixDonutChart } from '../donut-chart/index.native'
import { HelixDrawer } from '../drawer/index.native'
import { HelixDrilldown, HelixDrilldownItem } from '../drilldown/index.native'
import { HelixEmpty } from '../empty/index.native'
import { HelixFileInput } from '../file-input/index.native'
import {
  HelixFilterChip,
  HelixFilterField,
  HelixFilterInput,
  HelixFilterMenu,
  HelixFilterOperator,
} from '../filter-input/index.native'
import { HelixFlex } from '../flex/index.native'
import { HelixFormatDate } from '../format-date/index.native'
import { HelixGraph } from '../graph/index.native'
import { HelixGrid } from '../grid/index.native'
import { HelixHeatmap } from '../heatmap/index.native'
import { HelixIcon } from '../icon/index.native'
import { HelixIconButton } from '../icon-button/index.native'
import { HelixImage } from '../image/index.native'
import { HelixInput } from '../input/index.native'
import { HelixKbd } from '../kbd/index.native'
import { HelixLegend } from '../legend/index.native'
import { HelixLightbox, HelixLightboxItem } from '../lightbox/index.native'
import { HelixLineChart } from '../line-chart/index.native'
import { HelixListItem } from '../list/index.native'
import { HelixListbox } from '../listbox/index.native'
import { HelixLoader } from '../loader/index.native'
import { HelixLog, HelixLogGroup, HelixLogLine } from '../log/index.native'
import { HelixMegamenu, HelixMegamenuGroup, HelixMegamenuItem } from '../megamenu/index.native'
import { HelixMenu, HelixMenuItem, HelixMenuSection } from '../menu/index.native'
import { HelixMeter, HelixMeterSegment } from '../meter/index.native'
import { HelixMotionToggle } from '../motion-toggle/index.native'
import { HelixNavigation, HelixNavigationItem } from '../navigation/index.native'
import {
  HelixNotification,
  HelixNotificationGroup,
  HelixNotifications,
} from '../notifications/index.native'
import { HelixNumberInput } from '../number-input/index.native'
import { HelixObjectInspector } from '../object-inspector/index.native'
import { HelixOption, HelixOptionGroup, HelixOptionSeparator } from '../option/index.native'
import { HelixOrb } from '../orb/index.native'
import { HelixOutline, HelixOutlineSection } from '../outline/index.native'
import {
  HelixPagination,
  HelixPaginationSize,
  HelixPaginationSummary,
} from '../pagination/index.native'
import { HelixPinInput } from '../pin-input/index.native'
import { HelixPopover } from '../popover/index.native'
import { HelixProgress } from '../progress/index.native'
import { HelixQrCode } from '../qr-code/index.native'
import { HelixQuote } from '../quote/index.native'
import { HelixRadio, HelixRadioGroup } from '../radio/index.native'
import { HelixRating } from '../rating/index.native'
import { HelixScatterChart } from '../scatter-chart/index.native'
import { HelixScrollArea } from '../scroll-area/index.native'
import { HelixSelect } from '../select/index.native'
import { HelixSkeleton } from '../skeleton/index.native'
import { HelixSkipLink } from '../skip-link/index.native'
import { HelixSlider } from '../slider/index.native'
import { HelixSparkline } from '../sparkline/index.native'
import { HelixSpatialBarChart } from '../spatial-bar-chart/index.native'
import { HelixSpatialHeatmap } from '../spatial-heatmap/index.native'
import { HelixSpatialRibbonChart } from '../spatial-ribbon-chart/index.native'
import { HelixSpatialScatterChart } from '../spatial-scatter-chart/index.native'
import { HelixSpatialSurfaceChart } from '../spatial-surface-chart/index.native'
import { HelixSpatialTreemap } from '../spatial-treemap/index.native'
import { HelixSpeedDial, HelixSpeedDialGroup, HelixSpeedDialItem } from '../speed-dial/index.native'
import { HelixSplitter } from '../splitter/index.native'
import { HelixStat, HelixStatGroup } from '../stat/index.native'
import { HelixStep } from '../steps/index.native'
import { HelixStrands } from '../strands/index.native'
import { HelixSwitch } from '../switch/index.native'
import { HelixTable, HelixTableCell, HelixTableColumn, HelixTableRow } from '../table/index.native'
import { HelixTab, HelixTabPanel } from '../tabs/index.native'
import { HelixTag } from '../tag/index.native'
import { HelixText } from '../text/index.native'
import { HelixTextarea } from '../textarea/index.native'
import { HelixTimeInput } from '../time-input/index.native'
import { HelixTimePicker } from '../time-picker/index.native'
import { HelixTimeline, HelixTimelineGroup, HelixTimelineItem } from '../timeline/index.native'
import { HelixToast, HelixToastItem } from '../toast/index.native'
import { HelixToggle, HelixToggleGroup } from '../toggle/index.native'
import { HelixToolbar } from '../toolbar/index.native'
import { HelixTooltip } from '../tooltip/index.native'
import { HelixTour, HelixTourStop } from '../tour/index.native'
import { HelixTree, HelixTreeItem } from '../tree/index.native'
import { HelixTrend } from '../trend/index.native'
import { HelixVideo } from '../video/index.native'
import {
  HelixVideoPlaylist,
  HelixVideoPlaylistItem,
  HelixVideoPlaylistMenu,
} from '../video-playlist/index.native'
import { HelixVirtualList } from '../virtual-list/index.native'
import { ButtonGroup, List, Steps, Tabs, TagGroup } from './held.native'
import {
  BulletList,
  Caption,
  DataCell,
  Emphasis,
  HEADINGS,
  HeadCell,
  ListItem,
  OrderedList,
  Paragraph,
  Pre,
  Quote,
  Row,
  Rule,
  Table,
  TableBody,
  TableHead,
  Turn,
} from './prose.native'
import {
  Anchor,
  Box,
  Fieldset,
  Legend,
  linkPress,
  type Props,
  RawSvg,
  Span,
  Strong,
  SVG_SHAPES,
} from './words.native'

/** An `a` under the `data-button` recipe is a Button, with the recipe's emphasis and tone. */
const Link = (props: Props) =>
  props['data-button'] === undefined
    ? React.createElement(Anchor, props)
    : React.createElement(
        HelixButton,
        {
          emphasis: props['data-button'] === '' ? undefined : props['data-button'],
          onPress: linkPress(props),
          tone: props['data-button-tone'],
        } as React.ComponentProps<typeof HelixButton>,
        props.children as React.ReactNode,
      )

/** A chat message, whose passage takes the values the base layer gives a turn. */
const ChatMessage = (props: React.ComponentProps<typeof HelixChatMessage>) =>
  React.createElement(Turn, null, React.createElement(HelixChatMessage, props))

/** The components a passage under `data-prose` spaces as its own blocks. */
export const PROSE_SPACED: ReadonlySet<unknown> = new Set([
  HelixCallout,
  HelixCodeBlock,
  HelixTable,
])

export const TAGS: Readonly<Record<string, unknown>> = {
  a: Link,
  b: Strong,
  blockquote: Quote,
  code: HelixCode,
  div: Box,
  em: Emphasis,
  fieldset: Fieldset,
  form: Box,
  ...HEADINGS,
  caption: Caption,
  'helix-accordion': HelixAccordion,
  'helix-accordion-item': HelixAccordionItem,
  'helix-announcement': HelixAnnouncement,
  'helix-app-header': HelixAppHeader,
  'helix-area-chart': HelixAreaChart,
  'helix-aura': HelixAura,
  'helix-avatar': HelixAvatar,
  'helix-avatar-group': HelixAvatarGroup,
  'helix-badge': HelixBadge,
  'helix-bar-chart': HelixBarChart,
  'helix-blockquote': HelixBlockquote,
  'helix-breadcrumb': HelixBreadcrumb,
  'helix-breadcrumbs': HelixBreadcrumbs,
  'helix-button': HelixButton,
  'helix-button-group': ButtonGroup,
  'helix-callout': HelixCallout,
  'helix-card': HelixCard,
  'helix-carousel': HelixCarousel,
  'helix-chat': HelixChat,
  'helix-chat-composer': HelixChatComposer,
  'helix-chat-message': ChatMessage,
  'helix-checkbox': HelixCheckbox,
  'helix-checkbox-group': HelixCheckboxGroup,
  'helix-code': HelixCode,
  'helix-code-block': HelixCodeBlock,
  'helix-color-input': HelixColorInput,
  'helix-color-picker': HelixColorPicker,
  'helix-combobox': HelixCombobox,
  'helix-command': HelixCommand,
  'helix-copy-button': HelixCopyButton,
  'helix-data-table': HelixDataTable,
  'helix-date-input': HelixDateInput,
  'helix-date-picker': HelixDatePicker,
  'helix-description-list': HelixDescriptionList,
  'helix-description-list-item': HelixDescriptionListItem,
  'helix-dialog': HelixDialog,
  'helix-divider': HelixDivider,
  'helix-donut-chart': HelixDonutChart,
  'helix-drawer': HelixDrawer,
  'helix-drilldown': HelixDrilldown,
  'helix-drilldown-item': HelixDrilldownItem,
  'helix-empty': HelixEmpty,
  'helix-file-input': HelixFileInput,
  'helix-filter-chip': HelixFilterChip,
  'helix-filter-field': HelixFilterField,
  'helix-filter-input': HelixFilterInput,
  'helix-filter-menu': HelixFilterMenu,
  'helix-filter-operator': HelixFilterOperator,
  'helix-flex': HelixFlex,
  'helix-format-date': HelixFormatDate,
  'helix-graph': HelixGraph,
  'helix-grid': HelixGrid,
  'helix-heatmap': HelixHeatmap,
  'helix-icon': HelixIcon,
  'helix-icon-button': HelixIconButton,
  'helix-image': HelixImage,
  'helix-input': HelixInput,
  'helix-kbd': HelixKbd,
  'helix-legend': HelixLegend,
  'helix-lightbox': HelixLightbox,
  'helix-lightbox-item': HelixLightboxItem,
  'helix-line-chart': HelixLineChart,
  'helix-list': List,
  'helix-list-item': HelixListItem,
  'helix-listbox': HelixListbox,
  'helix-loader': HelixLoader,
  'helix-log': HelixLog,
  'helix-log-group': HelixLogGroup,
  'helix-log-line': HelixLogLine,
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
  'helix-notification': HelixNotification,
  'helix-notification-group': HelixNotificationGroup,
  'helix-notifications': HelixNotifications,
  'helix-number-input': HelixNumberInput,
  'helix-object-inspector': HelixObjectInspector,
  'helix-option': HelixOption,
  'helix-option-group': HelixOptionGroup,
  'helix-option-separator': HelixOptionSeparator,
  'helix-orb': HelixOrb,
  'helix-outline': HelixOutline,
  'helix-outline-section': HelixOutlineSection,
  'helix-pagination': HelixPagination,
  'helix-pagination-size': HelixPaginationSize,
  'helix-pagination-summary': HelixPaginationSummary,
  'helix-pin-input': HelixPinInput,
  'helix-popover': HelixPopover,
  'helix-progress': HelixProgress,
  'helix-qr-code': HelixQrCode,
  'helix-quote': HelixQuote,
  'helix-radio': HelixRadio,
  'helix-radio-group': HelixRadioGroup,
  'helix-rating': HelixRating,
  'helix-scatter-chart': HelixScatterChart,
  'helix-scroll-area': HelixScrollArea,
  'helix-select': HelixSelect,
  'helix-skeleton': HelixSkeleton,
  'helix-skip-link': HelixSkipLink,
  'helix-slider': HelixSlider,
  'helix-sparkline': HelixSparkline,
  'helix-spatial-bar-chart': HelixSpatialBarChart,
  'helix-spatial-heatmap': HelixSpatialHeatmap,
  'helix-spatial-ribbon-chart': HelixSpatialRibbonChart,
  'helix-spatial-scatter-chart': HelixSpatialScatterChart,
  'helix-spatial-surface-chart': HelixSpatialSurfaceChart,
  'helix-spatial-treemap': HelixSpatialTreemap,
  'helix-speed-dial': HelixSpeedDial,
  'helix-speed-dial-group': HelixSpeedDialGroup,
  'helix-speed-dial-item': HelixSpeedDialItem,
  'helix-splitter': HelixSplitter,
  'helix-stat': HelixStat,
  'helix-stat-group': HelixStatGroup,
  'helix-step': HelixStep,
  'helix-steps': Steps,
  'helix-strands': HelixStrands,
  /* A stop says where a ribbon laid down a page turns. A phone has no page to
     lay a ribbon down, so a stop draws nothing there, as it draws nothing on
     the web. */
  'helix-strands-stop': () => null,
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
  'helix-time-input': HelixTimeInput,
  'helix-time-picker': HelixTimePicker,
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
  'helix-video': HelixVideo,
  'helix-video-playlist': HelixVideoPlaylist,
  'helix-video-playlist-item': HelixVideoPlaylistItem,
  'helix-video-playlist-menu': HelixVideoPlaylistMenu,
  'helix-virtual-list': HelixVirtualList,
  hr: Rule,
  i: Emphasis,
  legend: Legend,
  li: ListItem,
  ol: OrderedList,
  p: Paragraph,
  pre: Pre,
  span: Span,
  strong: Strong,
  svg: RawSvg,
  table: Table,
  tbody: TableBody,
  td: DataCell,
  tfoot: TableBody,
  th: HeadCell,
  thead: TableHead,
  tr: Row,
  ul: BulletList,
  ...SVG_SHAPES,
}

/** Whether a phone draws `tag` as a Helix component. */
export const hasComponent = (tag: string): boolean => tag.startsWith('helix-') && tag in TAGS
