import { AllActivity } from '../src/activity'
import { Page } from '../src/page'

/** `/activity`: what happened across every project. */
export default function ActivityRoute() {
  return (
    <Page>
      <AllActivity />
    </Page>
  )
}
