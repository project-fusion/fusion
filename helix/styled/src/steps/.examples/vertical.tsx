export function Example() {
  return (
    <helix-steps
      label="Account setup"
      orientation="vertical"
    >
      <helix-step
        complete
        value="one"
      >
        Create account
        <helix-text slot="description">Email address confirmed</helix-text>
      </helix-step>
      <helix-step
        current
        value="two"
      >
        Add your details
        <helix-text slot="description">Name, role, and time zone</helix-text>
      </helix-step>
      <helix-step value="three">
        Invite your team
        <helix-text slot="description">Up to five team members</helix-text>
      </helix-step>
    </helix-steps>
  )
}
