import './comment.css'

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-editor has the frame connect ProseMirror; on your page, connectEditor does. */}
      <helix-editor
        data-preview-editor
        label="Comment"
        placeholder="Add a comment"
        tools="marks link lists"
      >
        <div data-prose="" />
        <helix-button
          emphasis="solid"
          slot="actions"
          tone="primary"
        >
          Post
        </helix-button>
      </helix-editor>
    </>
  )
}
