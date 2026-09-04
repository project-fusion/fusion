import './smooth.css'

export function Example() {
  return (
    <div className="layout">
      <helix-outline
        behavior="smooth"
        className="nav"
        label="On this page"
        offset={72}
      >
        <a href="#install">Install</a>
        <a href="#usage">Usage</a>
        <a href="#api">API</a>
      </helix-outline>

      <div className="prose">
        <section id="install">
          <helix-text
            as="h2"
            variant="title"
          >
            Install
          </helix-text>
          <helix-text as="p">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </helix-text>
        </section>
        <section id="usage">
          <helix-text
            as="h2"
            variant="title"
          >
            Usage
          </helix-text>
          <helix-text as="p">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </helix-text>
        </section>
        <section id="api">
          <helix-text
            as="h2"
            variant="title"
          >
            API
          </helix-text>
          <helix-text as="p">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </helix-text>
        </section>
      </div>
    </div>
  )
}
