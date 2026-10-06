export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-trend
        formatOptions={{ maximumFractionDigits: 1, style: 'percent' }}
        good="up"
        locale="en-US"
        value={0.124}
      >
        <span slot="label">Revenue</span>
      </helix-trend>
      <helix-trend
        formatOptions={{ maximumFractionDigits: 1, style: 'percent' }}
        good="down"
        locale="en-US"
        value={-0.004}
      >
        <span slot="label">Churn</span>
      </helix-trend>
      <helix-trend
        formatOptions={{ currency: 'USD', maximumFractionDigits: 0, style: 'currency' }}
        good="up"
        locale="en-US"
        value={-1250}
      >
        <span slot="label">Average order</span>
      </helix-trend>
    </helix-flex>
  )
}
