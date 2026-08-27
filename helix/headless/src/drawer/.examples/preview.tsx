import './preview.css'

export function Example() {
  return (
    <>
      <helix-headless-button command="--show" commandfor="panel">
        Open drawer
      </helix-headless-button>

      <helix-headless-drawer id="panel" label="Drawer Title" placement="end">
        <span slot="header">Drawer Title</span>
        <div className="stack">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore.
          </p>
          <helix-headless-button command="--close" commandfor="panel">
            Close
          </helix-headless-button>
        </div>
      </helix-headless-drawer>
    </>
  )
}
