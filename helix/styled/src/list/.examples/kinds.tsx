export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-list
        kind="ordered"
        label="Steps"
      >
        <helix-list-item>Create a project</helix-list-item>
        <helix-list-item>Invite your team</helix-list-item>
        <helix-list-item>Share your first file</helix-list-item>
      </helix-list>

      <helix-list
        kind="unordered"
        label="Included in your plan"
      >
        <helix-list-item>Unlimited projects</helix-list-item>
        <helix-list-item>10 GB of storage</helix-list-item>
        <helix-list-item>Email support</helix-list-item>
      </helix-list>

      <helix-list
        kind="description"
        label="Account details"
      >
        <helix-list-item>
          Plan
          <span slot="description">Team, billed yearly.</span>
        </helix-list-item>
        <helix-list-item>
          Storage
          <span slot="description">4.2 GB of 10 GB used.</span>
        </helix-list-item>
      </helix-list>
    </helix-flex>
  )
}
