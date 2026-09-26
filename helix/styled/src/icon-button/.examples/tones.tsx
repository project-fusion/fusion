export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="md"
    >
      {/* `accent` looks the same as `primary` until your theme sets an accent
          color with `button/accent`. */}
      <helix-icon-button
        label="Download"
        tone="primary"
      >
        <helix-icon name="download"></helix-icon>
      </helix-icon-button>

      <helix-icon-button
        label="Open in new tab"
        tone="accent"
      >
        <helix-icon name="arrow-square-out"></helix-icon>
      </helix-icon-button>

      <helix-icon-button
        label="Delete"
        tone="danger"
      >
        <helix-icon name="trash"></helix-icon>
      </helix-icon-button>
    </helix-flex>
  )
}
