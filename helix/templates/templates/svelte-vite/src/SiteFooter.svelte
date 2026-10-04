<!--
  The bar's counterpart, on every route.

  **It puts a floor under the content.** The overview is a heading, a table,
  and a caption, which on a tall window left the bottom third of the screen
  empty. The footer is also where the links you want once belong.

  `data-link="subtle"` reads as body text until it is hovered, which suits a
  row of links under a rule.
-->
<script lang="ts">
  import { DOCS } from './docs.ts'
</script>

<footer class="site-footer">
  <div class="footer-row">
    <helix-text as="p" emphasis="subtle" variant="caption">
      Every component here has a page, with its API, its parts, and its examples.
    </helix-text>
    <div class="footer-links">
      <a data-link="subtle" href={DOCS.gallery}>Components</a>
      <a data-link="subtle" href={DOCS.elements}>Documentation</a>
      <a data-link="subtle" href={DOCS.svelte}>Svelte</a>
    </div>
  </div>
</footer>
