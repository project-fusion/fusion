export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <table
        data-hidden-visually
        id="visits"
      >
        <caption>Visits a month by source</caption>
        <tbody />
      </table>
      <helix-area-chart
        for="visits"
        loading
      ></helix-area-chart>
      <table
        data-hidden-visually
        id="campaigns"
      >
        <caption>Visits a month by campaign</caption>
        <tbody />
      </table>
      <helix-area-chart
        empty-text="No campaign visits yet"
        for="campaigns"
      ></helix-area-chart>
    </helix-flex>
  )
}
