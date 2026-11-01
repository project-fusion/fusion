/* Every scale on the scale, from largest to smallest. Each sample shows the
   name of its scale. */
const VARIANTS = [
  'display',
  'heading',
  'subheading',
  'title',
  'body',
  'body-strong',
  'caption',
  'label',
  'code',
] as const

/** Turns a scale name into a label, such as `body-strong` to `Body strong`. */
const title = (scale: string) => `${scale[0]?.toUpperCase()}${scale.slice(1)}`.replace('-', ' ')

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      {/* Each sample is a paragraph. `scale` sets only the type style. */}
      {VARIANTS.map((scale) => (
        <helix-text
          as="p"
          key={scale}
          scale={scale}
        >
          {title(scale)}
        </helix-text>
      ))}
    </helix-flex>
  )
}
