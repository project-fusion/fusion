'use client'

import { deriveTheme, type ThemeIntent, toCss } from '@helix-io/theme'
import { useEffect, useMemo, useState } from 'react'
import { PreferencesDrawer } from '../../../preferences'
import { type Findable, SiteFind } from '../../../site-find'
import { Wordmark } from '../../../wordmark'
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

export function ThemeBuilder({ findable }: { findable: Findable[] }) {
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [brand, setBrand] = useState(BRAND)
  const [scheme, setScheme] = useState<'dark' | 'light'>('light')
  const [contrastTarget, setContrastTarget] = useState(4.5)
  const [chromaScale, setChromaScale] = useState(100)
  const [accentHue, setAccentHue] = useState(180)
  const [density, setDensity] = useState(100)
  const [radius, setRadius] = useState(50)
  const [allowance, setAllowance] = useState(20)
  const [surface, setSurface] = useState<Mechanism>('border')
  const [floating, setFloating] = useState<Mechanism>('shadow')

  /* Compared against the values the engine and the stylesheet ship with, so
     "pristine" means the reader has changed nothing rather than that they have
     returned to some arrangement this file prefers. */
  const pristine =
    brand === BRAND &&
    scheme === 'light' &&
    contrastTarget === 4.5 &&
    chromaScale === 100 &&
    accentHue === 180 &&
    density === 100 &&
    radius === 50 &&
    allowance === 20 &&
    surface === 'border' &&
    floating === 'shadow'

  const reset = (): void => {
    setBrand(BRAND)
    setScheme('light')
    setContrastTarget(4.5)
    setChromaScale(100)
    setAccentHue(180)
    setDensity(100)
    setRadius(50)
    setAllowance(20)
    setSurface('border')
    setFloating('shadow')
  }

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

  const counts = theme.pairings.reduce<Record<string, number>>((all, pair) => {
    all[pair.status] = (all[pair.status] ?? 0) + 1
    return all
  }, {})
  const failures = theme.pairings.filter((pair) => pair.status === 'fail')
  const unmeasured = theme.pairings.filter((pair) => pair.status === 'unverifiable')

  return (
    <>
      {/* The sandbox's header, not one shaped like it. Same component, same
          class, so the height, the density and the full bleed come from one
          place: two tools under the same roof that differ in their chrome are
          two tools a reader has to learn twice. */}
      <helix-app-header class="workbenchHeader">
        <a data-link="quiet" href="/" slot="start">
          <Wordmark />
        </a>
        <helix-flex align="center" gap="2xs" slot="end">
          <SiteFind findable={findable} />
          <helix-tooltip content="Preferences" placement="bottom">
            <helix-icon-button label="Preferences" onClick={() => setPrefsOpen(true)}>
              <helix-icon name="gear"></helix-icon>
            </helix-icon-button>
          </helix-tooltip>
        </helix-flex>
      </helix-app-header>

      <PreferencesDrawer onOpenChange={setPrefsOpen} open={prefsOpen} />

      {/* A splitter rather than a grid, for the reason the sandbox gives: the
          form is a pane a reader can size rather than a column at whatever
          width this file picked. The form leads because this is a place to
          write a theme, the same argument `lead="source"` makes in the
          workbench. */}
      <helix-splitter className="workbenchBody" default-position={32}>
        <section className="themeControls" slot="start">
          <helix-flex direction="column" gap="lg">
            <helix-flex direction="column" gap="xs">
              <helix-flex align="center" gap="sm" justify="between">
                <helix-text appearance="subheading" as="h1">
                  Theme builder
                </helix-text>
                <helix-tooltip content="Back to the shipped values" placement="bottom">
                  <helix-icon-button disabled={pristine || undefined} label="Reset" onClick={reset}>
                    <helix-icon name="arrow-counter-clockwise"></helix-icon>
                  </helix-icon-button>
                </helix-tooltip>
              </helix-flex>
              <helix-text appearance="caption">
                Describe a brand. Every pair the palette produces is measured against the ground it
                lands on.
              </helix-text>
            </helix-flex>

            <helix-color-input
              label="Brand"
              name="brand"
              onhelix-change={(event) => setBrand(event.detail.value)}
              value={brand}
            ></helix-color-input>

            <helix-select
              label="Colour scheme"
              name="scheme"
              onhelix-change={(event) => setScheme(event.detail.value as 'dark' | 'light')}
              value={scheme}
            >
              <helix-icon name="caret-down" slot="indicator"></helix-icon>
              <helix-option value="light">Light</helix-option>
              <helix-option value="dark">Dark</helix-option>
            </helix-select>

            <helix-select
              label="Contrast target"
              name="contrast"
              onhelix-change={(event) => setContrastTarget(Number(event.detail.value))}
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
              onhelix-input={(event) => setChromaScale(Number(event.detail.value))}
              show-value
              step={5}
              value={String(chromaScale)}
            ></helix-slider>

            <helix-slider
              label="Accent angle"
              max={360}
              min={0}
              name="accent"
              onhelix-input={(event) => setAccentHue(Number(event.detail.value))}
              show-value
              step={15}
              value={String(accentHue)}
            ></helix-slider>

            <helix-slider
              label="Density"
              max={120}
              min={80}
              name="density"
              onhelix-input={(event) => setDensity(Number(event.detail.value))}
              show-value
              step={5}
              value={String(density)}
            ></helix-slider>

            <helix-slider
              label="Corner radius"
              max={150}
              min={0}
              name="radius"
              onhelix-input={(event) => setRadius(Number(event.detail.value))}
              show-value
              step={10}
              value={String(radius)}
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
              onhelix-input={(event) => setAllowance(Number(event.detail.value))}
              show-value
              step={10}
              value={String(allowance)}
            ></helix-slider>

            {/* Two policies rather than one, because the two kinds of surface are
              not the same problem: a card sits on a ground the theme knows and a
              menu floats over whatever the reader scrolled under it. `space` is
              offered here and refused there for that reason. */}
            <helix-toggle-group
              label="Separation, in flow"
              onhelix-change={(event) => setSurface(event.detail.value as Mechanism)}
              value={surface}
            >
              <helix-toggle value="border">Border</helix-toggle>
              <helix-toggle value="shadow">Shadow</helix-toggle>
              <helix-toggle value="fill">Fill</helix-toggle>
              <helix-toggle value="space">Space</helix-toggle>
            </helix-toggle-group>

            <helix-toggle-group
              label="Separation, floating"
              onhelix-change={(event) => setFloating(event.detail.value as Mechanism)}
              value={floating}
            >
              <helix-toggle value="shadow">Shadow</helix-toggle>
              <helix-toggle value="border">Border</helix-toggle>
              <helix-toggle value="fill">Fill</helix-toggle>
            </helix-toggle-group>
          </helix-flex>
        </section>

        <section className="themeResult" slot="end">
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

              {/* **A real floating surface, because the floating policy needs
                  something to move.** Without one, half the separation control
                  was a knob with nothing under it: the preview held a card, a
                  callout and some tags, every one of them in the flow. Held
                  open, since a reader here is comparing surfaces rather than
                  operating a menu. */}
              {/* `default-open`, not `open`: declaring `open` claims ownership and the
                  component then announces and applies nothing until it is
                  answered, which is the controlled contract the generated types
                  enforce. Seeded, it opens once and a reader may still close
                  it. */}
              <helix-popover default-open placement="bottom-start">
                <helix-button appearance="outlined" slot="trigger">
                  A floating panel
                </helix-button>
                <helix-flex direction="column" gap="sm">
                  <helix-text appearance="label">Over the page</helix-text>
                  <helix-text>
                    Told apart from whatever is behind it, which is why its separation is a
                    different policy from the card's.
                  </helix-text>
                </helix-flex>
              </helix-popover>

              <helix-flex gap="sm">
                <helix-tag tone="primary">Primary</helix-tag>
                <helix-tag tone="accent">Accent</helix-tag>
                <helix-tag tone="success">Success</helix-tag>
                <helix-tag tone="warning">Warning</helix-tag>
                <helix-tag tone="danger">Danger</helix-tag>
                <helix-tag tone="info">Info</helix-tag>
              </helix-flex>

              <helix-callout severity="info">
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

              <helix-text appearance="caption">
                Every pair the surface model declares, measured against the ground it lands on
                rather than against the page alone. Unverifiable is not a softer failure: it means
                the ground is not knowable, which is what a caption over a photograph has.
              </helix-text>

              {failures.length > 0 ? (
                <helix-flex direction="column" gap="xs">
                  {failures.map((pair) => (
                    <helix-text appearance="caption" key={`${pair.foreground}-${pair.background}`}>
                      {pair.foreground} on {pair.background}: {pair.ratio?.toFixed(2)}:1, under{' '}
                      {pair.target}:1
                    </helix-text>
                  ))}
                </helix-flex>
              ) : null}

              {theme.collisions.length > 0 ? (
                <helix-callout severity="warning">
                  <helix-flex direction="column" gap="xs">
                    {theme.collisions.map((collision) => (
                      <helix-text key={collision}>{collision}</helix-text>
                    ))}
                  </helix-flex>
                </helix-callout>
              ) : null}

              <helix-text appearance="label">The artifact</helix-text>
              <helix-code-block label="theme.css">{css}</helix-code-block>
            </helix-flex>
          </div>
        </section>
      </helix-splitter>
    </>
  )
}
