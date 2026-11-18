export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <table
        data-hidden-visually
        id="revenue"
      >
        <caption>Revenue by quarter</caption>
        <tbody />
      </table>
      <helix-bar-chart
        for="revenue"
        loading
      ></helix-bar-chart>
      <table
        data-hidden-visually
        id="refunds"
      >
        <caption>Refunds by quarter</caption>
        <tbody />
      </table>
      <helix-bar-chart
        empty-text="No refunds this year"
        for="refunds"
      ></helix-bar-chart>
    </helix-flex>
  )
}
