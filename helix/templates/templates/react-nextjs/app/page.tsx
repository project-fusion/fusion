/**
 * A server component, rendering custom elements directly.
 *
 * Helix events are props: `onhelix-before-change` reaches `helix-before-change`.
 * Anything needing a handler is a client component, the same as any other React
 * app — this page needs none.
 */
export default function Page() {
  return (
    <helix-flex align="center" direction="column" gap="lg">
      <helix-text as="h1">__PROJECT_NAME__</helix-text>
      <helix-text>Edit `app/page.tsx` and save.</helix-text>
      <helix-button emphasis="solid" tone="primary">
        Get started
      </helix-button>
    </helix-flex>
  )
}
