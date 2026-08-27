export function Example() {
  return (
    <helix-flex gap="sm">
      <helix-button command="--toggle" commandfor="filters" emphasis="solid" tone="primary">
        Filters
      </helix-button>

      <helix-popover id="filters" label="Filters" placement="bottom-end">
        <helix-checkbox-group label="Status">
          <helix-checkbox label="Open" name="status" value="open"></helix-checkbox>
          <helix-checkbox label="Merged" name="status" value="merged"></helix-checkbox>
        </helix-checkbox-group>
      </helix-popover>
    </helix-flex>
  )
}
