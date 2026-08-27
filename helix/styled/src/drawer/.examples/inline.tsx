export function Example() {
  return (
    <helix-drawer default-open label="Filters" modal="false">
      {' '}
      <helix-flex direction="column" gap="sm">
        {' '}
        <helix-checkbox>Open</helix-checkbox> <helix-checkbox>In review</helix-checkbox>{' '}
        <helix-checkbox>Closed</helix-checkbox>{' '}
      </helix-flex>{' '}
    </helix-drawer>
  )
}
