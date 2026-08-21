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
  { key: 'tilt', label: 'Tilt', max: 90, min: -90, step: 1 },
  { key: 'speed', label: 'Speed', max: 3, min: 0, step: 0.05 },
  { key: 'scale', label: 'Scale', max: 3, min: 0.3, step: 0.05 },
  { key: 'bloom', label: 'Bloom', max: 1, min: 0, step: 0.02 },
  { key: 'gain', label: 'Gain', max: 2.5, min: 0.2, step: 0.05 },
  { key: 'drift', label: 'Drift', max: 1, min: 0, step: 0.05 },
  { key: 'reach', label: 'Reach', max: 2, min: 0, step: 0.05 },
] as const

type Knob = (typeof KNOBS)[number]['key']

const RESTING: Record<Knob, number> = {
  bloom: 0.5,
  drift: 0,
  gain: 1,
  reach: 1,
  scale: 1,
  speed: 1,
  tilt: 14,
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
export function ShapeLab(): React.ReactElement {
  const [shape, setShape] = useState(0)
  const [interactive, setInteractive] = useState(true)
  const [knobs, setKnobs] = useState(RESTING)
  const [interaction, setInteraction] = useState<(typeof INTERACTIONS)[number]>('native')
  const current = SHAPES[shape]

  return (
    <section className="shapeStage">
      <div className="shapeCanvasFrame">
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
        ></helix-aura>
      </div>
      <div className="shapeScrim" />

      <helix-flex class="shell shapeShell" direction="column" gap="xl">
        <helix-flex direction="column" gap="sm">
          <helix-text appearance="label" tone="subtle">
            Shape bench
          </helix-text>
          <helix-text as="h1" class="heroTitle">
            {current?.name}
          </helix-text>
          <helix-text as="p" class="heroLede measure" tone="muted">
            {current?.body}
          </helix-text>
        </helix-flex>

        <helix-flex align="end" gap="xl" wrap>
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

          <helix-switch
            checked={interactive}
            label="Follow the pointer"
            onhelix-toggle={(event: CustomEvent<{ checked: boolean }>) => {
              setInteractive(event.detail.checked)
            }}
          ></helix-switch>
        </helix-flex>

        <helix-card appearance="outlined" class="shapeKnobs">
          <helix-grid gap="lg" min="13rem">
            {KNOBS.map((knob) => (
              <helix-slider
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

          <helix-flex data-density="sm" slot="footer">
            <button data-button="subtle" onClick={() => setKnobs(RESTING)} type="button">
              Reset
            </button>
          </helix-flex>
        </helix-card>
      </helix-flex>
    </section>
  )
}
