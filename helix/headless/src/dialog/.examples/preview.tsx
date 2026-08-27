import './preview.css'

export function Example() {
  return (
    <>
      <helix-headless-button command="--show" commandfor="base-confirm">
        Delete project
      </helix-headless-button>

      <helix-headless-dialog id="base-confirm" label="Delete project">
        <h2 slot="header">Delete project</h2>
        <p>This removes the project and everything in it. It cannot be undone.</p>
        <div slot="footer">
          <helix-headless-button command="--close" commandfor="base-confirm">
            Delete
          </helix-headless-button>
          <helix-headless-button command="--close" commandfor="base-confirm">
            Cancel
          </helix-headless-button>
        </div>
      </helix-headless-dialog>
    </>
  )
}
