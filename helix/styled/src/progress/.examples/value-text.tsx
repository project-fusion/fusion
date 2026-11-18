export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-progress
        label="Importing records"
        max={8}
        value={3}
        value-text="3 of 8 records"
      ></helix-progress>
      <helix-progress
        formatOptions={{ style: 'unit', unit: 'megabyte' }}
        label="Uploading"
        max={120}
        show-value
        value={45}
      ></helix-progress>
    </helix-flex>
  )
}
