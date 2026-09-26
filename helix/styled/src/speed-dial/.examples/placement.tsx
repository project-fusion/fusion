export function Example() {
  return (
    <helix-speed-dial
      label="Create"
      offset={16}
      placement="top-start"
    >
      <helix-speed-dial-item value="note">
        <helix-icon
          name="notebook"
          slot="icon"
        ></helix-icon>
        Note
      </helix-speed-dial-item>
      <helix-speed-dial-item value="folder">
        <helix-icon
          name="folder-open"
          slot="icon"
        ></helix-icon>
        Folder
      </helix-speed-dial-item>
    </helix-speed-dial>
  )
}
