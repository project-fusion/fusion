export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-progress
        indeterminate
        label="Restoring backup"
      ></helix-progress>
      <helix-progress
        indeterminate
        label="Indexing files"
      ></helix-progress>
    </helix-flex>
  )
}
