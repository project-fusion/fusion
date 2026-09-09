export function Example() {
  return (
    <helix-flex gap="sm">
      <helix-button
        emphasis="solid"
        tone="primary"
      >
        {/* `accent` renders as `primary` here, and that is the default rather than
          a mistake: a palette that has not named a second color does not have
          one. `button/accent` is where a theme names one and the pair
          separate. */}
        Button
      </helix-button>
      <helix-button
        emphasis="solid"
        tone="accent"
      >
        Button
      </helix-button>
      <helix-button tone="neutral">Button</helix-button>
      <helix-button
        emphasis="solid"
        tone="danger"
      >
        Button
      </helix-button>
    </helix-flex>
  )
}
