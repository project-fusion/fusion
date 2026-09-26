/* The matrix the component is: four emphases against three tones. Each row is
   one emphasis, so a reader compares tones across and emphases down.

   The default of each axis is written as `undefined` rather than as its name,
   because that is what a consumer writes -- nothing. React drops an undefined
   attribute, so the first button in the first row renders as a bare
   `<helix-button>`, which is the one every other cell is a departure from. */
const EMPHASES = [undefined, 'solid', 'subtle', 'ghost'] as const
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
            <helix-button
              emphasis={emphasis}
              key={tone ?? 'default'}
              tone={tone}
            >
              Button
            </helix-button>
          ))}
        </helix-flex>
      ))}
    </helix-flex>
  )
}
