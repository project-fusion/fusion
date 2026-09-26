export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-toggle-group
        disabled
        label="View"
      >
        <helix-toggle
          selected
          value="list"
        >
          List
        </helix-toggle>
        <helix-toggle value="grid">Grid</helix-toggle>
      </helix-toggle-group>

      {/* This group is enabled, and only its Dense toggle is disabled. */}
      <helix-toggle-group label="Density">
        <helix-toggle
          selected
          value="comfortable"
        >
          Comfortable
        </helix-toggle>
        <helix-toggle value="compact">Compact</helix-toggle>
        <helix-toggle
          disabled
          value="dense"
        >
          Dense
        </helix-toggle>
      </helix-toggle-group>
    </helix-flex>
  )
}
