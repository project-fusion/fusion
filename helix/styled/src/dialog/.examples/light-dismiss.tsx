export function Example() {
  return (
    <helix-dialog
      closedby="any"
      default-open
      label="Folder shared"
      size="sm"
    >
      <helix-text
        as="h2"
        slot="header"
      >
        Folder shared
      </helix-text>
      <helix-text>
        Anyone with the link can view Quarterly reports. Files you add to the folder later are
        shared too.
      </helix-text>
    </helix-dialog>
  )
}
