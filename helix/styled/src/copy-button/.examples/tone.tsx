/* The first row leaves `emphasis` off, so each button uses its resting
   emphasis. The second row is `solid`. */
const EMPHASES = [undefined, 'solid'] as const
const TONES = ['neutral', 'primary', 'accent', 'danger', 'info', 'success', 'warning'] as const

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
          wrap
        >
          {TONES.map((tone) => (
            <helix-copy-button
              emphasis={emphasis}
              key={tone}
              tone={tone}
              value="bun add @fusion.dev/helix"
            ></helix-copy-button>
          ))}
        </helix-flex>
      ))}
    </helix-flex>
  )
}
