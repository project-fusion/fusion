export function Example() {
  return (
    <helix-flex
      align-items="start"
      gap="xl"
      layout="flank"
      style={{ '--flex-flank-size': '12rem' }}
    >
      <helix-outline label="On this page"></helix-outline>
      <helix-grid
        gap="2xl"
        style={{
          '--grid-columns': 'minmax(0, 1fr)',
          '--grid-rows': 'repeat(5, minmax(30rem, auto))',
        }}
      >
        <helix-outline-section
          anchor="install"
          label="Install"
        >
          <helix-flex
            direction="column"
            gap="xs"
          >
            <helix-text
              as="h2"
              variant="title"
            >
              Install
            </helix-text>
            <helix-text as="p">
              Install the package with your package manager, then import it once in the entry file
              of your app before you use it.
            </helix-text>
          </helix-flex>
        </helix-outline-section>
        <helix-outline-section
          anchor="requirements"
          label="Requirements"
          level={2}
        >
          <helix-flex
            direction="column"
            gap="xs"
          >
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
          </helix-flex>
        </helix-outline-section>
        <helix-outline-section
          anchor="usage"
          label="Usage"
        >
          <helix-flex
            direction="column"
            gap="xs"
          >
            <helix-text
              as="h2"
              variant="title"
            >
              Usage
            </helix-text>
            <helix-text as="p">
              Create a client with your API key, then call its methods to read and write the
              projects, files, and users in your account.
            </helix-text>
          </helix-flex>
        </helix-outline-section>
        <helix-outline-section
          anchor="options"
          label="Options"
          level={2}
        >
          <helix-flex
            direction="column"
            gap="xs"
          >
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
          </helix-flex>
        </helix-outline-section>
        <helix-outline-section
          anchor="api"
          label="API"
        >
          <helix-flex
            direction="column"
            gap="xs"
          >
            <helix-text
              as="h2"
              variant="title"
            >
              API
            </helix-text>
            <helix-text as="p">
              Each method returns a promise. Errors include a code and a message that you can show
              to the people who use your app.
            </helix-text>
          </helix-flex>
        </helix-outline-section>
      </helix-grid>
    </helix-flex>
  )
}
