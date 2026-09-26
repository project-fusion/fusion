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
        <helix-text slot="content">Your email address was confirmed.</helix-text>
      </helix-step>
      <helix-step
        current
        value="two"
      >
        Add your details
        <helix-text slot="content">Add your name, role, and time zone.</helix-text>
      </helix-step>
      <helix-step value="three">
        Invite your team
        <helix-text slot="content">Invite up to five team members.</helix-text>
      </helix-step>
    </helix-steps>
  )
}
