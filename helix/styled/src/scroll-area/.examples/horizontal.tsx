import './horizontal.css'

export function Example() {
  return (
    <helix-scroll-area label="Verticals">
      <div className="cards">
        <helix-card separation="outlined">
          <h3 slot="header">Fusion Design</h3>
          The DNA every interface is built from.
        </helix-card>
        <helix-card separation="outlined">
          <h3 slot="header">Fusion Mind</h3>
          Memory, provenance and context.
        </helix-card>
        <helix-card separation="outlined">
          <h3 slot="header">Fusion Energy</h3>
          The missing floor of the stack.
        </helix-card>
        <helix-card separation="outlined">
          <h3 slot="header">Fusion Capital</h3>
          Own what you own.
        </helix-card>
        <helix-card separation="outlined">
          <h3 slot="header">Fusion Studio</h3>
          The services arm.
        </helix-card>
      </div>
    </helix-scroll-area>
  )
}
