import './preview.css'

export function Example() {
  return (
    <helix-headless-empty>
      <helix-headless-icon
        name="folder-open"
        slot="icon"
      ></helix-headless-icon>
      <h3 slot="heading">No projects yet</h3>
      Anything you create will show up here.
      <helix-headless-button slot="actions">New project</helix-headless-button>
    </helix-headless-empty>
  )
}
