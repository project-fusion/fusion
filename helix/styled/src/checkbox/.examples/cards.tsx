export function Example() {
  return (
    <helix-checkbox-group
      label="Add-ons"
      name="addons"
    >
      <helix-checkbox
        default-checked
        separation="outlined"
        value="backups"
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
            Nightly backups, kept for 30 days.
          </helix-text>
        </helix-flex>
      </helix-checkbox>
      <helix-checkbox
        separation="outlined"
        value="audit"
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
            A record of each change and who made it.
          </helix-text>
        </helix-flex>
      </helix-checkbox>
    </helix-checkbox-group>
  )
}
