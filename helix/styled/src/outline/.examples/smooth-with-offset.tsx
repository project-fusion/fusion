export function Example() {
  return (
    <helix-flex
      align-items="start"
      gap="xl"
      layout="flank"
      style={{ '--flex-flank-size': '12rem' }}
    >
      <helix-outline
        behavior="smooth"
        label="On this page"
        offset={72}
      ></helix-outline>
      <helix-grid
        gap="2xl"
        style={{
          '--grid-columns': 'minmax(0, 1fr)',
          '--grid-rows': 'repeat(3, minmax(30rem, auto))',
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
              scale="title"
            >
              Install
            </helix-text>
            <helix-text as="p">
              Install the package with your package manager, then import it in the entry file of
              your app.
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
              scale="title"
            >
              Usage
            </helix-text>
            <helix-text as="p">
              Create a client with your API key, then call its methods to read and write your data.
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
              scale="title"
            >
              API
            </helix-text>
            <helix-text as="p">
              Each method returns a promise. Errors include a code and a message you can show to
              your users.
            </helix-text>
          </helix-flex>
        </helix-outline-section>
      </helix-grid>
    </helix-flex>
  )
}
