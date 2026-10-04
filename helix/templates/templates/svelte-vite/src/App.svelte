<!--
  The shell, and the switch between the three pages.

  Helix components are custom elements, so you write the tags directly. There
  is no wrapper package and nothing to import per component: `src/main.ts`
  registers them once, and every tag in the app is real from then on.

  The bar, the route, and the footer sit in a column the height of the window.
  `app.css` says why the footer is worth having and why the column is flex.
-->
<script lang="ts">
  import Landing from './Landing.svelte'
  import Overview from './Overview.svelte'
  import { route } from './routes.svelte.ts'
  import SignupForm from './SignupForm.svelte'
  import SiteFooter from './SiteFooter.svelte'
  import SiteHeader from './SiteHeader.svelte'

  /** The page for each path, in the order the bar offers them. */
  const PAGES = {
    '/': Landing,
    '/join': SignupForm,
    '/overview': Overview,
  }

  const Page = $derived(PAGES[route.path as keyof typeof PAGES] ?? Landing)
</script>

<div class="shell">
  <SiteHeader />
  <main class="page">
    <Page />
  </main>
  <SiteFooter />
</div>
