import './preview.css'

export function Example() {
  return (
    <div className="layout">
      <helix-outline
        className="nav"
        label="On this page"
      >
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
            Install the package with your package manager, then import it once in the entry file of
            your app before you use it.
          </helix-text>
        </section>
        <section id="requirements">
          <helix-text
            as="h2"
            variant="title"
          >
            Requirements
          </helix-text>
          <helix-text as="p">
            The package needs a current version of Node.js and a browser that supports custom
            elements and modern JavaScript.
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
            Create a client with your API key, then call its methods to read and write the projects,
            files, and users in your account.
          </helix-text>
        </section>
        <section id="options">
          <helix-text
            as="h2"
            variant="title"
          >
            Options
          </helix-text>
          <helix-text as="p">
            Pass options when you create the client to set the request timeout, the number of
            retries, and the base URL to use.
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
            Each method returns a promise. Errors include a code and a message that you can show to
            the people who use your app.
          </helix-text>
        </section>
      </div>
    </div>
  )
}
