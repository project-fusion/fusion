export function Example() {
  return (
    <helix-flex
      align="center"
      gap="sm"
    >
      <helix-text variant="body">Sort by</helix-text>

      {/* No visible label: the name is on the host, and the field renders a
          clipped one rather than none, so a screen reader still hears it. */}
      <helix-select
        aria-label="Sort by"
        defaultValue="recent"
        emphasis="ghost"
      >
        <helix-option value="recent">Most recent</helix-option>
        <helix-option value="oldest">Oldest first</helix-option>
        <helix-option value="name">Name</helix-option>
      </helix-select>
    </helix-flex>
  )
}
