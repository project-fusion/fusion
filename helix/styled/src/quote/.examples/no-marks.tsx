import './no-marks.css'

export function Example() {
  return (
    <helix-text scale="body">
      The sign on the door read{' '}
      <helix-quote
        className="marked"
        no-marks
      >
        back in five minutes
      </helix-quote>{' '}
      all afternoon.
    </helix-text>
  )
}
