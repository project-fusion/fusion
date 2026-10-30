import './rail.css'

export function Example() {
  return (
    <div className="frame">
      <div className="pane">
        <section id="overview">
          <helix-text
            as="h2"
            variant="title"
          >
            Overview
          </helix-text>
          <helix-text as="p">
            The rail is the outline drawn as one tick per section. Scroll this pane and the tick of
            the section in view grows.
          </helix-text>
        </section>
        <section id="install">
          <helix-text
            as="h2"
            variant="title"
          >
            Install
          </helix-text>
          <helix-text as="p">
            Install the package with your package manager, then import it in the entry file of your
            app.
          </helix-text>
        </section>
        <section id="requirements">
          <helix-text
            as="h3"
            variant="subheading"
          >
            Requirements
          </helix-text>
          <helix-text as="p">
            A current browser and a bundler that reads package exports.
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
            Create a client with your API key, then call its methods to read and write your data.
          </helix-text>
        </section>
        <section id="options">
          <helix-text
            as="h3"
            variant="subheading"
          >
            Options
          </helix-text>
          <helix-text as="p">Each option has a default, so a client needs only a key.</helix-text>
        </section>
        <section id="timeouts">
          <helix-text
            as="h4"
            variant="subheading"
          >
            Timeouts
          </helix-text>
          <helix-text as="p">
            A request that takes longer than the timeout fails with a code you can show.
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
            Each method returns a promise. Errors include a code and a message you can show to your
            users.
          </helix-text>
        </section>
        <section id="support">
          <helix-text
            as="h2"
            variant="title"
          >
            Support
          </helix-text>
          <helix-text as="p">
            Questions go to the issue tracker, and security reports to the address in the policy.
          </helix-text>
        </section>
      </div>

      <helix-outline
        className="rail"
        label="On this page"
        variant="rail"
      >
        <a href="#overview">Overview</a>
        <a href="#install">Install</a>
        <a
          data-level="2"
          href="#requirements"
        >
          Requirements
        </a>
        <a href="#usage">Usage</a>
        <a
          data-level="2"
          href="#options"
        >
          Options
        </a>
        <a
          data-level="3"
          href="#timeouts"
        >
          Timeouts
        </a>
        <a href="#api">API</a>
        <a href="#support">Support</a>
      </helix-outline>
    </div>
  )
}
