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
 */
const VIEWS = [
  { label: 'Controls', name: 'controls' },
  { label: 'Data', name: 'data' },
  { label: 'Surfaces', name: 'surfaces' },
] as const

type View = (typeof VIEWS)[number]['name']

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
        {view === 'controls' ? (
          <>
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

            {/* One shape cloned into every position, which is what the mark
                slot does. Five different faces would be a radio group rather
                than a rating, the marks in a rating being one shape by
                construction. */}
            <helix-card appearance="outlined" class="showcaseCard">
              <helix-rating default-value="4" label="How did that go" show-value>
                <svg aria-hidden="true" fill="currentColor" slot="mark" viewBox="0 0 24 24">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16ZM9 9a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 9 9Zm6 0a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 15 9Zm-6.2 5.2h6.4a3.4 3.4 0 0 1-6.4 0Z" />
                </svg>
              </helix-rating>
            </helix-card>
          </>
        ) : null}

        {view === 'data' ? (
          <>
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
          </>
        ) : null}

        {view === 'surfaces' ? (
          <>
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
          </>
        ) : null}
      </div>
    </div>
  )
}
