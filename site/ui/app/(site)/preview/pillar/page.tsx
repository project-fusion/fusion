import { LightPillar } from './light-pillar'
import './pillar.css'

export const metadata = { title: 'Candidate: light pillar' }

/**
 * The hero with a volumetric shaft behind it.
 *
 * A candidate for the landing page's background, modelled on the shape of
 * `reactbits.dev/backgrounds/light-pillar` and built from nothing it ships. The
 * argument for this one over `liquid-ether`, the other reference, is in the
 * response that accompanied it: a fluid solver is driven by a cursor, so it is
 * inert on every phone and it runs a multi-pass solve for as long as the tab is
 * open. This is one pass, it plays to a reader who never touches anything, and
 * it stops when nobody is looking at it.
 */
export default function Page() {
  return (
    <section className="pillarHero">
      <LightPillar />
      <div className="pillarScrim" />
      <helix-flex class="shell pillarShell" direction="column" gap="xl">
        <helix-text appearance="label" tone="subtle">
          Fusion Development Group
        </helix-text>

        <helix-text as="h1" class="heroTitle">
          Interface and intelligence engineering
        </helix-text>

        <helix-text as="p" class="heroLede measure" tone="muted">
          We build the software, and we built the tools underneath it. Most engagements start with a
          two week audit of what is worth building, and every price is stated before you ask.
        </helix-text>

        <helix-flex data-density="lg" gap="sm" wrap>
          <a
            data-button="solid"
            data-button-fill="standard"
            data-button-tone="primary"
            href="/services"
          >
            See what it costs
          </a>
          <a data-button data-button-fill="standard" href="/helix">
            Open Helix
          </a>
        </helix-flex>
      </helix-flex>
    </section>
  )
}
