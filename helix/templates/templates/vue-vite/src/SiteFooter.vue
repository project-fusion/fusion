<script setup lang="ts">
import { DOCS } from './docs.ts'
</script>

<!--
  The bar's counterpart, on every route.

  **It puts a floor under the content.** The overview is a heading, a table,
  and a caption, which on a tall window left the bottom third of the screen
  empty. The footer is also where the links you want once belong.

  `data-link="quiet"` sets a link in the muted ink with no underline, and it
  takes the foreground on hover, which suits a row of links under a rule.
-->
<template>
  <footer class="site-footer">
    <div class="footer-row">
      <div class="footer-links">
        <a data-link="quiet" :href="DOCS.gallery">Components</a>
        <a data-link="quiet" :href="DOCS.elements">Documentation</a>
        <a data-link="quiet" :href="DOCS.vue">Vue</a>
      </div>
    </div>
  </footer>
</template>
