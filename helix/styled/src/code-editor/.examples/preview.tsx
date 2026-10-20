const CODE = `interface Order {
  amount: number
  paid: boolean
}

export function totalPaid(orders: Order[]): number {
  const total = orders
    .filter((order) => order.paid)
    .reduce((sum, order) => sum + order.amount, 0)
  console.log(total)
  return totl
}`

const at = (text: string): number => CODE.indexOf(text)

/* Problems, as a linter or a language server would report them. */
const PROBLEMS = [
  {
    from: at('console'),
    message: 'Unexpected console statement.',
    to: at('console') + 11,
    tone: 'warning' as const,
  },
  { from: at('totl'), message: 'Cannot find name totl. Did you mean total?', to: at('totl') + 4 },
]

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-code-editor has the frame connect CodeMirror; on your page, connectCodeEditor does. */}
      <helix-code-editor
        data-preview-code-editor
        diagnostics={PROBLEMS}
        label="orders.ts"
        language="ts"
        line-numbers
        value={CODE}
      >
        <helix-button slot="actions">Format</helix-button>
      </helix-code-editor>
    </>
  )
}
