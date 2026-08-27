import './preview.css'

export function Example() {
  return (
    <div className="row">
      <helix-headless-skeleton className="avatar"></helix-headless-skeleton>
      <div className="stack">
        <helix-headless-skeleton className="line-name"></helix-headless-skeleton>
        <helix-headless-skeleton className="line-detail"></helix-headless-skeleton>
      </div>
    </div>
  )
}
