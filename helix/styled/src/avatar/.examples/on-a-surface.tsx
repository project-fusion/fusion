import './on-a-surface.css'

export function Example() {
  return (
    <div className="panel">
      <helix-avatar-group
        label="Reviewers"
        max={3}
      >
        <helix-avatar name="Alex Kim"></helix-avatar>
        <helix-avatar name="Maria Lopez"></helix-avatar>
        <helix-avatar name="Sam Patel"></helix-avatar>
        <helix-avatar name="Jordan Lee"></helix-avatar>
        <helix-avatar name="Priya Shah"></helix-avatar>
      </helix-avatar-group>
      <helix-button>Request review</helix-button>
    </div>
  )
}
