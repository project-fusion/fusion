'use client'

import { useState } from 'react'
import { SHAPES, ShapeField } from './shape-field'

/**
 * The switcher and the field it drives.
 *
 * **The new value comes from `event.detail`, never from the element.** Both
 * controls declare `value` and `checked`, which is a claim of ownership: the
 * element announces the change and applies nothing until it is answered, so at
 * the moment it dispatches, its own property still holds the *old* value.
 * Reading `event.target.value` therefore set the state to what it already was,
 * and the bench looked as though clicking a shape did nothing at all.
 *
 * A client component because the choice is state, and the smallest one that can
 * be: the page around it stays a server component and this holds a number and a
 * boolean.
 *
 * `onhelix-change` as a prop rather than an effect. React records the handler
 * and attaches no listener while hydrating, which is why this used to need an
 * effect; `HelixElement.dispatchEvent` now reads the prop off the node and
 * binds it immediately before announcing.
 */
export function ShapeLab(): React.ReactElement {
  const [shape, setShape] = useState(0)
  const [interactive, setInteractive] = useState(true)
  const current = SHAPES[shape]

  return (
    <section className="shapeStage">
      <ShapeField interactive={interactive} shape={shape} />
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
      </helix-flex>
    </section>
  )
}
