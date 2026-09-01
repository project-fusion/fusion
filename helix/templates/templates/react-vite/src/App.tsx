/**
 * Helix components are custom elements, so you write the tags directly. There is
 * no wrapper package and nothing to import per component.
 *
 * Events are props: `onhelix-before-change` reaches `helix-before-change`. React's
 * own bubbling events work as they always do, so `onClick` is fine here.
 */
export function App() {
  return (
    <helix-flex align="center" direction="column" gap="lg">
      <helix-text as="h1">__PROJECT_NAME__</helix-text>
      <helix-text>Edit `src/App.tsx` and save.</helix-text>
      <helix-button
        emphasis="solid"
        onClick={() => {
          console.log('clicked')
        }}
        tone="primary"
      >
        Get started
      </helix-button>
    </helix-flex>
  )
}
