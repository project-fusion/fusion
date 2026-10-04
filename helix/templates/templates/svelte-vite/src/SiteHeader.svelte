<!-- The bar across the top: the wordmark, the destinations, and the color mode. -->
<script lang="ts">
  import { route } from './routes.svelte.ts'

  /** What the page can follow, in the order the control cycles them. */
  const MODES = ['system', 'light', 'dark'] as const

  type Mode = (typeof MODES)[number]

  /** The glyph each mode is announced and drawn with. */
  const MARKS: Record<Mode, string> = { dark: 'moon', light: 'sun', system: 'monitor' }

  /* `system` is the resting state, so the control draws the same glyph before
     and after the reader first touches it. */
  let mode = $state<Mode>('system')

  /**
   * One attribute, two modes, and no second stylesheet.
   *
   * Every Helix token is written once as a `light-dark()` pair, so
   * `color-scheme` decides which half resolves. `data-color-mode` sets it, and
   * since `color-scheme` inherits, the attribute works on any element: put it
   * on a panel for a light preview inside a dark page.
   *
   * `system` removes the attribute. Writing out whichever mode is current would
   * freeze the page there the moment the reader's machine changed.
   */
  const cycle = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length] ?? 'system'
    mode = next
    if (next === 'system') {
      delete document.documentElement.dataset.colorMode
      return
    }
    document.documentElement.dataset.colorMode = next
  }
</script>

<helix-app-header material="glass" sticky>
  <!-- The wordmark is the way back to the first page, so there is no third
       destination in the bar saying the same thing. It is also the only name of
       the project on the screen. The mark is a placeholder for your own, drawn
       in `--helix-color-brand-mark`, the token for the brand as a graphic. -->
  <a class="wordmark" data-link="quiet" href="#/" slot="start">
    <helix-icon name="cube"></helix-icon>
    <helix-text variant="body-strong">__PROJECT_NAME__</helix-text>
  </a>

  <!-- The links are yours. Navigation owns the marker that travels between them
       and renders no anchors of its own. The base layer styles them,
       `aria-current="page"` included. -->
  <helix-navigation label="Pages">
    <a aria-current={route.path === '/overview' ? 'page' : undefined} href="#/overview">Overview</a>
    <a aria-current={route.path === '/join' ? 'page' : undefined} href="#/join">Join</a>
  </helix-navigation>

  <!-- An icon with no words has no accessible name until it is given one, which
       is why this is its own element.

       Svelte's accessibility check reads the tag, and the button is inside the
       element's shadow root, with its role and its keys. So the two warnings
       about a click on an element with neither are ignored here. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <helix-icon-button
    label={`Color mode: ${mode}`}
    onclick={cycle}
    slot="end"
    title={`Color mode: ${mode}`}
  >
    <helix-icon name={MARKS[mode]}></helix-icon>
  </helix-icon-button>
</helix-app-header>
