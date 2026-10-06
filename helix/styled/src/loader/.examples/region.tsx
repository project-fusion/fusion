export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-loader
        for="orders"
        label="Loading orders"
      ></helix-loader>
      <section
        aria-label="Orders"
        id="orders"
      >
        <helix-text variant="body">Orders appear here once they load.</helix-text>
      </section>
    </helix-flex>
  )
}
