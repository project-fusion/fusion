import './pointer.css'

export function Example() {
  return (
    <div className="stage">
      <helix-aura
        interaction="ripple"
        interactive
        reach={1.6}
        speed={0.6}
        variance={0.4}
      ></helix-aura>
    </div>
  )
}
