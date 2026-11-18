export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <table
        data-hidden-visually
        id="pages"
      >
        <caption>Page weight and load time</caption>
        <tbody />
      </table>
      <helix-scatter-chart
        for="pages"
        loading
      ></helix-scatter-chart>
      <table
        data-hidden-visually
        id="images"
      >
        <caption>Image weight and load time</caption>
        <tbody />
      </table>
      <helix-scatter-chart
        empty-text="No images measured yet"
        for="images"
      ></helix-scatter-chart>
    </helix-flex>
  )
}
