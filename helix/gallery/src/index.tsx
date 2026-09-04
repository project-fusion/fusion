import type { ReactNode } from 'react'
import { accordionArt } from './art/accordion'
import { announcementArt } from './art/announcement'
import { appHeaderArt } from './art/app-header'
import { auraArt } from './art/aura'
import { avatarArt } from './art/avatar'
import { badgeArt } from './art/badge'
import { barChartArt } from './art/bar-chart'
import { blockquoteArt } from './art/blockquote'
import { breadcrumbsArt } from './art/breadcrumbs'
import { buttonArt } from './art/button'
import { buttonGroupArt } from './art/button-group'
import { calloutArt } from './art/callout'
import { cardArt } from './art/card'
import { carouselArt } from './art/carousel'
import { chatArt } from './art/chat'
import { checkboxArt } from './art/checkbox'
import { checkboxGroupArt } from './art/checkbox-group'
import { codeArt } from './art/code'
import { codeBlockArt } from './art/code-block'
import { colorInputArt } from './art/color-input'
import { colorPickerArt } from './art/color-picker'
import { comboboxArt } from './art/combobox'
import { commandArt } from './art/command'
import { copyButtonArt } from './art/copy-button'
import { dataTableArt } from './art/data-table'
import { dateInputArt } from './art/date-input'
import { datePickerArt } from './art/date-picker'
import { dialogArt } from './art/dialog'
import { dividerArt } from './art/divider'
import { donutChartArt } from './art/donut-chart'
import { drawerArt } from './art/drawer'
import { drilldownArt } from './art/drilldown'
import { editorArt } from './art/editor'
import { emptyArt } from './art/empty'
import { fileInputArt } from './art/file-input'
import { flexArt } from './art/flex'
import { formatDateArt } from './art/format-date'
import { gridArt } from './art/grid'
import { heatmapArt } from './art/heatmap'
import { iconArt } from './art/icon'
import { iconButtonArt } from './art/icon-button'
import { imageArt } from './art/image'
import { inputArt } from './art/input'
import { kbdArt } from './art/kbd'
import { legendArt } from './art/legend'
import { lineChartArt } from './art/line-chart'
import { listArt } from './art/list'
import { listboxArt } from './art/listbox'
import { loaderArt } from './art/loader'
import { megamenuArt } from './art/megamenu'
import { menuArt } from './art/menu'
import { meterArt } from './art/meter'
import { navigationArt } from './art/navigation'
import { notificationsArt } from './art/notifications'
import { numberInputArt } from './art/number-input'
import { optionArt } from './art/option'
import { orbArt } from './art/orb'
import { outlineArt } from './art/outline'
import { paginationArt } from './art/pagination'
import { pinInputArt } from './art/pin-input'
import { popoverArt } from './art/popover'
import { progressArt } from './art/progress'
import { qrCodeArt } from './art/qr-code'
import { quoteArt } from './art/quote'
import { radioArt } from './art/radio'
import { ratingArt } from './art/rating'
import { sandboxArt } from './art/sandbox'
import { scrollAreaArt } from './art/scroll-area'
import { selectArt } from './art/select'
import { skeletonArt } from './art/skeleton'
import { sliderArt } from './art/slider'
import { sparklineArt } from './art/sparkline'
import { speedDialArt } from './art/speed-dial'
import { splitterArt } from './art/splitter'
import { statArt } from './art/stat'
import { stepsArt } from './art/steps'
import { switchArt } from './art/switch'
import { tableArt } from './art/table'
import { tabsArt } from './art/tabs'
import { tagArt } from './art/tag'
import { textArt } from './art/text'
import { textareaArt } from './art/textarea'
import { timeInputArt } from './art/time-input'
import { timePickerArt } from './art/time-picker'
import { timelineArt } from './art/timeline'
import { toastArt } from './art/toast'
import { toggleArt } from './art/toggle'
import { toolbarArt } from './art/toolbar'
import { tooltipArt } from './art/tooltip'
import { tourArt } from './art/tour'
import { treeArt } from './art/tree'
import { trendArt } from './art/trend'
import { videoArt } from './art/video'
import { videoPlaylistArt } from './art/video-playlist'
import { virtualListArt } from './art/virtual-list'

/**
 * Abstract art for a family's gallery card, keyed by slug.
 *
 * Every family has an entry, and every entry is a file under `art/` named for
 * the family it draws. The system they all obey is `system.md`.
 *
 * **Ninety-five, not the ninety-four folders in `helix/styled/src`.** The catalog is
 * built from the manifests, so it also carries `editor` and `sandbox` from
 * `@fusion.dev/helix-sandbox`. The count that matters is whatever `getFamilies`
 * returns, never a directory listing.
 *
 * **This is `@fusion.dev/helix-gallery`.** Art is versioned content about
 * components rendered by a site, which is exactly what `@fusion.dev/helix-docs`
 * already is, so it belongs beside it rather than inside the app that renders
 * it: lockstep-versioned so a consumer's cards match their Helix version,
 * private, and TSX with its stylesheet kept together in `gallery.css`.
 *
 * Not in `helix/styled`, which has no React and no JSX transform, and which every
 * consumer installs. Not a CDN either, and that one fails on mechanics alone.
 * An external SVG in an
 * `<img>` is cut off from the page's CSS, so it can read no token and no hover
 * rule can reach it, and every card here is themed through `light-dark()` and
 * 54 of them move. Keeping either property means fetching and inlining
 * 57 files at build time, which is a docs build that breaks when the
 * CDN does.
 *
 * **The site is a consumer and is named nowhere in here.** The motion rules key
 * on `:has(> .componentArt):hover`, the element holding this drawing whatever
 * the consumer calls it, rather than on a wrapper class the site owns.
 * `gallery.css` carries the argument.
 *
 * No manifest annotation with it. The mapping is slug to slug, one to one by
 * name, and `fusion prose`'s `art` already holds the two sets equal in both directions;
 * `@documentation` earns its place because a URL is information a name does not
 * carry, and an art reference is not.
 *
 * A slug with no entry renders nothing rather than a placeholder. Card's media
 * region is a bare `<slot>`, so an unassigned one generates no box at all: no
 * grid row, no gap, no empty inset band. A new family therefore gets a card
 * that simply has no picture, and looks deliberate until someone draws one.
 */
const art: Record<string, ReactNode> = {
  accordion: accordionArt,
  announcement: announcementArt,
  'app-header': appHeaderArt,
  aura: auraArt,
  avatar: avatarArt,
  badge: badgeArt,
  'bar-chart': barChartArt,
  blockquote: blockquoteArt,
  breadcrumbs: breadcrumbsArt,
  button: buttonArt,
  'button-group': buttonGroupArt,
  callout: calloutArt,
  card: cardArt,
  carousel: carouselArt,
  chat: chatArt,
  checkbox: checkboxArt,
  'checkbox-group': checkboxGroupArt,
  code: codeArt,
  'code-block': codeBlockArt,
  'color-input': colorInputArt,
  'color-picker': colorPickerArt,
  combobox: comboboxArt,
  command: commandArt,
  'copy-button': copyButtonArt,
  'data-table': dataTableArt,
  'date-input': dateInputArt,
  'date-picker': datePickerArt,
  dialog: dialogArt,
  divider: dividerArt,
  'donut-chart': donutChartArt,
  drawer: drawerArt,
  drilldown: drilldownArt,
  editor: editorArt,
  empty: emptyArt,
  'file-input': fileInputArt,
  flex: flexArt,
  'format-date': formatDateArt,
  grid: gridArt,
  heatmap: heatmapArt,
  icon: iconArt,
  'icon-button': iconButtonArt,
  image: imageArt,
  input: inputArt,
  kbd: kbdArt,
  legend: legendArt,
  'line-chart': lineChartArt,
  list: listArt,
  listbox: listboxArt,
  loader: loaderArt,
  megamenu: megamenuArt,
  menu: menuArt,
  meter: meterArt,
  navigation: navigationArt,
  notifications: notificationsArt,
  'number-input': numberInputArt,
  option: optionArt,
  orb: orbArt,
  outline: outlineArt,
  pagination: paginationArt,
  'pin-input': pinInputArt,
  popover: popoverArt,
  progress: progressArt,
  'qr-code': qrCodeArt,
  quote: quoteArt,
  radio: radioArt,
  rating: ratingArt,
  sandbox: sandboxArt,
  'scroll-area': scrollAreaArt,
  select: selectArt,
  skeleton: skeletonArt,
  slider: sliderArt,
  sparkline: sparklineArt,
  'speed-dial': speedDialArt,
  splitter: splitterArt,
  stat: statArt,
  steps: stepsArt,
  switch: switchArt,
  table: tableArt,
  tabs: tabsArt,
  tag: tagArt,
  text: textArt,
  textarea: textareaArt,
  'time-input': timeInputArt,
  'time-picker': timePickerArt,
  timeline: timelineArt,
  toast: toastArt,
  toggle: toggleArt,
  toolbar: toolbarArt,
  tooltip: tooltipArt,
  tour: tourArt,
  tree: treeArt,
  trend: trendArt,
  video: videoArt,
  'video-playlist': videoPlaylistArt,
  'virtual-list': virtualListArt,
}

/**
 * The card art for one family.
 *
 * `aria-hidden`, deliberately. The card already carries the family's name as a
 * heading and its summary as prose, so a description of the picture would be a
 * third telling of the same thing. "Three rounded rectangles offset diagonally"
 * is noise to anyone who cannot see it and has just been told this is Button.
 *
 * The `slot` is here rather than on the call site because the wrapper is here:
 * slot assignment reads the light-DOM element, so the attribute has to land on
 * the `<svg>` itself.
 *
 * No background, no border and no radius of its own. The media region runs edge
 * to edge inside the card and the card's `overflow: hidden` clips it to the
 * corner, so anything stated here would be a second frame inside the first.
 *
 * `artBody` wraps the drawing so the baseline hover motion in `gallery.css` has
 * something to move that is not the whole `<svg>`. The dot lattice is a
 * substrate: it is the field the geometry was measured against, and a field
 * that swells with the thing measured on it is not a field.
 *
 * The shadow filter lives here rather than in each drawing. A `<filter>` has to
 * be in the same document fragment as the shape referencing it, and every card
 * gets its own `<svg>`, so a single shared definition is impossible: the honest
 * choice is one identical `defs` per card, written once here. Its id is the same
 * in all of them, which is legal because each is scoped to its own SVG, and
 * `url(#helixArtShadow)` resolves within the one it is written in.
 */
export function ComponentArt({ slug }: { slug: string }) {
  const body = art[slug]
  if (!body) {
    return null
  }
  return (
    <svg aria-hidden="true" className="componentArt" slot="media" viewBox="0 0 320 200">
      <defs>
        <filter
          className="artShadow"
          height="200%"
          id="helixArtShadow"
          width="200%"
          x="-50%"
          y="-50%"
        >
          <feDropShadow dx="0" dy="4" stdDeviation="5" />
        </filter>
        {/* Offset to the cell center rather than its corner. On the corner the
            dots land on 48, 64 and 80, the same coordinates the drawings start
            and end on, so every panel edge would have a dot sitting half under
            it. At the center they fall in the gaps. */}
        {/* Radius 1, not 0.75. The card renders at about three quarters of the
            viewBox, so a 0.75 dot lands near a single device pixel and most of
            its alpha goes to antialiasing: it measured at the stated strength
            and read at roughly half of it. A radius of 1 survives the
            downscale. */}
        <pattern height="16" id="helixArtGrid" patternUnits="userSpaceOnUse" width="16">
          <circle className="artGridDot" cx="8" cy="8" r="1" />
        </pattern>
        <radialGradient cx="0.5" cy="0.5" id="helixArtFade" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.65" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="helixArtGridMask">
          <rect fill="url(#helixArtFade)" height="200" width="320" x="0" y="0" />
        </mask>
      </defs>
      <rect
        fill="url(#helixArtGrid)"
        height="200"
        mask="url(#helixArtGridMask)"
        width="320"
        x="0"
        y="0"
      />
      <g className="artBody">{body}</g>
    </svg>
  )
}
