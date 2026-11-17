import './preview.css'

export function Example() {
  return (
    <div>
      The release notes were written by{' '}
      <a
        href="#ada"
        id="ada"
      >
        Ada Lovelace
      </a>{' '}
      <helix-headless-hover-card for="ada">
        <strong>Ada Lovelace</strong>
        <p>Writes the analysis notes and the release notes for the engine.</p>
        <a href="#ada-notes">Read her notes</a>
      </helix-headless-hover-card>{' '}
      and reviewed by the whole team.
    </div>
  )
}
