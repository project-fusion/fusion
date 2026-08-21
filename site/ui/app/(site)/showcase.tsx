'use client'

import { deriveTheme, hexToOklch, type ThemeIntent } from '@helix-io/theme'
import { useEffect, useRef, useState } from 'react'

/**
 * The library, running, with a switch that changes what it is showing.
 *
 * **A client component because the switch is the point.** The rest of this page
 * is server rendered and stays that way; what needs state is one segmented
 * control and the cell it swaps, so that is what moved and nothing else.
 *
 * **The switch never moves.** It sits above the grid rather than in it, so
 * pressing a segment changes what is under it and not where it is: a control
 * that jumps to a new position when you use it is a control you have to find
 * again every time. The anchor is pinned above the switch for the same reason,
 * being the one card that is about the page rather than about the library.
 *
 * **And every view is rendered, always.** Swapping them with a conditional
 * unmounts one set of custom elements and mounts another, and a freshly created
 * custom element has no size until it upgrades: the grid lays out around
 * nothing, the definitions arrive, and it lays out again. The containers never
 * moved, measured identical across all three at 664, 491, 644 and a switch at
 * 403, but the contents settled twice and that is what a reader sees.
 *
 * All three are stacked in one grid cell and all but one is `hidden`, so
 * nothing mounts on a press and nothing has to upgrade. `hidden` rather than a
 * conditional is also what keeps the two that are not showing out of the
 * accessibility tree and out of the tab order.
 */
const VIEWS = [
  { label: 'Controls', name: 'controls' },
  { label: 'Data', name: 'data' },
  { label: 'Surfaces', name: 'surfaces' },
] as const

type View = (typeof VIEWS)[number]['name']

/**
 * Five mouths on one head, sad to pleased.
 *
 * **A radio group rather than a rating, and that is not a preference.** A
 * rating's `mark` slot takes one shape and clones it into every position, so
 * five *different* faces cannot be a rating by construction. Five choices that
 * differ from each other is what a radio group is.
 *
 * Only the mouth changes: same head, same eyes, one path. Redrawing the whole
 * face per step is five chances for the heads to disagree about their own size.
 */
const FACES = [
  { label: 'Awful', mouth: 'M8.5 16.6q3.5-3.2 7 0', value: 'awful' },
  { label: 'Poor', mouth: 'M8.5 15.9q3.5-1.6 7 0', value: 'poor' },
  { label: 'Fine', mouth: 'M8.5 15.3h7', value: 'fine' },
  { label: 'Good', mouth: 'M8.5 14.7q3.5 1.8 7 0', value: 'good' },
  { label: 'Great', mouth: 'M8.5 14q3.5 3.4 7 0', value: 'great' },
] as const

/** Seven days of a figure, for the rows that carry one. */
const SERIES: Record<string, string> = {
  headless: '74 74 73 75 74 74 74',
  styles: '9 10 10 11 11 12 12',
  web: '104 109 112 110 115 117 118',
}

/** How long a view holds before the next one, when nobody is looking at it. */
const DWELL = 7000

/** What the page is derived from before anybody touches it. */
const BRAND = '#3b82f6'

/**
 * Re-derives from one colour and puts the result on the panel.
 *
 * **All of it comes from the engine now.** This used to bridge a name the
 * engine emitted and the stylesheet did not read, step the primary's hover,
 * active and subtle by hand because nothing produced them, and solve the anchor
 * its own contrast-checked pair. Every one of those was a consumer covering for
 * a gap, and every one of them is gone: `deriveTheme` emits fourteen tokens
 * under the names the stylesheet actually reads, including the three surfaces a
 * dropdown, a recess and a raised card sit on.
 *
 * Scoped to the panel rather than the document, because the rest of the page is
 * not the demonstration.
 */
const restyle = (node: HTMLElement, hex: string, scheme: ThemeIntent['scheme']): void => {
  for (const token of deriveTheme({ brand: hexToOklch(hex), scheme }).tokens) {
    node.style.setProperty(`--helix-${token.name}`, token.hex)
  }

  /* **The seed as well, and it is what moves the charts.**

     There are two derivations here and they do not talk to each other.
     `deriveTheme` computes tokens in JavaScript. The series ramp the charts use
     computes itself in CSS, `oklch(from var(--_helix-seed-brand) ...)`, so every
     sparkline and every bar is a hue rotation off that primitive and off
     nothing else. Setting the semantic tokens moved the buttons, the tags and
     the surfaces, and left every chart on the page the original blue.

     **Setting the seed alone does not fix it either, and that is the part worth
     knowing.** A `var()` inside a custom property is substituted on the element
     the property is *declared* on, so the ramp had already resolved at `:root`
     and a seed on this panel was read by nothing. `data-helix-theme` is the
     scope that re-runs those declarations here, and it is why the attribute is
     set before the value.

     `helix/styles` owns the primitives and nothing outside is meant to touch
     them, which is the rule and is right. It is written to here because the
     ramp has no other input, and that is the seam rather than an exception: a
     theming solution has to drive the seed and let the CSS derive from it. The
     name is the thing to revisit, not the direction. */
  node.dataset.helixTheme = ''
  node.style.setProperty('--_helix-seed-brand', hex)
}

export function Showcase(): React.ReactElement {
  const [view, setView] = useState<View>('controls')

  /**
   * It cycles on its own, and stops the moment anybody arrives.
   *
   * **A pointer inside the panel is somebody reading it**, and moving what
   * they are reading out from under them is the worst thing this could do. The
   * same goes for focus: a reader on a keyboard has no pointer to hold still
   * with, so focus anywhere inside pauses it too.
   *
   * **And it does not run at all for a reader who asked not to be moved.**
   * Nothing in the base layer covers this. That rule caps animation and
   * transition durations, and this is neither: it is a state change on a timer,
   * which no duration reaches. Asked directly, and asked again if the
   * preference changes rather than only at mount.
   */
  const [held, setHeld] = useState(false)
  const [brand, setBrand] = useState(BRAND)
  const stage = useRef<HTMLDivElement>(null)

  /* Derived on the client only. The server has no reader and no preference, so
     it renders the page's own tokens and this arrives afterwards. */
  useEffect(() => {
    const node = stage.current
    if (!node) {
      return
    }
    /* **Two signals, because the preference has three states.** The drawer
       writes `data-color-mode` for an explicit choice and *deletes* it for
       "system", so the media query alone answers only the third of them. Watched
       rather than read once: the drawer is on this page, so the mode can change
       while the panel is on screen.

       Left unwatched, the panel kept the tokens it was painted with and the page
       around it changed: measured at `#030407` behind text the page had turned
       black, which is not a section that failed to follow the mode so much as
       one that cannot be read. */
    const root = document.documentElement
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const scheme = (): ThemeIntent['scheme'] => {
      const chosen = root.dataset.colorMode
      if (chosen === 'dark' || chosen === 'light') {
        return chosen
      }
      return query.matches ? 'dark' : 'light'
    }
    const paint = (): void => restyle(node, brand, scheme())
    paint()
    query.addEventListener('change', paint)
    const watch = new MutationObserver(paint)
    watch.observe(root, { attributeFilter: ['data-color-mode'], attributes: true })
    return () => {
      query.removeEventListener('change', paint)
      watch.disconnect()
    }
  }, [brand])

  /* **Listened for on the node rather than bound in the markup.** A panel that
     pauses when a pointer arrives is not an interactive element: it has no
     activation, no role and nothing to press, and `onPointerEnter` in the JSX
     had Biome asking for a role to justify it. Inventing one to satisfy a
     linter puts a lie in the accessibility tree. The listeners belong on the
     node, which is also where React's own enter and leave are synthesised from
     delegated over and out anyway. */
  useEffect(() => {
    const node = stage.current
    if (!node) {
      return
    }

    const hold = (): void => setHeld(true)
    const release = (): void => setHeld(false)

    node.addEventListener('pointerenter', hold)
    node.addEventListener('pointerleave', release)
    node.addEventListener('focusin', hold)
    node.addEventListener('focusout', release)

    return () => {
      node.removeEventListener('pointerenter', hold)
      node.removeEventListener('pointerleave', release)
      node.removeEventListener('focusin', hold)
      node.removeEventListener('focusout', release)
    }
  }, [])

  useEffect(() => {
    if (held) {
      return
    }

    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setInterval> | undefined

    const start = (): void => {
      if (still.matches) {
        return
      }
      timer = setInterval(() => {
        setView((was) => {
          const at = VIEWS.findIndex((one) => one.name === was)
          return VIEWS[(at + 1) % VIEWS.length]?.name ?? was
        })
      }, DWELL)
    }

    const restart = (): void => {
      clearInterval(timer)
      start()
    }

    start()
    still.addEventListener('change', restart)

    return () => {
      clearInterval(timer)
      still.removeEventListener('change', restart)
    }
  }, [held])

  return (
    <div className="showcaseStage" ref={stage}>
      <helix-card class="showcaseAnchor">
        <helix-flex direction="column" gap="md">
          <helix-text appearance="label">Helix</helix-text>
          <helix-text as="h3" class="anchorTitle">
            One brand colour in. A whole palette out.
          </helix-text>
          <helix-text>
            Every surface, border and text colour on this page is derived from a single value, and
            each one is checked against the ground it lands on.
          </helix-text>
          <helix-flex>
            <helix-button appearance="solid">Read the derivation</helix-button>
          </helix-flex>
        </helix-flex>
      </helix-card>

      <helix-toggle-group
        appearance="filled"
        class="showcaseSwitch"
        label="Showing"
        label-placement="start"
        onhelix-change={(event: CustomEvent<{ value: string }>) => {
          setView(event.detail.value as View)
        }}
        value={view}
      >
        {VIEWS.map((one) => (
          <helix-toggle key={one.name} value={one.name}>
            {one.label}
          </helix-toggle>
        ))}
      </helix-toggle-group>

      {/* On the switch's own line, because it belongs to the panel rather than
          to any one view: changing the colour with Data showing and finding the
          control gone would be the same fault the switch avoids. */}
      {/* **`aria-label` rather than `label`, which is the field mixin's own
          distinction: `label` means a visible label and `aria-label` means a
          name.** The visible one cost a row of the field's grid, so the control
          sat 20px below the toggle group beside it and the reset button lined
          up with neither. Nothing here is a workaround for that: the mixin
          renders the name clipped and the control is 40px, the same
          `--helix-size-control` every other control is. */}
      <helix-color-input
        aria-label="Brand"
        class="showcaseBrand"
        default-value={BRAND}
        name="brand"
        onhelix-change={(event: CustomEvent<{ value: string }>) => {
          setBrand(event.detail.value)
        }}
        value={brand}
      ></helix-color-input>

      <helix-tooltip class="showcaseReset" content="Back to the Fusion blue">
        <helix-icon-button
          disabled={brand === BRAND || undefined}
          label="Reset the brand colour"
          onClick={() => setBrand(BRAND)}
        >
          <helix-icon name="arrow-counter-clockwise"></helix-icon>
        </helix-icon-button>
      </helix-tooltip>

      <div className="showcase">
        <div className="showcaseView" hidden={view !== 'controls'}>
          {/* A form, laid out as one. The previous version was a switch, a
                checkbox, a slider and an unlabelled bar stacked at even
                spacing, which is a pile of controls rather than a thing anybody
                would fill in. Fields first, then the two that are settings. */}
          <helix-card appearance="outlined" class="showcaseCard showcaseTall">
            <helix-flex direction="column" gap="md">
              <helix-select default-value="dark" label="Colour mode" name="mode">
                <helix-icon name="caret-down" slot="indicator"></helix-icon>
                <helix-option value="system">System</helix-option>
                <helix-option value="light">Light</helix-option>
                <helix-option value="dark">Dark</helix-option>
              </helix-select>
              <helix-number-input default-value="8" label="Octaves" min={1}></helix-number-input>
              <helix-slider
                default-value="60"
                label="Bloom"
                markers={5}
                max={100}
                min={0}
                show-value
              ></helix-slider>
              <helix-switch default-checked label="Reduced motion"></helix-switch>
              <helix-checkbox default-checked label="Ship with the audit"></helix-checkbox>
            </helix-flex>
          </helix-card>

          <helix-card appearance="outlined" class="showcaseCard">
            <helix-flex direction="column" gap="md">
              <helix-flex align="center" gap="sm" wrap>
                <helix-button appearance="solid" tone="primary">
                  Primary
                </helix-button>
                <helix-button>Secondary</helix-button>
                <helix-button appearance="subtle">Subtle</helix-button>
              </helix-flex>
              <helix-flex align="center" gap="sm" wrap>
                <helix-kbd>Cmd K</helix-kbd>
                <helix-tag tone="primary">Tag</helix-tag>
                <helix-badge label="3 unread" value="3">
                  <helix-icon-button label="Notifications">
                    <helix-icon name="bell"></helix-icon>
                  </helix-icon-button>
                </helix-badge>
                <helix-loader></helix-loader>
              </helix-flex>
              <helix-progress label="Contrast pass" value={72}></helix-progress>
            </helix-flex>
          </helix-card>

          {/* **The hole under the shorter card, which is why the form spans two
              rows rather than this being appended.** The two cards above are
              312 and 154, and the grid aligns to the start, so the right column
              ended in 158px of nothing. Auto-placement would have put a fourth
              card under the *taller* one and left the gap exactly where it was;
              spanning the form is what makes the short column the one that
              takes another item.

              Two controls that appear nowhere else in this view: a pin is the
              one field that is several boxes and one value, and a rating is a
              scale that reports a number rather than a mood, which is the thing
              the faces below deliberately are not. */}
          <helix-card appearance="outlined" class="showcaseCard">
            <helix-flex direction="column" gap="md">
              <helix-pin-input label="Verification code" length={4}></helix-pin-input>
              <helix-rating default-value={4} label="Documentation"></helix-rating>
            </helix-flex>
          </helix-card>

          {/* Both columns: five faces at about 87 apiece need 435, and half
                the panel is 297, so in one column the scale wrapped onto two
                rows. A scale that has to be read in two goes is not a scale. */}
          <helix-card appearance="outlined" class="showcaseCard showcaseWide">
            <helix-radio-group
              class="showcaseFaces"
              default-value="good"
              label="How did that go"
              name="mood"
              orientation="horizontal"
            >
              {FACES.map((face) => (
                <helix-radio key={face.value} value={face.value}>
                  <svg aria-hidden="true" slot="icon" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" fill="none" r="9" stroke="currentColor" />
                    <circle cx="9" cy="10" fill="currentColor" r="1.1" />
                    <circle cx="15" cy="10" fill="currentColor" r="1.1" />
                    <path d={face.mouth} fill="none" stroke="currentColor" />
                  </svg>
                  {face.label}
                </helix-radio>
              ))}
            </helix-radio-group>
          </helix-card>
        </div>

        <div className="showcaseView" hidden={view !== 'data'}>
          {/* **The sparkline spans the card, not one stat.** It used to sit
                under a two stat group aligned to the first of them, 98 wide
                under a 113 wide figure inside a 174 wide group, so it lined up
                with nothing and read as a stray line. That was a layout
                decision rather than a missing component: `Stat` slots a value,
                a label and a unit, and it is a figure rather than a chart
                container. Given the card's width and a rule above it, the two
                are one thing. */}
          <helix-card appearance="outlined" class="showcaseCard" media-placement="end">
            <helix-stat-group divided>
              <helix-stat>
                1,284
                <span slot="label">Installs</span>
              </helix-stat>
              <helix-stat>
                99.98
                <span slot="label">Uptime</span>
                <span slot="unit">%</span>
              </helix-stat>
            </helix-stat-group>
            {/* **The chart is the card's media, which is why it is a direct
                child and carries no width of its own.** `media` is the one
                region that escapes the inset, and `media-placement="end"` puts
                it against the bottom edge rather than the top. A class setting
                `inline-size: 100%` here would win: a document rule beats a
                shadow one whatever the specificity, so it would hold the chart
                to the content width and quietly undo the bleed. The divider
                went with it, having been the thing separating the numbers from
                the chart that the bleed now separates by itself. */}
            <helix-sparkline
              label="Installs rose from 1,240 to 1,284 over seven days"
              slot="media"
              values="1240 1318 1102 1291 1244 1180 1284"
            ></helix-sparkline>
          </helix-card>

          <helix-card appearance="outlined" class="showcaseCard">
            <helix-timeline label="Release history">
              <helix-timeline-item datetime="2026-08-21T09:12" tone="success">
                <helix-icon name="check" slot="marker"></helix-icon>
                <span slot="time">09:12</span>
                <helix-text appearance="body-strong">Contrast pass</helix-text>
              </helix-timeline-item>
              <helix-timeline-item datetime="2026-08-21T08:40">
                <span slot="time">08:40</span>
                <helix-text appearance="body-strong">Tokens regenerated</helix-text>
              </helix-timeline-item>
            </helix-timeline>
          </helix-card>

          {/* **The chart reads a table, and the table is the accessible copy.**
              `for` points at it and the markup carries `data-value` beside the
              text a reader sees, so the numbers exist as numbers whether or not
              anything draws them. The table is hidden visually and not from a
              screen reader, which is the whole reason the component takes this
              shape rather than an array of values. */}
          <helix-card appearance="outlined" class="showcaseCard">
            <helix-flex direction="column" gap="md">
              <table data-hidden-visually id="showcase-releases">
                <caption>Releases by quarter</caption>
                <thead>
                  <tr>
                    <th scope="col">Quarter</th>
                    <th scope="col">Releases</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Q1</th>
                    <td data-value="18">18</td>
                  </tr>
                  <tr>
                    <th scope="row">Q2</th>
                    <td data-value="31">31</td>
                  </tr>
                  <tr>
                    <th scope="row">Q3</th>
                    <td data-value="24">24</td>
                  </tr>
                  <tr>
                    <th scope="row">Q4</th>
                    <td data-value="39">39</td>
                  </tr>
                </tbody>
              </table>
              <helix-bar-chart for="showcase-releases"></helix-bar-chart>
            </helix-flex>
          </helix-card>

          <helix-card appearance="outlined" class="showcaseCard showcaseWide">
            <helix-table label="Packages">
              <helix-table-column width="7rem">Package</helix-table-column>
              <helix-table-column>Seven days</helix-table-column>
              <helix-table-column width="5rem">Size</helix-table-column>

              {Object.entries(SERIES).map(([name, values]) => (
                <helix-table-row key={name}>
                  <helix-table-cell header>{name}</helix-table-cell>
                  <helix-table-cell>
                    <helix-sparkline
                      class="showcaseRowLine"
                      label={`${name} over seven days`}
                      values={values}
                    ></helix-sparkline>
                  </helix-table-cell>
                  <helix-table-cell>{values.split(' ').at(-1)} kB</helix-table-cell>
                </helix-table-row>
              ))}
            </helix-table>
          </helix-card>

          <helix-card appearance="outlined" class="showcaseCard">
            <helix-flex direction="column" gap="md">
              <helix-meter label="Bundle budget" max={100} value={78}></helix-meter>
              <helix-flex align="center" gap="sm" wrap>
                <helix-tag tone="success">Passing</helix-tag>
                <helix-tag tone="warning">Near budget</helix-tag>
              </helix-flex>
            </helix-flex>
          </helix-card>

          {/* Last, and a ring rather than a second line: it answers shares
              where the sparkline above answers trend, so the two are not one
              chart drawn twice. */}
          <helix-card appearance="outlined" class="showcaseCard">
            <helix-flex direction="column" gap="md">
              <table data-hidden-visually id="showcase-sources">
                <caption>Downloads by source</caption>
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">npm</th>
                    <td data-value="4200">4,200</td>
                  </tr>
                  <tr>
                    <th scope="row">jsDelivr</th>
                    <td data-value="3100">3,100</td>
                  </tr>
                  <tr>
                    <th scope="row">unpkg</th>
                    <td data-value="1800">1,800</td>
                  </tr>
                  <tr>
                    <th scope="row">Git</th>
                    <td data-value="900">900</td>
                  </tr>
                </tbody>
              </table>
              <helix-donut-chart for="showcase-sources"></helix-donut-chart>
            </helix-flex>
          </helix-card>
        </div>

        <div className="showcaseView" hidden={view !== 'surfaces'}>
          {/* Flat, like the code block. `Callout` already draws its own band:
              a tinted ground, a rule and an icon down the side. A card around
              it is a second surface a few pixels outside the first, and the two
              edges argue about which one is the callout. */}
          <helix-callout class="showcaseWide" severity="info">
            <helix-text appearance="body-strong" slot="title">
              Nothing here needs us to keep running
            </helix-text>
            The packages install from npm and ship as custom elements.
          </helix-callout>

          <helix-code-block class="showcaseCode" label="Install Helix">
            bun add @helix-io/web
          </helix-code-block>

          <helix-card appearance="outlined" class="showcaseCard">
            <helix-flex direction="column" gap="md">
              <helix-flex align="center" gap="sm" justify="between" wrap>
                <helix-flex align="center" gap="sm">
                  <helix-avatar name="Ada Whitfield"></helix-avatar>
                  <helix-avatar name="Grace Nakamura"></helix-avatar>
                  <helix-avatar name="Lin Ortega"></helix-avatar>
                </helix-flex>
                <helix-badge label="3 unread" value="3">
                  <helix-icon-button label="Notifications">
                    <helix-icon name="bell"></helix-icon>
                  </helix-icon-button>
                </helix-badge>
              </helix-flex>
              <helix-flex align="center" gap="sm" wrap>
                <helix-tag tone="primary">Primary</helix-tag>
                <helix-tag tone="success">Success</helix-tag>
                <helix-tag tone="warning">Warning</helix-tag>
                <helix-tag tone="danger">Danger</helix-tag>
              </helix-flex>
            </helix-flex>
          </helix-card>

          {/* The fourth cell, which was empty because the view had three items
              after the callout and the grid has two columns. An accordion is
              the one surface here that is a surface *and* a control: it is the
              only thing in this view a reader can open, so it says something
              the tags and the avatars beside it cannot. */}
          <helix-card appearance="outlined" class="showcaseCard">
            <helix-accordion>
              <helix-accordion-item>
                <span slot="summary">What ships</span>
                Custom elements, a stylesheet, and the types. No runtime beyond the components
                themselves.
              </helix-accordion-item>
              <helix-accordion-item>
                <span slot="summary">What it needs</span>A browser. The elements upgrade on import
                and render on a server without one.
              </helix-accordion-item>
            </helix-accordion>
          </helix-card>

          <helix-card appearance="outlined" class="showcaseCard">
            <helix-flex direction="column" gap="md">
              <helix-breadcrumbs aria-label="Breadcrumb">
                <helix-breadcrumb>
                  <a data-link="quiet" href="/helix">
                    Helix
                  </a>
                </helix-breadcrumb>
                <helix-breadcrumb>
                  <a data-link="quiet" href="/helix">
                    Components
                  </a>
                </helix-breadcrumb>
                <helix-breadcrumb current>Aura</helix-breadcrumb>
              </helix-breadcrumbs>
              {/* **No second bar here.** A meter and a progress bar are the same
                  drawing and different claims: one is a reading against a range
                  and the other is how far along a task is. Put side by side a
                  reader compares their lengths, which means nothing, so they
                  live in different views. Progress is with the actions and the
                  meter is with the figures. */}
              <helix-flex align="center" gap="sm" wrap>
                <helix-tag>Building</helix-tag>
                <helix-tag tone="success">Active</helix-tag>
              </helix-flex>
            </helix-flex>
          </helix-card>
        </div>
      </div>
    </div>
  )
}
