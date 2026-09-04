import './vertical.css'

export function Example() {
  return (
    <helix-carousel
      className="stack"
      label="Releases"
      orientation="vertical"
    >
      <helix-callout tone="info">Slide One</helix-callout>
      <helix-callout tone="success">Slide Two</helix-callout>
      <helix-callout tone="warning">Slide Three</helix-callout>
    </helix-carousel>
  )
}
