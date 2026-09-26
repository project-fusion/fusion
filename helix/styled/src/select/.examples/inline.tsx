export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="sm"
    >
      <helix-text variant="body">Sort by</helix-text>

      {/* The select has no visible label, so `aria-label` names it for screen
          readers. */}
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
