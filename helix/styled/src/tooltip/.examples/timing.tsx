export function Example() {
  return (
    <helix-flex align="center" gap="lg" wrap>
      <helix-tooltip content="Opens at once, and forgives a wobble" delay={0} delay-out="600">
        <helix-button>Eager</helix-button>
      </helix-tooltip>

      <helix-tooltip content="Waits, so a sweep across the row shows nothing" delay={700}>
        <helix-button>Patient</helix-button>
      </helix-tooltip>

      <helix-tooltip content="Further off, for a trigger with its own outline" offset={16}>
        <helix-button>Roomy</helix-button>
      </helix-tooltip>
    </helix-flex>
  )
}
