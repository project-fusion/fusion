'use client'

import { useState } from 'react'
import { HeroCopy } from '../../hero-copy'

/** The shapes on the bench, in the order the switcher lists them. */
const SHAPES = [
  {
    body: 'Two strands half a turn out of phase. A shaft at rest, a helix if you look.',
    name: 'braid',
  },
  {
    body: 'A fan from a source above the frame, broken into filaments by the same noise.',
    name: 'rays',
  },
  { body: 'Horizontal curtains, drifting. The one shape here that is a horizon.', name: 'aurora' },
  {
    body: 'Light traveling in lanes, at speed. The pointer is an obstacle to bow around.',
    name: 'streaks',
  },
  {
    body: 'Broad bands rolling under a warp. The pointer drags the crests.',
    name: 'waves',
  },
  {
    body: 'Five curves woven to a pinch, and the pointer is the pinch.',
    name: 'threads',
  },
  {
    body: 'Points adrift on their own orbits, pushed aside by the pointer.',
    name: 'particles',
  },
  {
    body: 'Ink in a viscous medium. Move the pointer and the wake outlives the gesture.',
    name: 'flow',
  },
  {
    body: 'Light through moving water, focused into a web where the surface folds.',
    name: 'caustics',
  },
  {
    body: 'A structure in perspective, lit at its joints. The one shape here that is not weather.',
    name: 'lattice',
  },
  {
    body: 'Territories, lit only where two of them meet. Nothing is drawn but the disagreements.',
    name: 'fracture',
  },
] as const

/** What the pointer can be asked to do instead of the shape's own answer. */
const INTERACTIONS = ['native', 'light', 'shadow', 'ripple', 'none'] as const

/** Every knob, and the grain that is useful for what it does. */
const KNOBS = [
  /* A full turn, because a shape has a direction and half a turn cannot
     reverse it: streaks traveling down the frame only come from the top at
     180, which the old range could not reach. */
  { key: 'tilt', label: 'Tilt', max: 180, min: -180, step: 1 },
  /* A fraction of the width, which is the property's own unit. It replaces
     `tilt` rather than joining it, so the bar offers one or the other and the
     slider under `Aim` swaps: both at once would show two live controls where
     the element only listens to one. */
  { key: 'terminus', label: 'Terminus', max: 1.5, min: -1.5, step: 0.02 },
  { key: 'speed', label: 'Speed', max: 3, min: 0, step: 0.05 },
  { key: 'scale', label: 'Scale', max: 3, min: 0.3, step: 0.05 },
  { key: 'bloom', label: 'Bloom', max: 1, min: 0, step: 0.02 },
  { key: 'gain', label: 'Gain', max: 2.5, min: 0.2, step: 0.05 },
  { key: 'drift', label: 'Drift', max: 1, min: 0, step: 0.05 },
  { key: 'reach', label: 'Reach', max: 2, min: 0, step: 0.05 },
  /* Capped at 1, which is the property's own range: past it the shader is
     extrapolating between a resting value and a random one rather than
     exaggerating, and a streak's length crosses zero. */
  { key: 'variance', label: 'Variance', max: 1, min: 0, step: 0.05 },
] as const

/**
 * Which shapes read `variance`, so the bench can say so rather than offering a
 * control that silently does nothing. The shapes made of many similar things,
 * counted or continuous: lanes, motes, a fan, bundles, bands. The four left out
 * are the three with a single subject and `threads`, which is even on purpose.
 */
const VARIES = new Set(['aurora', 'particles', 'rays', 'streaks'])

type Knob = (typeof KNOBS)[number]['key']

const AIMS = ['tilt', 'terminus'] as const

const RESTING: Record<Knob, number> = {
  bloom: 0.5,
  drift: 0,
  gain: 1,
  reach: 1,
  scale: 1,
  speed: 1,
  terminus: 0.5,
  tilt: 14,
  variance: 1,
}

/**
 * The bench, now driving `helix-aura` rather than a second copy of it.
 *
 * The shader moved into `helix/styled`, so this page is a consumer like any other
 * and the knobs are the component's own properties. That is the point of moving
 * it: tuning happens against the published surface, and anything awkward here
 * is awkward for everyone.
 *
 * **The new value comes from `event.detail`, never from the element.** Every
 * control declares `value` or `checked`, which is a claim of ownership: the
 * element announces and applies nothing until answered, so at dispatch its own
 * property still holds the old value.
 *
 * Slider announces `helix-input` rather than `helix-change`, being one of the
 * five continuous controls, so the field moves under the thumb.
 */
export function AuraLab(): React.ReactElement {
  const [shape, setShape] = useState(0)
  const [interactive, setInteractive] = useState(true)
  const [knobs, setKnobs] = useState(RESTING)
  const [interaction, setInteraction] = useState<(typeof INTERACTIONS)[number]>('native')
  /* Which of the two aiming properties is live. `terminus` overrides `tilt` on
     the element, so the bar has to choose as well: a slider for the one being
     ignored is a control that does nothing, which is the worst thing a bench
     can show. */
  const [aim, setAim] = useState<(typeof AIMS)[number]>('tilt')
  const [open, setOpen] = useState(true)
  const current = SHAPES[shape]

  return (
    <section className="auraStage">
      <div className="auraCanvasFrame">
        <helix-aura
          bloom={knobs.bloom}
          drift={knobs.drift}
          gain={knobs.gain}
          interaction={interaction === 'native' ? undefined : interaction}
          interactive={interactive || undefined}
          reach={knobs.reach}
          scale={knobs.scale}
          speed={knobs.speed}
          terminus={aim === 'terminus' ? knobs.terminus : undefined}
          tilt={aim === 'tilt' ? knobs.tilt : undefined}
          variance={knobs.variance}
          variant={current?.name}
        ></helix-aura>
      </div>
      <div className="auraScrim" />

      <helix-flex class={`auraShell`} data-shell direction="column" gap="xl">
        <helix-flex direction="column" gap="sm">
          <helix-text tone="subtle" variant="label">
            Helix. Aura
          </helix-text>
          <HeroCopy lede={current?.body} title={current?.name} />
        </helix-flex>
      </helix-flex>

      {/* One drawer, fixed to the bottom, and it collapses.

          The controls used to sit in the flow directly under the copy, which
          put nine sliders across the middle of the thing they were adjusting:
          a reader tuning bloom could not see most of what bloom was doing. A
          bar leaves the field whole. Collapsing leaves it entirely whole, which
          is what somebody looking rather than tuning wants, and the material
          stays either way so the light still reads through the strip. */}
      <div className="auraBar" data-open={open ? '' : undefined}>
        <helix-flex
          align="center"
          class="auraHandle"
          data-density="sm"
          gap="lg"
          justify="between"
          wrap
        >
          {/* The pair does not split. Together they are 1029 wide against the
              bar's 1184, so they fit; what does not fit is the pair plus the
              switch and the reset, which need another 246. Wrapping the pair
              put Shape on one line and Pointer on the next with a gap beside
              each, which reads as a mistake. Wrapping the row instead drops the
              switch and the reset to a line of their own until there is room,
              and they are still the first row of controls. */}
          {/* Wrapping, now that there are three groups rather than two.
              Measured at 1184 of bar: Shape is 781 and Pointer 375, which is
              1180 with the gap and fits by four pixels, and Aim's 177 does not.
              Dropping the smallest to its own line is what wrapping does here,
              and it is not the case the comment below rejects: that was a pair
              splitting so each half sat beside a gap, which reads as a mistake,
              where a third group on a line of its own reads as a third group. */}
          <helix-flex align="center" gap="lg" wrap>
            {/* Shape and pointer share a line. Nine toggles and five are two
                short rows rather than one long one, and the shape group is
                sized to its content instead of the full width so the pointer
                group has somewhere to sit. */}
            <helix-toggle-group
              class="auraShapes"
              label="Shape"
              label-placement="start"
              onChange={(event) => {
                const next = SHAPES.findIndex(
                  (entry) =>
                    entry.name === (event.currentTarget as HTMLElement & { value: string }).value,
                )
                if (next >= 0) {
                  setShape(next)
                }
              }}
              separation="outlined"
              value={current?.name}
            >
              {SHAPES.map((entry) => (
                <helix-toggle key={entry.name} value={entry.name}>
                  {entry.name}
                </helix-toggle>
              ))}
            </helix-toggle-group>

            <helix-toggle-group
              label="Pointer"
              label-placement="start"
              onChange={(event) => {
                const next = INTERACTIONS.find(
                  (one) => one === (event.currentTarget as HTMLElement & { value: string }).value,
                )
                if (next) {
                  setInteraction(next)
                }
              }}
              separation="outlined"
              value={interaction}
            >
              {INTERACTIONS.map((one) => (
                <helix-toggle key={one} value={one}>
                  {one}
                </helix-toggle>
              ))}
            </helix-toggle-group>

            {/* Which property aims the field. They are alternatives on the
                element, `terminus` winning wherever it is set, so they are
                alternatives here: the slider below swaps rather than a second
                one appearing beside a control the element has stopped
                reading. */}
            <helix-toggle-group
              label="Aim"
              label-placement="start"
              onChange={(event) => {
                const next = AIMS.find(
                  (one) => one === (event.currentTarget as HTMLElement & { value: string }).value,
                )
                if (next) {
                  setAim(next)
                }
              }}
              separation="outlined"
              value={aim}
            >
              {AIMS.map((one) => (
                <helix-toggle key={one} value={one}>
                  {one}
                </helix-toggle>
              ))}
            </helix-toggle-group>
          </helix-flex>

          <helix-flex align="center" class="auraActions" data-density="sm" gap="lg">
            <helix-switch
              checked={interactive}
              label="Follow"
              onChange={(event) => {
                setInteractive((event.currentTarget as HTMLElement & { checked: boolean }).checked)
              }}
            ></helix-switch>

            <button data-button="subtle" onClick={() => setKnobs(RESTING)} type="button">
              Reset
            </button>

            {/* The label carries the state, not aria-expanded. The attribute
                would sit on the host while the button it describes is in the
                shadow root, so it would announce nothing; a label that says
                which way the press goes is the part that reaches a reader, and
                the tooltip shows the same words to everybody else. */}
            <helix-tooltip content={open ? 'Collapse the parameters' : 'Expand the parameters'}>
              <helix-icon-button
                class="auraCollapse"
                label={open ? 'Collapse the parameters' : 'Expand the parameters'}
                onClick={() => setOpen((was) => !was)}
              >
                <helix-icon name="caret-down"></helix-icon>
              </helix-icon-button>
            </helix-tooltip>
          </helix-flex>
        </helix-flex>

        {/* The collapsing half. `grid-template-rows` from 1fr to 0fr is what
            animates a height nobody has measured, which is the whole reason the
            panel is a grid with one child. `visibility` rides the same
            transition so the controls leave the tab order when they are shut,
            and `allow-discrete` is what lets a discrete property take part. */}
        <div className="auraPanel">
          <helix-flex class="auraPanelInner" direction="column" gap="md">
            {/* 7.5rem, not 8.5: eight knobs have to fit one row. At 1280 the
                grid is 1184 wide and auto-fit gave seven tracks of 148.57, so
                variance wrapped and the bar grew from 235 to 302. Eight tracks
                and seven 24px gaps leave 127 apiece. */}
            <helix-grid class="auraKnobs" data-density="sm" gap="lg" min="7.5rem">
              {KNOBS.filter((knob) => !AIMS.includes(knob.key as never) || knob.key === aim).map(
                (knob) => (
                  <helix-slider
                    disabled={
                      (knob.key === 'variance' && !VARIES.has(current?.name ?? '')) || undefined
                    }
                    key={knob.key}
                    label={knob.label}
                    max={knob.max}
                    min={knob.min}
                    onInput={(event) => {
                      const next = Number(
                        (event.currentTarget as HTMLElement & { value: string }).value,
                      )
                      setKnobs((held) => ({ ...held, [knob.key]: next }))
                    }}
                    show-value
                    step={knob.step}
                    value={String(knobs[knob.key])}
                  ></helix-slider>
                ),
              )}
            </helix-grid>
          </helix-flex>
        </div>
      </div>
    </section>
  )
}
