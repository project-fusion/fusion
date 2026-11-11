import './inline.css'

export function Example() {
  return (
    <div className="inline-details">
      <helix-input
        emphasis="ghost"
        label="Billing email"
        type="email"
        value="billing@acme.co"
      ></helix-input>
      <helix-input
        emphasis="ghost"
        label="Terms"
        value="Net 30"
      ></helix-input>
      <helix-input
        emphasis="ghost"
        label="PO number"
        value="PO-88412"
      ></helix-input>
    </div>
  )
}
