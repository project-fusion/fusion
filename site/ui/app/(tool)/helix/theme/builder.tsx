'use client'

import { deriveTheme, type ThemeIntent, toCss } from '@helix-io/theme'
import { useEffect, useMemo, useState } from 'react'
import './theme.css'

/** Where a reader starts, and what the reset goes back to. */
const BRAND = '#3b82f6'

/**
 * The selector the emitted block is written for.
 *
 * **The preview is styled by exactly the CSS the page is showing**, which is
 * the one property a builder has to have: what you copy is what you saw. The
 * alternative, setting properties on the node and rendering a separate string,
 * is two derivations of the same answer, and this session spent most of its
 * time finding bugs of exactly that shape.
 */
const SCOPE = '.themePreview'

type Mechanism = 'border' | 'fill' | 'shadow' | 'space'

export function ThemeBuilder() {
  const [brand, setBrand] = useState(BRAND)
  const [scheme, setScheme] = useState<'dark' | 'light'>('light')
  const [contrastTarget, setContrastTarget] = useState(4.5)
  const [chromaScale, setChromaScale] = useState(100)
  const [accentHue, setAccentHue] = useState(180)
  const [density, setDensity] = useState(100)
  const [radius, setRadius] = useState(50)
  const [allowance, setAllowance] = useState(0)
  const [surface, setSurface] = useState<Mechanism>('border')
  const [floating, setFloating] = useState<Mechanism>('shadow')

  const intent: ThemeIntent = useMemo(
    () => ({
      accent: { from: 'brand', rotate: accentHue },
      brand,
      chroma: { scale: chromaScale / 100 },
      contrastTarget,
      density: density / 100,
      radius: radius / 100,
      scheme,
      separation: { floating: floating as 'border' | 'fill' | 'shadow', surface },
      status: { allowance },
    }),
    [
      accentHue,
      allowance,
      brand,
      chromaScale,
      contrastTarget,
      density,
      floating,
      radius,
      scheme,
      surface,
    ],
  )

  /* Derived on every change, which is affordable because it is a few hundred
     lines of colour math rather than a request. `violations` is the whole
     product, so it has to be as live as the swatches are. */
  const theme = useMemo(() => deriveTheme(intent), [intent])
  const css = useMemo(() => toCss(theme, SCOPE), [theme])

  /* **Injected rather than applied per property.** A `<style>` carrying the
     emitted block is the same code path as a consumer pasting it into their
     own stylesheet, so the preview cannot drift from the artifact. */
  useEffect(() => {
    const tag = document.createElement('style')
    tag.textContent = css
    document.head.append(tag)
    return () => tag.remove()
  }, [css])

  const counts = theme.pairings.reduce<Record<string, number>>(
    (all, pair) => ({ ...all, [pair.status]: (all[pair.status] ?? 0) + 1 }),
    {},
  )
  const failures = theme.pairings.filter((pair) => pair.status === 'fail')
  const unmeasured = theme.pairings.filter((pair) => pair.status === 'unverifiable')

  return (
    <div className="themeBuilder">
      <section className="themeControls">
        <helix-flex direction="column" gap="lg">
          <helix-flex direction="column" gap="xs">
            <helix-text appearance="label" as="h1">
              Theme builder
            </helix-text>
            <helix-text appearance="muted">
              Describe a brand. Every pair the palette produces is measured against the ground it
              lands on.
            </helix-text>
          </helix-flex>

          <helix-color-input
            label="Brand"
            name="brand"
            onhelix-change={(event: CustomEvent<{ value: string }>) => setBrand(event.detail.value)}
            value={brand}
          ></helix-color-input>

          <helix-select
            label="Colour scheme"
            name="scheme"
            onhelix-change={(event: CustomEvent<{ value: string }>) =>
              setScheme(event.detail.value as 'dark' | 'light')
            }
            value={scheme}
          >
            <helix-icon name="caret-down" slot="indicator"></helix-icon>
            <helix-option value="light">Light</helix-option>
            <helix-option value="dark">Dark</helix-option>
          </helix-select>

          <helix-select
            label="Contrast target"
            name="contrast"
            onhelix-change={(event: CustomEvent<{ value: string }>) =>
              setContrastTarget(Number(event.detail.value))
            }
            value={String(contrastTarget)}
          >
            <helix-icon name="caret-down" slot="indicator"></helix-icon>
            <helix-option value="4.5">4.5, WCAG AA</helix-option>
            <helix-option value="7">7, WCAG AAA</helix-option>
          </helix-select>

          <helix-slider
            label="Saturation"
            max={100}
            min={0}
            name="chroma"
            onhelix-input={(event: CustomEvent<{ value: number }>) =>
              setChromaScale(event.detail.value)
            }
            show-value
            step={5}
            value={chromaScale}
          ></helix-slider>

          <helix-slider
            label="Accent angle"
            max={360}
            min={0}
            name="accent"
            onhelix-input={(event: CustomEvent<{ value: number }>) =>
              setAccentHue(event.detail.value)
            }
            show-value
            step={15}
            value={accentHue}
          ></helix-slider>

          <helix-slider
            label="Density"
            max={120}
            min={80}
            name="density"
            onhelix-input={(event: CustomEvent<{ value: number }>) =>
              setDensity(event.detail.value)
            }
            show-value
            step={5}
            value={density}
          ></helix-slider>

          <helix-slider
            label="Corner radius"
            max={150}
            min={0}
            name="radius"
            onhelix-input={(event: CustomEvent<{ value: number }>) => setRadius(event.detail.value)}
            show-value
            step={10}
            value={radius}
          ></helix-slider>

          {/* The repair rather than the report. A status may rotate within its
              meaning to clear a role it cannot be told apart from, and it keeps
              its own hue when no rotation inside the allowance clears one: a
              warning that has stopped looking like a warning and still collides
              is worse than one that only collides. */}
          <helix-slider
            label="Status hue allowance"
            max={60}
            min={0}
            name="allowance"
            onhelix-input={(event: CustomEvent<{ value: number }>) =>
              setAllowance(event.detail.value)
            }
            show-value
            step={10}
            value={allowance}
          ></helix-slider>

          {/* Two policies rather than one, because the two kinds of surface are
              not the same problem: a card sits on a ground the theme knows and a
              menu floats over whatever the reader scrolled under it. `space` is
              offered here and refused there for that reason. */}
          <helix-toggle-group
            label="Separation, in flow"
            onhelix-change={(event: CustomEvent<{ value: string }>) =>
              setSurface(event.detail.value as Mechanism)
            }
            value={surface}
          >
            <helix-toggle value="border">Border</helix-toggle>
            <helix-toggle value="shadow">Shadow</helix-toggle>
            <helix-toggle value="fill">Fill</helix-toggle>
            <helix-toggle value="space">Space</helix-toggle>
          </helix-toggle-group>

          <helix-toggle-group
            label="Separation, floating"
            onhelix-change={(event: CustomEvent<{ value: string }>) =>
              setFloating(event.detail.value as Mechanism)
            }
            value={floating}
          >
            <helix-toggle value="shadow">Shadow</helix-toggle>
            <helix-toggle value="border">Border</helix-toggle>
            <helix-toggle value="fill">Fill</helix-toggle>
          </helix-toggle-group>
        </helix-flex>
      </section>

      <section className="themeResult">
        {/* `data-helix-theme` and not only the class: the emitted block sets the
            values, and the attribute is what makes `helix/styles` re-run its own
            declarations here so the series ramp and the scales re-derive. */}
        <div className="themePreview" data-helix-theme>
          <helix-flex direction="column" gap="lg">
            <helix-card>
              <helix-flex direction="column" gap="md">
                <helix-text as="h2">A card on the page</helix-text>
                <helix-text>
                  Body text on a surface, which is one of the pairs measured below rather than one
                  anybody eyeballed.
                </helix-text>
                <helix-flex gap="sm">
                  <helix-button appearance="solid" tone="primary">
                    Primary
                  </helix-button>
                  <helix-button appearance="solid" tone="accent">
                    Accent
                  </helix-button>
                  <helix-button appearance="outlined">Outlined</helix-button>
                  <helix-button appearance="solid" tone="danger">
                    Danger
                  </helix-button>
                </helix-flex>
              </helix-flex>
            </helix-card>

            <helix-flex gap="sm">
              <helix-tag tone="primary">Primary</helix-tag>
              <helix-tag tone="accent">Accent</helix-tag>
              <helix-tag tone="success">Success</helix-tag>
              <helix-tag tone="warning">Warning</helix-tag>
              <helix-tag tone="danger">Danger</helix-tag>
              <helix-tag tone="info">Info</helix-tag>
            </helix-flex>

            <helix-callout tone="info">
              <helix-text>A callout, which is a tinted ground carrying its own ink.</helix-text>
            </helix-callout>
          </helix-flex>
        </div>

        <div className="themeAudit">
          <helix-flex direction="column" gap="md">
            <helix-flex align="center" gap="sm">
              <helix-text appearance="label">The audit</helix-text>
              <helix-tag tone={failures.length > 0 ? 'danger' : 'success'}>
                {counts.pass ?? 0} pass
              </helix-tag>
              {failures.length > 0 ? (
                <helix-tag tone="danger">{failures.length} fail</helix-tag>
              ) : null}
              {unmeasured.length > 0 ? (
                <helix-tag tone="neutral">{unmeasured.length} unverifiable</helix-tag>
              ) : null}
            </helix-flex>

            <helix-text appearance="muted">
              Every pair the surface model declares, measured against the ground it lands on rather
              than against the page alone. Unverifiable is not a softer failure: it means the ground
              is not knowable, which is what a caption over a photograph has.
            </helix-text>

            {failures.length > 0 ? (
              <helix-flex direction="column" gap="xs">
                {failures.map((pair) => (
                  <helix-text appearance="muted" key={`${pair.foreground}-${pair.background}`}>
                    {pair.foreground} on {pair.background}: {pair.ratio?.toFixed(2)}:1, under{' '}
                    {pair.target}:1
                  </helix-text>
                ))}
              </helix-flex>
            ) : null}

            {theme.collisions.length > 0 ? (
              <helix-callout tone="warning">
                <helix-flex direction="column" gap="xs">
                  {theme.collisions.map((collision) => (
                    <helix-text key={collision}>{collision}</helix-text>
                  ))}
                </helix-flex>
              </helix-callout>
            ) : null}

            <helix-text appearance="label">The artifact</helix-text>
            <helix-code-block language="css">{css}</helix-code-block>
          </helix-flex>
        </div>
      </section>
    </div>
  )
}
