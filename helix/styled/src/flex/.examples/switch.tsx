import './switch.css'

export function Example() {
  return (
    <helix-flex
      className="plans"
      gap="md"
      layout="switch"
    >
      <helix-card separation="outlined">
        <h3 slot="header">Plan</h3>
        Ten projects and 10 GB of storage.
      </helix-card>
      <helix-card separation="outlined">
        <h3 slot="header">Team</h3>
        Five seats, each with its own sign-in.
      </helix-card>
      <helix-card separation="outlined">
        <h3 slot="header">Support</h3>
        Answers within one working day.
      </helix-card>
    </helix-flex>
  )
}
