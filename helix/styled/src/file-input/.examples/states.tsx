export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-file-input
        disabled
        hint="Sign in to attach files"
        label="Signed contract"
        name="contract"
      ></helix-file-input>

      <helix-file-input
        feedback="Choose at least one file"
        hint="PNG or JPG, up to 10MB each"
        label="Attachments"
        multiple
        name="attachments"
        required
      ></helix-file-input>
    </helix-flex>
  )
}
