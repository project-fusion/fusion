export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-textarea
        hint="Up to 200 characters"
        label="Summary"
        maxlength="200"
        rows={2}
      ></helix-textarea>

      <helix-textarea
        hint="At least 40 characters"
        label="Details"
        minlength="40"
        rows={6}
      ></helix-textarea>
    </helix-flex>
  )
}
