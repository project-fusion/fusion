'use client'

import { deriveTheme, hexToOklch, type ThemeIntent, toCss } from '@helix-io/theme'
import { useEffect, useMemo, useState } from 'react'
import { PreferencesDrawer } from '../../../preferences'
import { type Findable, SiteFind } from '../../../site-find'
import { Wordmark } from '../../../wordmark'
import '@helix-io/sandbox/editor'
import { ThemedPage } from './themed-page'
import './theme.css'

/** Where a reader starts, and what the reset goes back to. */
const BRAND = '#3b82f6'

/**
 * The selector the emitted block is written for.
 *
 * **A data attribute rather than a class**, because this is not styling: it
 * names *which theme* a subtree is in, the same way `data-helix-theme` names
 * that a subtree is themed at all and `data-color-mode` names which half of
 * `light-dark()` resolves. A class would say the preview looks a certain way,
 * where the attribute says it is a particular theme, and the emitted block is
 * about the second.
 *
 * **The preview is styled by exactly the CSS the page is showing**, which is
 * the one property a builder has to have: what you copy is what you saw. The
 * alternative, setting properties on the node and rendering a separate string,
 * is two derivations of the same answer, and this session spent most of its
 * time finding bugs of exactly that shape.
 */
const SCOPE = '[data-theme="preview"]'

/**
 * What share of the stage the preview starts with.
 *
 * **`split` follows the lead pane, not the source pane**, which is worth
 * knowing because the manifest says otherwise: its description reads
 * "percentage of the sandbox given to the source pane", and measured with
 * `lead="preview"` a split of 32 gave the *preview* 32 per cent. The area
 * rules have it right, that `split` means the same thing in both directions.
 *
 * The artifact is a column of custom properties whose longest line is a token
 * name and a hex, so it wants a third and the preview wants the rest.
 */
const PREVIEW_SHARE = 68

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
  const [split, setSplit] = useState(PREVIEW_SHARE)
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

  /* **The ramps are inline, because a stylesheet cannot know the brand.** Both
     are written in OKLCH off the derived primary so the track and the palette
     agree: a saturation ramp drawn in sRGB would promise a colour the engine
     never produces. */
  const channelRamps = useMemo((): React.CSSProperties => {
    const primary = theme.tokens.find((token) => token.name === 'color-primary')?.value
    if (!primary) {
      return {}
    }
    const { chroma, hue, lightness } = primary
    const wheel = Array.from(
      { length: 13 },
      (_, step) => `oklch(${lightness} ${chroma} ${(hue + step * 30) % 360})`,
    ).join(', ')

    return {
      '--theme-accent-ramp': `linear-gradient(to right, ${wheel})`,
      '--theme-saturation-ramp': `linear-gradient(to right, oklch(${lightness} 0 ${hue}), oklch(${lightness} ${chroma} ${hue}))`,
    } as React.CSSProperties
  }, [theme])
  const css = useMemo(() => toCss(theme, SCOPE), [theme])

  /* **Lightness only, and in whichever direction reaches the target.** The
     solver moves one component: a brand keeps its hue and its chroma and gives
     up its lightness. Which way it gives it up depends on where the brand
     started, and the first version of this said "Darkened" unconditionally,
     which was a lie for every brand that began too dark: `#2e394a` comes back
     *lighter* and the label still claimed it had been darkened.

     Comparing hexes would report a move on a rounding difference, so the
     comparison is on lightness and the threshold is what a reader could see. */
  const derived = theme.tokens.find((token) => token.name === 'color-primary')
  const derivedPrimary = derived?.hex ?? brand
  const shift = (derived?.value.lightness ?? 0) - hexToOklch(brand).lightness
  const moved = Math.abs(shift) > 0.06

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

      {/* A splitter for the form, and `helix-sandbox` for everything else.

          **The same component the workbench uses**, rather than a grid shaped
          like it. It already owns the two-pane split, the collapsible bottom
          panel, the toolbar row and the separators a keyboard can move, and all
          of that was going to be rebuilt here badly. What it does not carry is
          file tabs, because a theme has one artifact and not four. */}
      <helix-splitter className="workbenchBody" default-position={24}>
        <section className="themeControls" slot="start" style={channelRamps}>
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

            {/* **What the brand became, and why, because the gap surprises
                everybody once.** Pick a bright yellow at AAA and the button
                comes out olive: the hue and the chroma are kept and only the
                lightness moves, because a fill that light cannot carry legible
                text and cannot clear a near-white page at the same time.

                Shown only when it actually moved, and only by enough to notice.
                A swatch that always says "and here is the same colour again" is
                a row of chrome nobody reads. */}
            {/* **Not a callout.** A callout is an interruption with a severity
                and an icon, and this is neither: it is a caption under the
                field it is about, saying what happened to the value that was
                just typed. As a callout it read as a warning about a normal
                thing, and its icon and inset crowded a quarter-width pane until
                the sentence wrapped four times.

                So: the two swatches on their own line, at a size worth looking
                at, and the reason under them. */}
            {moved ? (
              <div className="themeShift" key={shift > 0 ? 'up' : 'down'}>
                <div className="themeShiftPair">
                  <span className="themeSwatch" style={{ background: brand }} />
                  <span className="themeShiftArrow" />
                  <span className="themeSwatch" style={{ background: derivedPrimary }} />
                </div>
                <helix-text appearance="caption">
                  {shift > 0 ? 'Lightened' : 'Darkened'} to clear {contrastTarget}:1. Hue and chroma
                  are kept.
                </helix-text>
              </div>
            ) : null}

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
              {/* **3:1 is a real target, not a lesser one.** WCAG 1.4.11 asks it
                  of a graphic or a control's own boundary, and 1.4.3 asks it of
                  large text, which is 24px or 18.66px bold. A theme built for a
                  display face answers to it, and holding such a theme to 4.5
                  darkens every brand for text that is never set that small. */}
              <helix-option value="3">3, AA for large text and controls</helix-option>
              <helix-option value="4.5">4.5, AA</helix-option>
              <helix-option value="7">7, AAA</helix-option>
            </helix-select>

            {/* **Painted through `--slider-track-image`, the hook Slider already
                publishes for exactly this.** `ColorPicker` paints its own hue
                and alpha channels the same way and is itself built out of
                `helix-slider`, so a colour channel is a slider with a ramp on it
                rather than a component of its own: it adds no behaviour, no
                state and no API, which is the test for whether something earns
                an element.

                The ramp is the value it chooses. Saturation runs from grey to
                the brand at full chroma, both ends at the brand's own lightness
                and hue, so the track shows what the slider will produce. */}
            <helix-slider
              className="themeChannel"
              label="Saturation"
              max={100}
              min={0}
              name="chroma"
              onhelix-input={(event) => setChromaScale(Number(event.detail.value))}
              show-value
              step={5}
              value={String(chromaScale)}
            ></helix-slider>

            {/* The whole wheel, starting at the brand, so a reader is choosing
                a direction off their own colour and not an abstract number. */}
            <helix-slider
              className="themeChannel"
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

        <div className="themeStage" slot="end">
          {/* `lead="preview"` because this is a place to look. The workbench
              leads with its source, being a place to write; here the artifact is
              an output rather than an input and a reader is judging a palette,
              not editing CSS. */}
          {/* **The artifact is a column of custom properties**, so its longest
              line is a token name and a hex, so it wants a third of the stage
              and the preview wants the rest. See `PREVIEW_SHARE` for which pane
              the number is actually about, which is not what the manifest says.

              Held as state and written back on settle, which is the workbench's
              pattern and is necessary rather than tidy: `Sandbox` owns `split`
              and writes it back on every drag, so a bare prop would be reapplied
              by the next render and undo the reader's drag. `default-split` is
              not the lever either, being what a *reset* returns to. */}
          <helix-sandbox
            corner-label="Preview, artifact and audit"
            default-split={PREVIEW_SHARE}
            lead="preview"
            onhelix-change={(event) => {
              if (event.detail.property === 'split') {
                setSplit((event.target as HTMLElement & { split: number }).split)
              }
            }}
            orientation="horizontal"
            panel-label="The audit"
            separator-label="Preview and artifact"
            split={split}
          >
            {/* Status rather than settings: what the palette measured, always
                on screen, with the detail one panel away. The form holds every
                input, so a toolbar of controls here would be a second place to
                look for the same thing. */}
            <helix-sandbox-toolbar slot="toolbar">
              <helix-flex align="center" gap="xs">
                <helix-tag appearance="subtle" tone={failures.length > 0 ? 'danger' : 'success'}>
                  {counts.pass ?? 0} pass
                </helix-tag>
                {failures.length > 0 ? (
                  <helix-tag appearance="subtle" tone="danger">
                    {failures.length} fail
                  </helix-tag>
                ) : null}
                {unmeasured.length > 0 ? (
                  <helix-tag appearance="subtle" tone="neutral">
                    {unmeasured.length} unverifiable
                  </helix-tag>
                ) : null}
                {theme.collisions.length > 0 ? (
                  <helix-tag appearance="subtle" tone="warning">
                    {theme.collisions.length} collision
                    {theme.collisions.length === 1 ? '' : 's'}
                  </helix-tag>
                ) : null}
              </helix-flex>
            </helix-sandbox-toolbar>

            {/* `data-helix-theme` and not only the class: the emitted block sets
                the values, and the attribute is what makes `helix/styles` re-run
                its own declarations here so the series ramp and the scales
                re-derive. */}
            <div className="themePreview" data-helix-theme data-theme="preview" slot="preview">
              <ThemedPage />
            </div>

            {/* **The editor, read-only, rather than a code block.** The
                artifact pane should read as a source file, which is what the
                workbench puts here: line numbers, the same syntax palette, the
                same gutter. A code block is a figure in a page and this is a
                pane in a tool.

                `read-only` because the artifact is an output. The editor takes
                it through `EditorState.readOnly` rather than by dropping focus,
                so the text is still selectable and reachable by keyboard, which
                is the whole point of showing it. */}
            <helix-sandbox-editor
              field-label="The generated stylesheet"
              language="css"
              name="artifact"
              read-only
              slot="source"
              value={css}
            ></helix-sandbox-editor>

            {/* **Tabs, because these are three different questions.** A
                contrast failure is a token against a ground, a collision is two
                roles against each other, and an unmeasured pair is neither: it
                is a ground nobody can know. Stacked in one column they read as
                one list of complaints, and a reader looking for the second kind
                has to know it exists. */}
            <helix-tabs data-density="sm" defaultActive="contrast" label="The audit" slot="panel">
              <helix-tabs-tab value="contrast">
                Contrast
                {failures.length > 0 ? ` (${failures.length})` : ''}
              </helix-tabs-tab>
              <helix-tabs-tab value="collisions">
                Collisions
                {theme.collisions.length > 0 ? ` (${theme.collisions.length})` : ''}
              </helix-tabs-tab>
              <helix-tabs-tab value="unmeasured">
                Unverifiable
                {unmeasured.length > 0 ? ` (${unmeasured.length})` : ''}
              </helix-tabs-tab>

              <helix-tabs-panel slot="panels" value="contrast">
                <div className="themeFindings">
                  {failures.length === 0 ? (
                    <helix-text appearance="caption">
                      All {counts.pass ?? 0} measured pairs clear their target. Each is a foreground
                      against a ground the surface model says it lands on, rather than against the
                      page alone.
                    </helix-text>
                  ) : (
                    <helix-table label="Contrast failures">
                      <helix-table-column slot="columns">Foreground</helix-table-column>
                      <helix-table-column slot="columns">Ground</helix-table-column>
                      <helix-table-column slot="columns">Measured</helix-table-column>
                      <helix-table-column slot="columns">Target</helix-table-column>
                      {failures.map((pair) => (
                        <helix-table-row key={`${pair.foreground}-${pair.background}`}>
                          <helix-table-cell>{pair.foreground}</helix-table-cell>
                          <helix-table-cell>{pair.background}</helix-table-cell>
                          <helix-table-cell>{pair.ratio?.toFixed(2)}:1</helix-table-cell>
                          <helix-table-cell>{pair.target}:1</helix-table-cell>
                        </helix-table-row>
                      ))}
                    </helix-table>
                  )}
                </div>
              </helix-tabs-panel>

              <helix-tabs-panel slot="panels" value="collisions">
                <div className="themeFindings">
                  {theme.collisions.length === 0 ? (
                    <helix-text appearance="caption">
                      Every role is distinguishable from every other. A collision is two roles a
                      reader cannot tell apart, which no contrast measurement can see: both may
                      clear the page and still say the same thing.
                    </helix-text>
                  ) : (
                    <helix-flex direction="column" gap="sm">
                      {theme.collisions.map((collision) => (
                        <helix-callout key={collision} severity="warning">
                          <helix-text>{collision}</helix-text>
                        </helix-callout>
                      ))}
                      <helix-text appearance="caption">
                        The accent yields on its own, and a status may rotate within its meaning up
                        to the allowance. What is left here could not be repaired by either.
                      </helix-text>
                    </helix-flex>
                  )}
                </div>
              </helix-tabs-panel>

              <helix-tabs-panel slot="panels" value="unmeasured">
                <div className="themeFindings">
                  <helix-flex direction="column" gap="sm">
                    <helix-text appearance="caption">
                      Not a softer failure: these pairs were never measured, because the ground is
                      not knowable: what sits behind a caption over a photograph is the photograph.
                      Folding them into the passes is how a guarantee becomes a claim about the
                      pairs that happened to be easy.
                    </helix-text>
                    {unmeasured.map((pair) => (
                      <helix-text key={`${pair.foreground}-${pair.background}`}>
                        {pair.foreground} on {pair.background}
                      </helix-text>
                    ))}
                  </helix-flex>
                </div>
              </helix-tabs-panel>
            </helix-tabs>
          </helix-sandbox>
        </div>
      </helix-splitter>
    </>
  )
}
