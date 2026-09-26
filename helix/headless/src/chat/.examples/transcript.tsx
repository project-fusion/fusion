import './transcript.css'

/* Steps of different lengths, so the turns have different heights. */
const STEPS = [
  'Installed 412 packages.',
  'Compiled the project in 3.1 seconds.',
  'Ran 1,589 tests. All of them passed, including the 11 that run in a browser.',
  'Updated three screenshots. Only the settings page changed, because the save button moved to the top of the form.',
  'Uploaded the build.',
]

const turns = Array.from({ length: 2000 }, (_, index) => ({
  author: index % 5 === 4 ? 'me' : 'them',
  key: String(index),
  text: index % 5 === 4 ? `Continue from step ${index + 1}.` : `${index + 1}. ${STEPS[index % 5]}`,
}))

export function Example() {
  return (
    <helix-headless-chat
      label="Build agent"
      turns={turns}
    >
      <strong slot="header">Build agent</strong>
    </helix-headless-chat>
  )
}
