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
        <helix-text slot="label">Index</helix-text>
      </helix-trend>
      <helix-trend
        color-by="movement"
        formatOptions={{ maximumFractionDigits: 2, style: 'percent' }}
        locale="en-US"
        value={-0.0087}
      >
        <helix-text slot="label">Share price</helix-text>
      </helix-trend>
      <helix-trend
        color-by="movement"
        formatOptions={{ maximumFractionDigits: 2, style: 'percent' }}
        locale="en-US"
        value={0}
      >
        <helix-text slot="label">Bond yield</helix-text>
      </helix-trend>
    </helix-flex>
  )
}
