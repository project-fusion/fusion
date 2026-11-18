/* The first row leaves `emphasis` off, so each tag uses its resting emphasis.
   The second row is `solid`. */
const EMPHASES = [undefined, 'solid'] as const
const TONES = ['neutral', 'primary', 'accent', 'danger', 'info', 'success', 'warning'] as const

/** Capitalizes a word for a label, such as `primary` to `Primary`. */
const title = (word: string) => `${word[0]?.toUpperCase()}${word.slice(1)}`

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
            <helix-tag
              emphasis={emphasis}
              key={tone}
              tone={tone}
            >
              {title(tone)}
            </helix-tag>
          ))}
        </helix-flex>
      ))}
    </helix-flex>
  )
}
