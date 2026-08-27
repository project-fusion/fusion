export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <helix-flex gap="sm" wrap>
        <helix-tag>Neutral</helix-tag>
        <helix-tag tone="primary">Primary</helix-tag>
        <helix-tag tone="success">Success</helix-tag>
        <helix-tag tone="warning">Warning</helix-tag>
        <helix-tag tone="danger">Danger</helix-tag>
      </helix-flex>

      <helix-flex gap="sm" wrap>
        <helix-tag emphasis="solid" tone="primary">
          Solid
        </helix-tag>
        <helix-tag emphasis="solid" tone="success">
          Solid
        </helix-tag>
        <helix-tag emphasis="solid" tone="warning">
          Solid
        </helix-tag>
        <helix-tag emphasis="solid" tone="danger">
          Solid
        </helix-tag>
      </helix-flex>

      <helix-flex gap="sm" wrap>
        <helix-tag emphasis="outlined" tone="primary">
          Outlined
        </helix-tag>
        <helix-tag emphasis="outlined" tone="success">
          Outlined
        </helix-tag>
        <helix-tag emphasis="outlined" tone="warning">
          Outlined
        </helix-tag>
        <helix-tag emphasis="outlined" tone="danger">
          Outlined
        </helix-tag>
      </helix-flex>
    </helix-flex>
  )
}
