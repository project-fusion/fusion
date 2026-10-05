import './expandable.css'

const code = `:root {
  --brand: oklch(0.55 0.2 260);
  --brand-ink: oklch(0.98 0 0);
  --radius: 0.5rem;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.125rem;
}`

export function Example() {
  return (
    <helix-code-block
      expandable
      label="tokens.css"
    >
      {code}
    </helix-code-block>
  )
}
