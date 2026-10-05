const code = `const save = document.querySelector('helix-button')
save?.addEventListener('click', () => console.log('Saved'))`

// A stand-in for Shiki or Prism: it escapes the code and sets the keywords in bold.
const KEYWORDS = /\b(const|let|function|return|import|from)\b/g

const highlight = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(KEYWORDS, '<b>$1</b>')

export function Example() {
  return (
    <helix-code-block
      highlight={highlight}
      label="save.ts"
    >
      {code}
    </helix-code-block>
  )
}
