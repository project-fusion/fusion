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
            Website redesign
          </helix-text>
          <p>Updated 2 hours ago by Alex Kim.</p>
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
            Mobile app
          </helix-text>
          <p>Updated yesterday by Maria Lopez.</p>
        </helix-card>
      </a>
    </helix-flex>
  )
}
