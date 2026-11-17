import './preview.css'

export function Example() {
  return (
    <div className="page">
      <helix-text className="lead">
        Scroll this box. The three cards below come in as they reach the view.
      </helix-text>
      <helix-reveal>
        <helix-card>Plan the release</helix-card>
      </helix-reveal>
      <helix-reveal className="second">
        <helix-card>Write the notes</helix-card>
      </helix-reveal>
      <helix-reveal className="third">
        <helix-card>Ship it</helix-card>
      </helix-reveal>
    </div>
  )
}
