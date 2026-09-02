'use client'

import { initTheme, type ThemeEngine, type ThemeIntent } from '@fusion.dev/helix-theme'
import { useEffect, useRef, useState } from 'react'
import { THEME_ENGINE } from '../../utils/theme-engine/theme-engine'
import styles from './showcase.module.css'

/**
 * The library, running, with a switch that changes what it is showing.
 *
 * **And every view is rendered, always.** Swapping them with a conditional
 * unmounts one set of custom elements and mounts another, and a freshly created
 * custom element has no size until it upgrades: the grid lays out around
 * nothing, the definitions arrive, and it lays out again. The containers never
 * moved, measured identical across all three at 664, 491, 644 and a switch at
 * 403, but the contents settled twice and that is what a reader sees.
 */
const VIEWS = [
  { label: 'Controls', name: 'controls' },
  { label: 'Data', name: 'data' },
  { label: 'Surfaces', name: 'surfaces' },
] as const

type View = (typeof VIEWS)[number]['name']

/**
 * Five mouths on one head, sad to pleased.
 */
const FACES = [
  { label: 'Awful', mouth: 'M8.5 16.6q3.5-3.2 7 0', value: 'awful' },
  { label: 'Poor', mouth: 'M8.5 15.9q3.5-1.6 7 0', value: 'poor' },
  { label: 'Fine', mouth: 'M8.5 15.3h7', value: 'fine' },
  { label: 'Good', mouth: 'M8.5 14.7q3.5 1.8 7 0', value: 'good' },
  { label: 'Great', mouth: 'M8.5 14q3.5 3.4 7 0', value: 'great' },
] as const

/** How long a view holds before the next one, when nobody is looking at it. */
const DWELL = 7000

/** What the page is derived from before anybody touches it. */
const BRAND = '#3b82f6'

/**
 * True when something above this panel has already themed the document.
 */
const pageIsThemed = (): boolean => document.documentElement.hasAttribute('data-helix-theme')

/**
 * Re-derives from one color and puts the result on the panel.
 */
const restyle = (
  engine: ThemeEngine,
  node: HTMLElement,
  hex: string,
  scheme: ThemeIntent['scheme'],
): void => {
  /* Stand down and inherit. Anything written here on a previous pass has to come
     off too, or the panel keeps the last palette it derived for itself. */
  if (pageIsThemed()) {
    for (const name of [...node.style]) {
      if (name.startsWith('--helix-')) {
        node.style.removeProperty(name)
      }
    }
    delete node.dataset.helixTheme
    return
  }

  const theme = engine.derive({ brand: engine.hexToOklch(hex), scheme })

  node.dataset.helixTheme = ''
  for (const token of theme.tokens) {
    node.style.setProperty(`--helix-${token.name}`, token.hex)
  }
  for (const [name, value] of Object.entries(theme.seeds)) {
    node.style.setProperty(`--helix-${name}`, value)
  }
}

/**
 * Paints the panel, and again whenever the color mode moves. Returns its own
 * teardown.
 *
 * Separate from the effect that calls it, which is about *when the engine is
 * ready* where this is about what to do once it is.
 */
const listen = (engine: ThemeEngine, node: HTMLElement, brand: string): (() => void) => {
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
  const paint = (): void => restyle(engine, node, brand, scheme())
  paint()
  query.addEventListener('change', paint)
  const modes = new MutationObserver(paint)
  modes.observe(root, { attributeFilter: ['data-color-mode'], attributes: true })
  return () => {
    query.removeEventListener('change', paint)
    modes.disconnect()
  }
}

export function Showcase(): React.ReactElement {
  const [view, setView] = useState<View>('controls')

  /**
   * It cycles on its own, and stops the moment anybody arrives.
   */
  const [held, setHeld] = useState(false)
  const [brand, setBrand] = useState(BRAND)
  const stage = useRef<HTMLDivElement>(null)

  /* **Derived on the client only, which is why the engine arriving late costs
     nothing here.** The server has no reader and no preference, so it renders
     the page's own tokens and this has always arrived afterwards. The engine is
     WebAssembly now and instantiates asynchronously, so "afterwards" is a
     fraction later; what the panel shows in the meantime is the page's own
     palette, which is what it showed before this ran at all. No state to add and
     nothing to show a reader.

     `stop` rather than a plain flag, because the teardown has two jobs depending
     on when it runs: before the engine lands it has to stop the listeners being
     wired at all, and after it has to unwire them. One mutable holder does both,
     and a reader clicking two swatches quickly has two loads in flight where
     only the second should end up listening. */
  useEffect(() => {
    const node = stage.current
    if (!node) {
      return
    }
    let stop: (() => void) | undefined
    let live = true
    void initTheme(THEME_ENGINE).then((engine) => {
      if (live) {
        stop = listen(engine, node, brand)
      }
    })
    return () => {
      live = false
      stop?.()
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
    <div className={styles.showcaseStage} ref={stage}>
      <helix-card class={styles.showcaseAnchor} data-filled>
        <helix-flex direction="column" gap="md">
          <helix-text variant="label">Helix</helix-text>
          <helix-text as="h3" class={styles.anchorTitle}>
            One brand color in. A whole palette out.
          </helix-text>
          <helix-text>
            Every surface, border and text color on this page is derived from a single value, and
            each one is checked against the ground it lands on.
          </helix-text>
          <helix-flex>
            <helix-button emphasis="solid">Read the derivation</helix-button>
          </helix-flex>
        </helix-flex>
      </helix-card>

      <helix-toggle-group
        class={styles.showcaseSwitch}
        label="Showing"
        label-placement="start"
        onChange={(event) => {
          setView(event.currentTarget.value as View)
        }}
        separation="outlined"
        value={view}
      >
        {VIEWS.map((one) => (
          <helix-toggle key={one.name} value={one.name}>
            {one.label}
          </helix-toggle>
        ))}
      </helix-toggle-group>

      {/* On the switch's own line, because it belongs to the panel rather than
          to any one view: changing the color with Data showing and finding the
          control gone would be the same fault the switch avoids. */}
      {/* **`aria-label` rather than `label`, which is the field mixin's own
          distinction: `label` means a visible label and `aria-label` means a
          name.** A visible label costs a row of the field's grid, which would
          drop this control 20px below the toggle group beside it and line the
          reset button up with neither. Nothing here is a workaround for it:
          the mixin renders the name clipped and the control is 40px, the same
          `--helix-size-control` every other control is. */}
      <helix-color-input
        aria-label="Brand"
        class={styles.showcaseBrand}
        default-value={BRAND}
        name="brand"
        onChange={(event) => {
          setBrand(event.currentTarget.value)
        }}
        value={brand}
      ></helix-color-input>

      <helix-tooltip class={styles.showcaseReset} content="Back to the Fusion blue">
        <helix-icon-button
          disabled={brand === BRAND || undefined}
          label="Reset the brand color"
          onClick={() => setBrand(BRAND)}
        >
          <helix-icon name="arrow-counter-clockwise"></helix-icon>
        </helix-icon-button>
      </helix-tooltip>

      <div className={styles.showcase}>
        <div className={styles.showcaseView} hidden={view !== 'controls'}>
          {/* A form, laid out as one: fields first, then the two that are
                settings. Controls stacked at even spacing are a pile rather
                than a thing anybody would fill in. */}
          <helix-card
            class={`showcaseCard ${styles.showcaseTall}`}
            data-card-edge
            separation="outlined"
          >
            <helix-flex direction="column" gap="md">
              <helix-select default-value="dark" label="Color mode" name="mode">
                <helix-icon name="caret-down" slot="indicator"></helix-icon>
                <helix-option value="system">System</helix-option>
                <helix-option value="light">Light</helix-option>
                <helix-option value="dark">Dark</helix-option>
              </helix-select>
              <helix-number-input
                default-value="8"
                label="Octaves"
                min={1}
                scrub
              ></helix-number-input>
              <helix-slider
                default-value="35,65"
                label="Bloom"
                max={100}
                min={0}
                range
                show-value
              ></helix-slider>
              <helix-switch default-checked label="Reduced motion"></helix-switch>
              <helix-checkbox default-checked label="Ship with the audit"></helix-checkbox>
            </helix-flex>
          </helix-card>

          <helix-card class="showcaseCard" data-card-edge separation="outlined">
            <helix-flex direction="column" gap="md">
              <helix-flex align="center" gap="sm" wrap>
                <helix-button emphasis="solid" tone="primary">
                  Primary
                </helix-button>
                <helix-button>Secondary</helix-button>
                <helix-button emphasis="subtle">Subtle</helix-button>
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

          {/*
           * *The hole under the shorter card, which is why the form spans two
           *               rows rather than this being appended.** The two cards above are
           *               312 and 154, and the grid aligns to the start, so the right column
           *               ended in 158px of nothing. Auto-placement would have put a fourth
           *               card under the *taller* one and left the gap exactly where it was;
           *               spanning the form is what makes the short column the one that
           *               takes another item.
           */}
          <helix-card class="showcaseCard" data-card-edge separation="outlined">
            <helix-flex direction="column" gap="md">
              <helix-pin-input
                label="Verification code"
                length={4}
                placeholder="•"
                type="alphanumeric"
              ></helix-pin-input>
              <helix-rating default-value="4" label="Documentation"></helix-rating>
            </helix-flex>
          </helix-card>

          {/* Both columns: five faces at about 87 apiece need 435, and half
                the panel is 297, so in one column the scale wrapped onto two
                rows. A scale that has to be read in two goes is not a scale. */}
          <helix-card
            class={`showcaseCard ${styles.showcaseWide}`}
            data-card-edge
            separation="outlined"
          >
            <helix-radio-group
              class={styles.showcaseFaces}
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

        <div className={styles.showcaseView} hidden={view !== 'data'}>
          {/* **The sparkline spans the card, not one stat.** Aligned to the
                first of a two stat group it is 98 wide under a 113 wide figure
                inside a 174 wide group, lining up with nothing and reading as a
                stray line. That is a layout decision rather than a missing
                component: `Stat` slots a value, a label and a unit, and it is a
                figure rather than a chart container. */}
          <helix-card
            class={`showcaseCard ${styles.showcaseFigures}`}
            media-placement="end"
            separation="outlined"
          >
            <helix-stat-group class={styles.showcaseStats} divided>
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
            {/* **The meter joins the figures rather than standing in a card of
                its own**, which is what the note beside Progress already said a
                meter should do: a reading against a range belongs with the
                readings. A card of its own would be a fifth in a view the panel
                shows four of. */}
            <helix-meter label="Bundle budget" max={100} value={78}></helix-meter>
            <helix-flex align="center" gap="sm" wrap>
              <helix-tag tone="success">Passing</helix-tag>
              <helix-tag tone="warning">Near budget</helix-tag>
            </helix-flex>
            {/* **The chart is the card's media, which is why it is a direct
                child and carries no width of its own.** `media` is the one
                region that escapes the inset, and `media-placement="end"` puts
                it against the bottom edge rather than the top. A class setting
                `inline-size: 100%` here would win: a document rule beats a
                shadow one whatever the specificity, so it would hold the chart
                to the content width and quietly undo the bleed. The divider
                went with it, having been the thing separating the numbers from
                the chart that the bleed now separates by itself. */}
            {/* Sparkline has neither axis. Its shading is `plot`, absent being a
                line and `area` a line with the region beneath it washed, and it
                has no emphasis because there is no fill to claim more or less
                of. `wash-start` and `wash-end` in its stylesheet are the
                gradient's own parts rather than an attribute anything can
                set. */}
            <helix-sparkline
              label="Installs rose from 1,240 to 1,284 over seven days"
              plot="area"
              slot="media"
              values="1240 1318 1102 1291 1244 1180 1284"
            ></helix-sparkline>
          </helix-card>

          <helix-card class="showcaseCard" data-card-edge separation="outlined">
            <helix-timeline label="Release history">
              <helix-timeline-item datetime="2026-08-21T09:12" tone="success">
                <helix-icon name="check" slot="marker"></helix-icon>
                <span slot="time">09:12</span>
                <helix-text variant="body-strong">Contrast pass</helix-text>
              </helix-timeline-item>
              <helix-timeline-item datetime="2026-08-21T08:40">
                <span slot="time">08:40</span>
                <helix-text variant="body-strong">Tokens regenerated</helix-text>
              </helix-timeline-item>
            </helix-timeline>
          </helix-card>

          {/* **The chart reads a table, and the table is the accessible copy.**
              `for` points at it and the markup carries `data-value` beside the
              text a reader sees, so the numbers exist as numbers whether or not
              anything draws them. The table is hidden visually and not from a
              screen reader, which is the whole reason the component takes this
              shape rather than an array of values. */}
          <helix-card class="showcaseCard" data-card-edge separation="outlined">
            <helix-flex direction="column" gap="md">
              {/* **Two value columns, which is all a grouped bar chart is.**
                  The component reads every column the table plots and draws one
                  column per series inside each category's slot, dividing the
                  slot's width by however many there are. Nothing here says
                  "group": the shape of the table is the shape of the chart, and
                  the two domains version independently, so a quarter really
                  does have two numbers rather than one split in half. */}
              <table data-hidden-visually id="showcase-releases">
                <caption>Releases by quarter</caption>
                <thead>
                  <tr>
                    <th scope="col">Quarter</th>
                    <th scope="col">Helix</th>
                    <th scope="col">Cortex</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Q1</th>
                    <td data-value="18">18</td>
                    <td data-value="6">6</td>
                  </tr>
                  <tr>
                    <th scope="row">Q2</th>
                    <td data-value="31">31</td>
                    <td data-value="9">9</td>
                  </tr>
                  <tr>
                    <th scope="row">Q3</th>
                    <td data-value="24">24</td>
                    <td data-value="7">7</td>
                  </tr>
                  <tr>
                    <th scope="row">Q4</th>
                    <td data-value="39">39</td>
                    <td data-value="12">12</td>
                  </tr>
                </tbody>
              </table>
              {/* `wash` and `emphasis` are two axes, not one: the wash is how a
                  bar is shaded and the emphasis is how much ink it claims.
                  Outlined bars with a
                  gradient in them read as a chart rather than as a block of
                  color, which is what a showcase wants. */}
              <helix-bar-chart
                class={styles.showcaseBars}
                emphasis="outlined"
                for="showcase-releases"
                wash="gradient"
              ></helix-bar-chart>
              {/* Two series need saying which is which, and the default
                  `entries` is the one that names columns, which is what these
                  are. */}
              <helix-legend for="showcase-releases"></helix-legend>
            </helix-flex>
          </helix-card>

          {/* Beside the bars, which is where the right column ran out of
              cards. A ring rather than a second line: it answers shares where
              the sparkline above answers trend, so the two are not one chart
              drawn twice. */}
          <helix-card class="showcaseCard" data-card-edge separation="outlined">
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
              {/* **The names beside the ring, not under it.** A ring at 8rem in a
                  cell twice that wide left the whole right half empty, and a
                  legend is the one thing that belongs there: it reads the same
                  table the chart does, through the same `for`, so the two
                  cannot disagree about how many slices there are or what they
                  are called. `entries="categories"` is the donut shape: its
                  slices are the table's rows, where the default names the
                  columns, which is what a line or a bar chart draws. Left at
                  the default it produced a single entry reading "Downloads",
                  the value column's own header. */}
              <helix-flex align="center" gap="lg">
                <helix-donut-chart
                  class={styles.showcaseRing}
                  for="showcase-sources"
                ></helix-donut-chart>
                <helix-legend entries="categories" for="showcase-sources"></helix-legend>
              </helix-flex>
            </helix-flex>
          </helix-card>

          {/* **Four cards, because the panel shows two rows.** Measured at
              1512x1080: the views area is 433px tall and these two rows come to
              exactly that. A fifth card is not a fifth card, it is a card that
              renders for nobody. A Packages table is the one worth adding first
              if this panel ever gets taller, being the only place a table and a
              sparkline would appear together. */}
        </div>

        <div className={styles.showcaseView} hidden={view !== 'surfaces'}>
          {/* Flat, like the code block. `Callout` already draws its own band:
              a tinted ground, a rule and an icon down the side. A card around
              it is a second surface a few pixels outside the first, and the two
              edges argue about which one is the callout. */}
          <helix-callout class={styles.showcaseWide} tone="info">
            <helix-text slot="title" variant="body-strong">
              Nothing here needs us to keep running
            </helix-text>
            The packages install from npm and ship as custom elements.
          </helix-callout>

          <helix-code-block label="Install Helix">
            {"bun add @fusion.dev/helix\nimport '@fusion.dev/helix/card'"}
          </helix-code-block>

          <helix-card class="showcaseCard" data-card-edge separation="outlined">
            <helix-flex direction="column" gap="md">
              <helix-flex align="center" gap="sm" justify="between" wrap>
                <helix-avatar-group>
                  <helix-avatar name="Ada Whitfield"></helix-avatar>
                  <helix-avatar name="Grace Nakamura"></helix-avatar>
                  <helix-avatar name="Lin Ortega"></helix-avatar>
                </helix-avatar-group>
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
          <helix-card class="showcaseCard" data-card-edge separation="outlined">
            <helix-accordion mode="single">
              {/* `default-open`, not `open`: writing `open` is a claim of
                  ownership, and the generated types refuse it without a handler
                  or a ref for exactly that reason. This seeds it and leaves the
                  element to run itself. */}
              <helix-accordion-item>
                <span slot="summary">What ships</span>
                Custom elements, a stylesheet, and the types. No runtime beyond the components
                themselves.
              </helix-accordion-item>
              <helix-accordion-item default-open>
                <span slot="summary">What it needs</span>A browser. The elements upgrade on import
                and render on a server without one.
              </helix-accordion-item>
            </helix-accordion>
          </helix-card>

          <helix-card class="showcaseCard" data-card-edge separation="outlined">
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
