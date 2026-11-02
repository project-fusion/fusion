import './vertical.css'

export function Example() {
  return (
    <helix-carousel
      className="stack"
      label="Releases"
      orientation="vertical"
      style={{ '--carousel-block-size': '9rem' } as React.CSSProperties}
    >
      <helix-callout tone="info">New features are available.</helix-callout>
      <helix-callout tone="success">Your changes were saved.</helix-callout>
      <helix-callout tone="warning">Your storage is almost full.</helix-callout>
    </helix-carousel>
  )
}
