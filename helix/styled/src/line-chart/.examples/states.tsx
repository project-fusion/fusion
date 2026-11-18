export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <table
        data-hidden-visually
        id="sessions"
      >
        <caption>Sessions a month</caption>
        <tbody />
      </table>
      <helix-line-chart
        for="sessions"
        loading
      ></helix-line-chart>
      <table
        data-hidden-visually
        id="errors"
      >
        <caption>Errors a month</caption>
        <tbody />
      </table>
      <helix-line-chart
        empty-text="No errors recorded"
        for="errors"
      ></helix-line-chart>
    </helix-flex>
  )
}
