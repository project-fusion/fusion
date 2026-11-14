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
        <helix-text slot="label">Revenue</helix-text>
      </helix-trend>
      <helix-trend
        formatOptions={{ maximumFractionDigits: 1, style: 'percent' }}
        good="down"
        locale="en-US"
        value={-0.004}
      >
        <helix-text slot="label">Churn</helix-text>
      </helix-trend>
      <helix-trend
        formatOptions={{ currency: 'USD', maximumFractionDigits: 0, style: 'currency' }}
        good="up"
        locale="en-US"
        value={-1250}
      >
        <helix-text slot="label">Average order</helix-text>
      </helix-trend>
    </helix-flex>
  )
}
