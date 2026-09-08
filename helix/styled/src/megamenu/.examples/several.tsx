export function Example() {
  return (
    <helix-navigation label="Main">
      <a href="#overview">Overview</a>
      <helix-megamenu label="Products">
        <div data-megamenu-group>
          <h3 data-megamenu-heading>Build</h3>
          <a
            data-megamenu-item
            href="#helix"
          >
            <helix-icon name="cube"></helix-icon>
            <strong>Helix</strong>
            <span>Components, tokens and the base layer.</span>
          </a>
        </div>
        <div data-megamenu-group>
          <h3 data-megamenu-heading>Run</h3>
          <a
            data-megamenu-item
            href="#trace"
          >
            <helix-icon name="pulse"></helix-icon>
            <strong>Trace</strong>
            <span>Where an answer came from.</span>
          </a>
        </div>
      </helix-megamenu>
      <helix-megamenu label="Solutions">
        <div data-megamenu-group>
          <h3 data-megamenu-heading>By team</h3>
          <a
            data-megamenu-item
            href="#engineering"
          >
            <helix-icon name="gear"></helix-icon>
            <strong>Engineering</strong>
            <span>Ship the thing and know it landed.</span>
          </a>
          <a
            data-megamenu-item
            href="#design"
          >
            <helix-icon name="palette"></helix-icon>
            <strong>Design</strong>
            <span>One vocabulary across every surface.</span>
          </a>
        </div>
      </helix-megamenu>
      <helix-megamenu label="Company">
        <div data-megamenu-group>
          <h3 data-megamenu-heading>About</h3>
          <a
            data-megamenu-item
            href="#story"
          >
            <helix-icon name="building"></helix-icon>
            <strong>Story</strong>
            <span>Why any of this exists.</span>
          </a>
        </div>
      </helix-megamenu>
      <a href="#pricing">Pricing</a>
    </helix-navigation>
  )
}
