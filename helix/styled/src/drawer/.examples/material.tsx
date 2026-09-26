import './material.css'

export function Example() {
  return (
    <>
      <div className="page">
        <helix-text
          as="h1"
          variant="display"
        >
          Projects
        </helix-text>
        <helix-text as="p">
          Track progress, share files, and invite team members to your projects.
        </helix-text>
        <helix-text as="p">
          Recent activity from your team appears here. Open a project to see its tasks.
        </helix-text>
      </div>

      <helix-drawer
        default-open
        label="Notifications"
        material="glass"
        placement="end"
      >
        <span slot="header">Notifications</span>
        <helix-flex
          direction="column"
          gap="md"
        >
          <helix-text variant="body">You have no new notifications.</helix-text>
        </helix-flex>
      </helix-drawer>
    </>
  )
}
