export function Example() {
  return (
    <helix-radio-group
      default-value="team"
      hint="You can change your plan at any time"
      label="Plan"
      name="plan"
    >
      <helix-radio
        separation="outlined"
        value="solo"
      >
        <helix-flex
          direction="column"
          gap="2xs"
        >
          <helix-text
            as="span"
            variant="body-strong"
          >
            Personal
          </helix-text>
          <helix-text
            as="span"
            emphasis="subtle"
            variant="caption"
          >
            One seat with every feature.
          </helix-text>
        </helix-flex>
      </helix-radio>
      <helix-radio
        separation="outlined"
        value="team"
      >
        <helix-flex
          direction="column"
          gap="2xs"
        >
          <helix-text
            as="span"
            variant="body-strong"
          >
            Team
          </helix-text>
          <helix-text
            as="span"
            emphasis="subtle"
            variant="caption"
          >
            Up to 10 seats, with shared billing.
          </helix-text>
        </helix-flex>
      </helix-radio>
    </helix-radio-group>
  )
}
