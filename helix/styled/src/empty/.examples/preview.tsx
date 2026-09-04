export function Example() {
  return (
    <helix-empty>
      <helix-icon
        name="folder-open"
        slot="icon"
      ></helix-icon>
      <span slot="heading">No projects yet</span>
      Anything you create will show up here.
      <helix-button
        emphasis="solid"
        slot="actions"
        tone="primary"
        width="standard"
      >
        New project
      </helix-button>
    </helix-empty>
  )
}
