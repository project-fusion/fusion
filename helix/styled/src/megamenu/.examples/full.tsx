export function Example() {
  return (
    <helix-app-header>
      <span slot="start">Fusion</span>
      <helix-navigation label="Main">
        <helix-megamenu
          label="Products"
          variant="full"
        >
          <div data-megamenu-group>
            <h3 data-megamenu-heading>Design</h3>
            <a
              data-megamenu-item
              href="#helix"
            >
              <helix-icon name="cube"></helix-icon>
              <strong>Helix</strong>
              <span>Components, tokens and the base layer.</span>
            </a>
            <a
              data-megamenu-item
              href="#icons"
            >
              <helix-icon name="palette"></helix-icon>
              <strong>Icons</strong>
              <span>One set, drawn at a single weight.</span>
            </a>
          </div>
          <div data-megamenu-group>
            <h3 data-megamenu-heading>Mind</h3>
            <a
              data-megamenu-item
              href="#cortex"
            >
              <helix-icon name="pulse"></helix-icon>
              <strong>Cortex</strong>
              <span>Memory, provenance and context.</span>
            </a>
            <a
              data-megamenu-item
              href="#trace"
            >
              <helix-icon name="strategy"></helix-icon>
              <strong>Trace</strong>
              <span>Where an answer came from.</span>
            </a>
          </div>
          <div data-megamenu-group>
            <h3 data-megamenu-heading>Energy</h3>
            <a
              data-megamenu-item
              href="#grid"
            >
              <helix-icon name="lightbulb"></helix-icon>
              <strong>Grid</strong>
              <span>Generation, storage and dispatch.</span>
            </a>
            <a
              data-megamenu-item
              href="#chart"
            >
              <helix-icon name="chart-line"></helix-icon>
              <strong>Reporting</strong>
              <span>What every site is doing, now.</span>
            </a>
          </div>
          <div data-megamenu-group>
            <h3 data-megamenu-heading>More</h3>
            <a
              data-navigation-item
              href="#docs"
            >
              Documentation
            </a>
            <a
              data-navigation-item
              href="#changelog"
            >
              Changelog
            </a>
            <a
              data-navigation-item
              href="#status"
            >
              Status
            </a>
          </div>
        </helix-megamenu>
        <a href="#pricing">Pricing</a>
      </helix-navigation>
    </helix-app-header>
  )
}
