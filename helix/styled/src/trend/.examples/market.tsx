import './market.css'

export function Example() {
  return (
    <helix-flex
      className="market"
      direction="column"
      gap="md"
    >
      <helix-trend
        color-by="movement"
        formatOptions={{ maximumFractionDigits: 2, style: 'percent' }}
        locale="en-US"
        value={0.0124}
      >
        <span slot="label">Index</span>
      </helix-trend>
      <helix-trend
        color-by="movement"
        formatOptions={{ maximumFractionDigits: 2, style: 'percent' }}
        locale="en-US"
        value={-0.0087}
      >
        <span slot="label">Share price</span>
      </helix-trend>
      <helix-trend
        color-by="movement"
        formatOptions={{ maximumFractionDigits: 2, style: 'percent' }}
        locale="en-US"
        value={0}
      >
        <span slot="label">Bond yield</span>
      </helix-trend>
    </helix-flex>
  )
}
