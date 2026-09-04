export function Example() {
  return (
    <helix-flex gap="md">
      <a
        data-card
        href="#one"
      >
        <helix-card>
          <helix-text
            as="h3"
            slot="header"
          >
            Item One
          </helix-text>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </helix-card>
      </a>
      <a
        aria-current="page"
        data-card
        href="#two"
      >
        <helix-card>
          <helix-text
            as="h3"
            slot="header"
          >
            Item Two
          </helix-text>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </helix-card>
      </a>
    </helix-flex>
  )
}
