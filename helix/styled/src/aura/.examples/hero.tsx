import './hero.css'

export function Example() {
  return (
    <div className="stage">
      <helix-aura
        className="hero"
        interactive
        variant="aurora"
      >
        <helix-text as="h2">Ship the release on Friday</helix-text>
        <helix-button
          emphasis="solid"
          tone="primary"
        >
          Plan the release
        </helix-button>
      </helix-aura>
    </div>
  )
}
