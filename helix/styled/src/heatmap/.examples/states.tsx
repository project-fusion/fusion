export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-heatmap
        for="pending"
        label="Uptime, last 30 days"
        loading
      >
        <table
          data-hidden-visually
          id="pending"
        >
          <caption>Uptime</caption>
          <tbody />
        </table>
      </helix-heatmap>
      <helix-heatmap
        empty-text="No readings in this range"
        for="none"
        label="Uptime, last 30 days"
      >
        <table
          data-hidden-visually
          id="none"
        >
          <caption>Uptime</caption>
          <tbody />
        </table>
      </helix-heatmap>
    </helix-flex>
  )
}
