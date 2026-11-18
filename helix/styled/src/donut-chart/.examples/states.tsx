export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <table
        data-hidden-visually
        id="traffic"
      >
        <caption>Sessions by source</caption>
        <tbody />
      </table>
      <helix-donut-chart
        for="traffic"
        loading
      ></helix-donut-chart>
      <table
        data-hidden-visually
        id="spend"
      >
        <caption>Spend by category</caption>
        <tbody />
      </table>
      <helix-donut-chart
        empty-text="No spend this month"
        for="spend"
      ></helix-donut-chart>
    </helix-flex>
  )
}
