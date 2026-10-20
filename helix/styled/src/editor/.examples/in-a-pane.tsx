import './in-a-pane.css'

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-editor has the frame connect ProseMirror; on your page, connectEditor does. */}
      <div className="pane">
        <helix-editor
          data-preview-editor
          fill
          label="Launch plan"
          separation="plain"
        >
          <div>
            <h1>Launch plan</h1>
            <p>
              The launch moves to <strong>October 14</strong>, after the beta closes.
            </p>
            <h2>Before launch</h2>
            <ul>
              <li>
                <p>Close the beta and thank the testers</p>
              </li>
              <li>
                <p>Publish the pricing page</p>
              </li>
              <li>
                <p>Brief support on the new plans</p>
              </li>
            </ul>
            <h2>Launch day</h2>
            <p>Send the announcement at 9:00 and post the changelog.</p>
            <pre>
              <code>npm install @acme/sdk@3</code>
            </pre>
            <h2>After launch</h2>
            <p>Watch the error rate for a week and collect the first reviews.</p>
          </div>
        </helix-editor>
      </div>
    </>
  )
}
