<script setup lang="ts">
import { computed } from 'vue'
import LandingPage from './LandingPage.vue'
import OverviewPage from './OverviewPage.vue'
import { usePathname } from './routes.ts'
import SignupForm from './SignupForm.vue'
import SiteFooter from './SiteFooter.vue'
import SiteHeader from './SiteHeader.vue'

/** The page for each path, in the order the bar offers them. */
const PAGES = {
  '/': LandingPage,
  '/join': SignupForm,
  '/overview': OverviewPage,
}

const path = usePathname()
const page = computed(() => PAGES[path.value as keyof typeof PAGES] ?? LandingPage)
</script>

<!--
  The shell, and the switch between the three pages.

  Helix components are custom elements, so you write the tags directly. There
  is no wrapper package and nothing to import per component: `src/main.ts`
  registers them once, and every tag in the app is real from then on.

  The bar, the route, and the footer sit in a column the height of the window.
  `app.css` says why the footer is worth having and why the column is flex.
-->
<template>
  <div class="shell">
    <SiteHeader />
    <main class="page">
      <component :is="page" />
    </main>
    <SiteFooter />
  </div>
</template>
