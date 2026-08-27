import './preview.css'

export function Example() {
  return (
    <helix-headless-accordion>
      <helix-headless-accordion-item>
        <span slot="summary">Accordion Item One</span>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
        labore.
      </helix-headless-accordion-item>
      <helix-headless-accordion-item>
        <span slot="summary">Accordion Item Two</span>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </helix-headless-accordion-item>
    </helix-headless-accordion>
  )
}
