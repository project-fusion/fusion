/* The first row adds a neutral tag with no tone. The `solid` and `outlined`
   rows show the four tones in that emphasis. */
const TONES = ['primary', 'success', 'warning', 'danger'] as const
const EMPHASES = ['solid', 'outlined'] as const

/** Capitalizes a word for a label, such as `primary` to `Primary`. */
const title = (word: string) => `${word[0]?.toUpperCase()}${word.slice(1)}`

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-flex
        gap="sm"
        wrap
      >
        <helix-tag>Neutral</helix-tag>
        {TONES.map((tone) => (
          <helix-tag
            key={tone}
            tone={tone}
          >
            {title(tone)}
          </helix-tag>
        ))}
      </helix-flex>

      {EMPHASES.map((emphasis) => (
        <helix-flex
          gap="sm"
          key={emphasis}
          wrap
        >
          {TONES.map((tone) => (
            <helix-tag
              emphasis={emphasis}
              key={tone}
              tone={tone}
            >
              {title(emphasis)}
            </helix-tag>
          ))}
        </helix-flex>
      ))}
    </helix-flex>
  )
}
