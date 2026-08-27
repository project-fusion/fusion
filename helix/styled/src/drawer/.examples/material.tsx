import './material.css'

export function Example() {
  return (
    <>
      <div className="page">
        <helix-text as="h1" variant="display">
          Scroll this page
        </helix-text>
        <helix-text as="p">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </helix-text>
        <helix-text as="p">
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
          commodo consequat.
        </helix-text>
      </div>

      <helix-drawer default-open label="Drawer Title" material="glass" placement="end">
        <span slot="header">Drawer Title</span>
        <helix-flex direction="column" gap="md">
          <helix-text variant="body">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore.
          </helix-text>
        </helix-flex>
      </helix-drawer>
    </>
  )
}
