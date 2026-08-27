import './railed.css'

export function Example() {
  return (
    <helix-flex direction="column" gap="xl">
      <helix-list kind="ordered" label="The constraint" marker="rail">
        <helix-list-item>
          The user holds their own keys
          <span slot="supporting">
            Not escrowed, not recoverable by us, not ours to hand to anyone who asks.
          </span>
        </helix-list-item>
        <helix-list-item>
          The user holds their own data
          <span slot="supporting">Including the parts they never look at.</span>
        </helix-list-item>
        <helix-list-item>
          The user holds their own hardware
          <span slot="supporting">A control plane is not a chokepoint.</span>
        </helix-list-item>
      </helix-list>

      <helix-list
        className="roman"
        kind="ordered"
        label="A narrower rail, counting differently"
        marker="rail"
      >
        <helix-list-item>Personal sovereignty</helix-list-item>
        <helix-list-item>Organizational sovereignty</helix-list-item>
        <helix-list-item>National sovereignty</helix-list-item>
      </helix-list>
    </helix-flex>
  )
}
