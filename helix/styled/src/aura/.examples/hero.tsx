import './hero.css'

export function Example() {
  return (
    <helix-aura
      className="hero"
      interactive
      pattern="aurora"
      style={{ blockSize: '20rem' }}
      terminus={0.9}
    >
      <helix-text as="h2">Ship the release on Friday</helix-text>
      <helix-button
        emphasis="solid"
        tone="primary"
      >
        Plan the release
      </helix-button>
    </helix-aura>
  )
}
