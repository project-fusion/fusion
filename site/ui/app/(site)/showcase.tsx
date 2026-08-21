'use client'

import { useState } from 'react'

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

export function Showcase(): React.ReactElement {
  const [view, setView] = useState<View>('controls')

  return (
    <div className="showcaseStage">
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

      <div className="showcase">
        <div className="showcaseView" hidden={view !== 'controls'}>
          {/* A form, laid out as one. The previous version was a switch, a
                checkbox, a slider and an unlabelled bar stacked at even
                spacing, which is a pile of controls rather than a thing anybody
                would fill in. Fields first, then the two that are settings. */}
          <helix-card appearance="outlined" class="showcaseCard">
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
            <helix-flex align="center" gap="sm" wrap>
              <helix-button appearance="solid" tone="primary">
                Primary
              </helix-button>
              <helix-button>Secondary</helix-button>
              <helix-button appearance="subtle">Subtle</helix-button>
              <helix-kbd>Cmd K</helix-kbd>
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
          <helix-card appearance="outlined" class="showcaseCard">
            <helix-flex direction="column" gap="md">
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
              <helix-divider></helix-divider>
              <helix-sparkline
                class="showcaseTrendLine"
                label="Installs rose from 1,240 to 1,284 over seven days"
                values="1240 1318 1102 1291 1244 1180 1284"
              ></helix-sparkline>
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
        </div>

        <div className="showcaseView" hidden={view !== 'surfaces'}>
          <helix-card appearance="outlined" class="showcaseCard showcaseWide">
            <helix-callout severity="info">
              <helix-text appearance="body-strong" slot="title">
                Nothing here needs us to keep running
              </helix-text>
              The packages install from npm and ship as custom elements.
            </helix-callout>
          </helix-card>

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
              <helix-progress label="Contrast pass" value={72}></helix-progress>
              <helix-meter label="Bundle budget" max={100} value={78}></helix-meter>
            </helix-flex>
          </helix-card>
        </div>
      </div>
    </div>
  )
}
