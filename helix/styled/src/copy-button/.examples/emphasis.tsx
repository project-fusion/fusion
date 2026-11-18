/* Each row is one emphasis and each column is one tone. `undefined` leaves the
   attribute off, so the first button uses both defaults. */
const EMPHASES = [undefined, 'solid', 'subtle', 'outlined'] as const
const TONES = [undefined, 'primary', 'danger'] as const

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      {EMPHASES.map((emphasis) => (
        <helix-flex
          gap="sm"
          key={emphasis ?? 'default'}
        >
          {TONES.map((tone) => (
            <helix-copy-button
              emphasis={emphasis}
              key={tone ?? 'default'}
              tone={tone}
              value="bun add @fusion.dev/helix"
            ></helix-copy-button>
          ))}
        </helix-flex>
      ))}
    </helix-flex>
  )
}
