'use client'

import { useEffect, useState } from 'react'
import mark from '@/components/fusion-mark/fusion-mark.module.css'
import styles from './open.module.css'

/** Whether this browser is on a phone or a tablet, where Expo Go runs. */
const onPhone = (): boolean =>
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  /* iPadOS reports a Mac, and a Mac has no touch screen. */
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

/**
 * What the page offers, by the device it is on.
 *
 * **On a phone, the link into Expo Go, followed as the page loads**, which is
 * what makes a scanned code open the gallery in one step: `exps://` where the
 * page is served over HTTPS, and `exp://` on a local server. The button stays
 * for a phone that asked first, and the store links for one without Expo Go.
 *
 * **On a computer, a code for this page**, since Expo Go runs on a phone and
 * the camera is the way there. Nothing is followed until the device is known.
 *
 * **The server draws the phone's buttons with the link into production**,
 * `fallback`, so the button works before the page's script runs, or where it
 * never does. The page then names its own host.
 */
export function OpenInExpoGo({
  example,
  fallback,
  family,
}: {
  example: string
  fallback: string
  family: string
}) {
  const [device, setDevice] = useState<'computer' | 'phone'>()
  const [target, setTarget] = useState(fallback)
  const [here, setHere] = useState<string>()

  useEffect(() => {
    const scheme = window.location.protocol === 'https:' ? 'exps' : 'exp'
    const link = `${scheme}://${window.location.host}/helix/app/--/${family}/${example}`
    const phone = onPhone()
    setTarget(link)
    setHere(window.location.href)
    setDevice(phone ? 'phone' : 'computer')
  }, [example, family])

  /* Followed once the button holds the link, so a phone that refuses the
     scheme still has a working button: started in the same update, the
     navigation kept the link from reaching the page. */
  useEffect(() => {
    if (device === 'phone') {
      window.location.href = target
    }
  }, [device, target])

  if (device === 'computer' && here) {
    return (
      <div className={styles.computer}>
        <helix-qr-code
          class={styles.code}
          correction="H"
          label="Open the example on your phone"
          shape="square"
          value={here}
        >
          <helix-icon class={mark.mark} name="fusion" slot="logo"></helix-icon>
        </helix-qr-code>
        <helix-list kind="ordered" label="Steps">
          <helix-list-item>
            Install Expo Go
            <span slot="description">Free on the App Store and Google Play.</span>
          </helix-list-item>
          <helix-list-item>
            Scan the code with your camera
            <span slot="description">Your phone asks to open Expo Go.</span>
          </helix-list-item>
        </helix-list>
      </div>
    )
  }
  return (
    <div className={styles.actions} data-density="lg">
      <a data-button="solid" data-button-tone="primary" href={target}>
        Open in Expo Go
      </a>
      <a data-button="subtle" href="https://apps.apple.com/app/expo-go/id982107779">
        Expo Go on the App Store
      </a>
      <a
        data-button="subtle"
        href="https://play.google.com/store/apps/details?id=host.exp.exponent"
      >
        Expo Go on Google Play
      </a>
    </div>
  )
}
