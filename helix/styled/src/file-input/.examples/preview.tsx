export function Example() {
  return (
    <helix-file-input
      hint="PNG or JPG, up to 10MB each"
      label="Attachments"
      multiple
      name="attachments"
    >
      <helix-icon
        name="upload-simple"
        slot="trigger"
      ></helix-icon>
      <span slot="trigger">Choose files, or drop them here</span>
    </helix-file-input>
  )
}
