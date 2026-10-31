import type { ThemeEngine } from '@fusion.dev/helix-theme'
import Link from 'next/link'
import { Band, band } from '@/components/band/band'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import { Lede } from '@/components/lede/lede'
import { SectionTitle } from '@/components/section-title/section-title'
import { Snippet } from '@/components/snippet/snippet'
import { AGENT_EXCHANGE, AGENT_SURFACES } from '@/content/landing/agents'
import { contrastCatch, GENERATOR_CHECKS } from '@/content/landing/checks'
import { MECHANISMS } from '@/content/landing/helix-landing'
import styles from './proof-bands.module.css'

/** One mechanism card, by the name its proof band repeats. */
const mechanism = (name: string) => {
  const found = MECHANISMS.find((one) => one.name === name)
  if (!found) {
    throw new Error(`proof-bands: no ${name} card`)
  }
  return found
}

/**
 * The Checks band and the Agents band, under the cards they explain.
 *
 * Both are computed here, while the page builds. The contrast catch is a pair
 * the engine measured and failed, drawn in its own colors so the eye sees the
 * problem before the number, with the engine's sentence under it. The exchange
 * is an excerpt of the manifest the URL serves.
 */
export async function ProofBands({ engine }: { engine: ThemeEngine }) {
  const checks = mechanism('Checks')
  const agents = mechanism('Agents')
  const caught = contrastCatch(engine)

  return (
    <>
      <Band>
        <helix-flex class={band.bandSection} direction="column" gap="md">
          <Eyebrow>{checks.name}</Eyebrow>
          <SectionTitle>{checks.claim}</SectionTitle>
          <Lede>{checks.bullets[0]}</Lede>
        </helix-flex>
        <div className={`${band.bandSplit} ${styles.proof}`}>
          <helix-flex class={band.bandSection} direction="column" gap="sm">
            <helix-text class={styles.kicker} emphasis="muted" variant="label">
              One pair that failed
            </helix-text>
            {/* **Drawn in the colors it measured.** The engine's hex for each
                token, so the sample is the pair the ratio describes. */}
            <p
              className={styles.sample}
              data-site-failing-pair
              style={{ backgroundColor: caught.background, color: caught.foreground }}
            >
              Body text in this gray
            </p>
            <helix-flex align-items="center" gap="sm" wrap>
              <helix-text variant="body-strong">{caught.ratio.toFixed(2)}:1</helix-text>
              <helix-text emphasis="muted">against a target of {caught.target}:1</helix-text>
              <helix-tag emphasis="subtle" tone="danger">
                Fails
              </helix-tag>
            </helix-flex>
            <helix-text as="p" class={styles.finding} emphasis="muted" variant="caption">
              {caught.sentence}
            </helix-text>
          </helix-flex>
          <helix-flex class={band.bandSection} direction="column" gap="sm">
            <helix-text class={styles.kicker} emphasis="muted" variant="label">
              {GENERATOR_CHECKS.length} generator checks
            </helix-text>
            <helix-flex class={styles.steps} gap="xs" wrap>
              {GENERATOR_CHECKS.map((name) => (
                <helix-code key={name}>{name}</helix-code>
              ))}
            </helix-flex>
          </helix-flex>
        </div>
      </Band>

      <Band>
        <helix-flex class={band.bandSection} direction="column" gap="md">
          <Eyebrow>{agents.name}</Eyebrow>
          <SectionTitle>{agents.claim}</SectionTitle>
          <Lede>{agents.bullets[0]}</Lede>
        </helix-flex>
        <div className={band.bandSection}>
          <helix-list class={styles.exchange} kind="ordered">
            <helix-list-item>
              <helix-text class={styles.kicker} emphasis="muted" variant="label">
                Question
              </helix-text>
              <helix-text as="p">{AGENT_EXCHANGE.question}</helix-text>
            </helix-list-item>
            <helix-list-item>
              <helix-text class={styles.kicker} emphasis="muted" variant="label">
                Request
              </helix-text>
              {/* `html`, where a bare URL is text: as `sh` the scheme read as a
                  command and was painted like an error. */}
              <Snippet code={AGENT_EXCHANGE.url} label="Manifest URL" language="html" wrap />
            </helix-list-item>
            <helix-list-item>
              <helix-text class={styles.kicker} emphasis="muted" variant="label">
                Answer
              </helix-text>
              <helix-text as="p" emphasis="muted" variant="caption">
                {AGENT_EXCHANGE.answer}
              </helix-text>
              <Snippet code={AGENT_EXCHANGE.excerpt} label="Manifest excerpt" language="js" wrap />
            </helix-list-item>
          </helix-list>
          <helix-flex class={styles.surfaces} data-density="sm" gap="lg" wrap>
            {AGENT_SURFACES.map((surface) => (
              <Link
                className={styles.surface}
                data-link="quiet"
                href={surface.href}
                key={surface.href}
              >
                {surface.label}
                <helix-icon name="arrow-right"></helix-icon>
              </Link>
            ))}
          </helix-flex>
        </div>
      </Band>
    </>
  )
}
