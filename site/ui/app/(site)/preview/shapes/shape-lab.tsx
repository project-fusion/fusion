'use client'

import { useState } from 'react'
import { DEFAULT_PARAMS, SHAPES, ShapeField, type ShapeParams } from './shape-field'

/**
 * One knob, described where the control is built rather than where it is used.
 *
 * `step` is authored per knob rather than derived from the range, because the
 * useful grain is a property of what the knob does: a degree of tilt is a
 * degree, and a hundredth of a bloom is not worth dragging through.
 */
interface Knob {
  key: keyof ShapeParams
  label: string
  max: number
  min: number
  step: number
}

const KNOBS: Knob[] = [
  { key: 'tilt', label: 'Tilt', max: 90, min: -90, step: 1 },
  { key: 'speed', label: 'Speed', max: 3, min: 0, step: 0.05 },
  { key: 'scale', label: 'Scale', max: 3, min: 0.3, step: 0.05 },
  { key: 'bloom', label: 'Bloom', max: 1, min: 0, step: 0.02 },
  { key: 'gain', label: 'Gain', max: 2.5, min: 0.2, step: 0.05 },
  { key: 'pointer', label: 'Pointer', max: 1, min: 0, step: 0.05 },
]

/**
 * The bench: a shape switcher, six knobs, and the field they drive.
 *
 * **The new value comes from `event.detail`, never from the element.** Every
 * control here declares `value` or `checked`, which is a claim of ownership:
 * the element announces the change and applies nothing until it is answered, so
 * at the moment it dispatches, its own property still holds the *old* value.
 * Reading `event.target.value` set the state to what it already was, and the
 * bench looked as though clicking a shape did nothing at all.
 *
 * **Slider announces `helix-input`, not `helix-change`.** It is one of the five
 * continuous controls, so it reports every edit rather than a committed step,
 * which is what a knob driving a live shader wants: the field moves under the
 * thumb instead of when it is let go.
 *
 * A client component because the choice is state, and the smallest one that can
 * be: the page around it stays a server component.
 */
export function ShapeLab(): React.ReactElement {
  const [shape, setShape] = useState(0)
  const [interactive, setInteractive] = useState(true)
  const [params, setParams] = useState<ShapeParams>(DEFAULT_PARAMS)
  const current = SHAPES[shape]

  return (
    <section className="shapeStage">
      <ShapeField interactive={interactive} params={params} shape={shape} />
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
                  setParams((held) => ({ ...held, [knob.key]: next }))
                }}
                show-value
                step={knob.step}
                value={String(params[knob.key])}
              ></helix-slider>
            ))}
          </helix-grid>

          <helix-flex data-density="sm" slot="footer">
            <button data-button="subtle" onClick={() => setParams(DEFAULT_PARAMS)} type="button">
              Reset
            </button>
          </helix-flex>
        </helix-card>
      </helix-flex>
    </section>
  )
}
