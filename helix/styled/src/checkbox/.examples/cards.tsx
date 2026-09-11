export function Example() {
  return (
    <helix-checkbox-group
      label="Label"
      name="addons"
    >
      <helix-checkbox
        default-checked
        value="backups"
        variant="card"
      >
        <helix-flex
          direction="column"
          gap="2xs"
        >
          <helix-text
            as="span"
            variant="body-strong"
          >
            Backups
          </helix-text>
          <helix-text
            as="span"
            emphasis="subtle"
            variant="caption"
          >
            Nightly, kept for thirty days.
          </helix-text>
        </helix-flex>
      </helix-checkbox>
      <helix-checkbox
        value="audit"
        variant="card"
      >
        <helix-flex
          direction="column"
          gap="2xs"
        >
          <helix-text
            as="span"
            variant="body-strong"
          >
            Audit log
          </helix-text>
          <helix-text
            as="span"
            emphasis="subtle"
            variant="caption"
          >
            Every action, with who and when.
          </helix-text>
        </helix-flex>
      </helix-checkbox>
    </helix-checkbox-group>
  )
}
