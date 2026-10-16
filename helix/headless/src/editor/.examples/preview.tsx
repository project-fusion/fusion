import './preview.css'

const CODE = `const total = orders.reduce((sum, order) => sum + order.amount, 0)
console.log(totl)`

const PROBLEMS = [{ from: 79, message: 'Cannot find name totl. Did you mean total?', to: 83 }]

export function Example() {
  return (
    <helix-headless-editor
      diagnostics={PROBLEMS}
      label="Query"
      language="ts"
      value={CODE}
    />
  )
}
