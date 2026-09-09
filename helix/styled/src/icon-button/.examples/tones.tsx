export function Example() {
  return (
    <helix-flex
      align="center"
      gap="md"
    >
      {/* `accent` renders as `primary` here, and that is the default rather than
          a mistake: a palette that has not named a second color does not have
          one. `button/accent` is where a theme names one and the pair
          separate. */}
      <helix-icon-button
        label="Download"
        tone="primary"
      >
        <helix-icon name="download"></helix-icon>
      </helix-icon-button>

      <helix-icon-button
        label="Open"
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
