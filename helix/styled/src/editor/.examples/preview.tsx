const CODE = `const total = orders.reduce((sum, order) => sum + order.amount, 0)
console.log(totl)`

/* A problem, as a linter or a language server would report it. */
const PROBLEMS = [{ from: 79, message: 'Cannot find name totl. Did you mean total?', to: 83 }]

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-editor has the frame connect CodeMirror; on your page, connectEditor does. */}
      <helix-editor
        data-preview-editor
        diagnostics={PROBLEMS}
        label="Query"
        language="ts"
        line-numbers
        value={CODE}
      />
    </>
  )
}
