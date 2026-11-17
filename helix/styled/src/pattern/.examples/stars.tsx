import './stars.css'

export function Example() {
  return (
    <helix-pattern
      className="hero"
      motif="stars"
    >
      <helix-text
        as="h2"
        scale="display"
      >
        Ship the whole team's work
      </helix-text>
      <helix-text emphasis="muted">Plans, notes, and releases in one place.</helix-text>
    </helix-pattern>
  )
}
