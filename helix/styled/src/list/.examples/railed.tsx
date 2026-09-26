import './railed.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="xl"
    >
      <helix-list
        kind="ordered"
        label="Getting started"
        marker="rail"
      >
        <helix-list-item>
          Create your account
          <span slot="description">Use your work email address so your team can find you.</span>
        </helix-list-item>
        <helix-list-item>
          Set up your profile
          <span slot="description">Add your name, photo, and time zone.</span>
        </helix-list-item>
        <helix-list-item>
          Invite your team
          <span slot="description">Send invitations to up to 10 people.</span>
        </helix-list-item>
      </helix-list>

      <helix-list
        className="roman"
        kind="ordered"
        label="Release checklist"
        marker="rail"
      >
        <helix-list-item>Draft the migration</helix-list-item>
        <helix-list-item>Test it on a copy</helix-list-item>
        <helix-list-item>Schedule the release</helix-list-item>
      </helix-list>
    </helix-flex>
  )
}
