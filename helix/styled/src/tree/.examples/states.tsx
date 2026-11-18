export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-tree
        label="Project files"
        loading
        loading-text="Loading project files"
      ></helix-tree>

      <helix-tree
        empty-text="No shared folders"
        label="Shared folders"
      ></helix-tree>
    </helix-flex>
  )
}
