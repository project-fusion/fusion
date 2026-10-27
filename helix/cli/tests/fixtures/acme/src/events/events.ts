/** Acme's web events and the details they carry. */

export interface ChoiceDetail {
  /** The `value` of the tab. */
  value: string
}

export interface ActivateDetail extends ChoiceDetail {
  /** The `value` of the tab chosen before. */
  previous?: string
}

export interface PressDetail {
  /** What the press came from. */
  pointerType: 'keyboard' | 'mouse' | 'pen' | 'touch'
}

/** Sent once a tab is chosen. */
export class AcmeActivateEvent extends CustomEvent<ActivateDetail> {}

/** Sent before a tab is chosen or pressed, which a handler may refuse. */
export class AcmeBeforeEvent extends CustomEvent<ChoiceDetail> {}

/** Sent when a button is pressed. */
export class AcmePressEvent extends CustomEvent<PressDetail> {}
