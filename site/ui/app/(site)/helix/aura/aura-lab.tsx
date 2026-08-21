'use client'

import { useState } from 'react'

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
    body: 'One beam split into an ordered spread. The pointer is the prism.',
    name: 'prism',
  },
  {
    body: 'Light travelling in lanes, at speed. The pointer is an obstacle to bow around.',
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
] as const

/** What the pointer can be asked to do instead of the shape's own answer. */
const INTERACTIONS = ['native', 'light', 'shadow', 'ripple', 'none'] as const

/** Every knob, and the grain that is useful for what it does. */
const KNOBS = [
  /* A full turn, because a shape has a direction and half a turn cannot
     reverse it: streaks travelling down the frame only come from the top at
     180, which the old range could not reach. */
  { key: 'tilt', label: 'Tilt', max: 180, min: -180, step: 1 },
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
const VARIES = new Set(['aurora', 'particles', 'prism', 'rays', 'streaks'])

type Knob = (typeof KNOBS)[number]['key']

const RESTING: Record<Knob, number> = {
  bloom: 0.5,
  drift: 0,
  gain: 1,
  reach: 1,
  scale: 1,
  speed: 1,
  tilt: 14,
  variance: 1,
}

/**
 * The bench, now driving `helix-aura` rather than a second copy of it.
 *
 * The shader moved into `helix/web`, so this page is a consumer like any other
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
          shape={current?.name}
          speed={knobs.speed}
          tilt={knobs.tilt}
          variance={knobs.variance}
        ></helix-aura>
      </div>
      <div className="auraScrim" />

      <helix-flex class="shell auraShell" direction="column" gap="xl">
        <helix-flex direction="column" gap="sm">
          <helix-text appearance="label" tone="subtle">
            Helix. Aura
          </helix-text>
          <helix-text as="h1" class="heroTitle">
            {current?.name}
          </helix-text>
          <helix-text as="p" class="heroLede measure" tone="muted">
            {current?.body}
          </helix-text>
        </helix-flex>
      </helix-flex>

      {/* One bar, fixed to the bottom, and the parameters behind a trigger.
          
          The controls used to sit in the flow directly under the copy, which
          put nine sliders across the middle of the thing they were adjusting:
          a reader tuning bloom could not see most of what bloom was doing. A
          bar leaves the field whole, and a popover means the seven numbers are
          only on screen while somebody is using them. */}
      <div className="auraBar">
        <helix-flex class="auraBarInner" direction="column" gap="md">
          <helix-toggle-group
            appearance="filled"
            label="Shape"
            onhelix-change={(event: CustomEvent<{ value: string }>) => {
              const next = SHAPES.findIndex((entry) => entry.name === event.detail.value)
              if (next >= 0) {
                setShape(next)
              }
            }}
            value={current?.name}
          >
            {SHAPES.map((entry) => (
              <helix-toggle key={entry.name} value={entry.name}>
                {entry.name}
              </helix-toggle>
            ))}
          </helix-toggle-group>

          <helix-flex align="center" gap="lg" justify="between" wrap>
            <helix-toggle-group
              appearance="filled"
              label="Pointer"
              onhelix-change={(event: CustomEvent<{ value: string }>) => {
                const next = INTERACTIONS.find((one) => one === event.detail.value)
                if (next) {
                  setInteraction(next)
                }
              }}
              value={interaction}
            >
              {INTERACTIONS.map((one) => (
                <helix-toggle key={one} value={one}>
                  {one}
                </helix-toggle>
              ))}
            </helix-toggle-group>

            <helix-flex align="center" data-density="sm" gap="lg" wrap>
              <helix-switch
                checked={interactive}
                label="Follow"
                onhelix-toggle={(event: CustomEvent<{ checked: boolean }>) => {
                  setInteractive(event.detail.checked)
                }}
              ></helix-switch>

              <button data-button="subtle" onClick={() => setKnobs(RESTING)} type="button">
                Reset
              </button>
            </helix-flex>
          </helix-flex>

          {/* 7.5rem, not 8.5: the bar is one flat row and an eighth knob has to fit
              in it. At 1280 the grid is 1184 wide and auto-fit gave seven tracks
              of 148.57, so variance wrapped and the bar grew from 235 to 302.
              Eight tracks and seven 24px gaps leave 127 apiece, so the floor has
              to sit under that. */}
          <helix-grid class="auraKnobs" data-density="sm" gap="lg" min="7.5rem">
            {KNOBS.map((knob) => (
              <helix-slider
                disabled={
                  (knob.key === 'variance' && !VARIES.has(current?.name ?? '')) || undefined
                }
                key={knob.key}
                label={knob.label}
                max={knob.max}
                min={knob.min}
                onhelix-input={(event: CustomEvent<{ value: string }>) => {
                  const next = Number(event.detail.value)
                  setKnobs((held) => ({ ...held, [knob.key]: next }))
                }}
                show-value
                step={knob.step}
                value={String(knobs[knob.key])}
              ></helix-slider>
            ))}
          </helix-grid>
        </helix-flex>
      </div>
    </section>
  )
}
