export function Example() {
  return (
    <helix-flex gap="sm">
      <helix-button
        emphasis="solid"
        tone="primary"
      >
        {/* `accent` matches `primary` until the theme sets a second color. */}
        Save
      </helix-button>
      <helix-button
        emphasis="solid"
        tone="accent"
      >
        Share
      </helix-button>
      <helix-button tone="neutral">Cancel</helix-button>
      <helix-button
        emphasis="solid"
        tone="danger"
      >
        Delete
      </helix-button>
    </helix-flex>
  )
}
