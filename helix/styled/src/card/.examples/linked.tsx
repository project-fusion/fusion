export function Example() {
  return (
    <helix-flex gap="md">
      <a
        data-card
        href="#one"
      >
        <helix-card aria-labelledby="redesign-title">
          <helix-text
            as="h3"
            id="redesign-title"
            scale="title"
            slot="header"
          >
            Website redesign
          </helix-text>
          <helix-text as="p">Updated 2 hours ago by Alex Kim.</helix-text>
        </helix-card>
      </a>
      <a
        aria-current="page"
        data-card
        href="#two"
      >
        <helix-card aria-labelledby="app-title">
          <helix-text
            as="h3"
            id="app-title"
            scale="title"
            slot="header"
          >
            Mobile app
          </helix-text>
          <helix-text as="p">Updated yesterday by Maria Lopez.</helix-text>
        </helix-card>
      </a>
    </helix-flex>
  )
}
