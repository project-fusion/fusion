/**
 * The words one preview says, which is every string on the page that belongs to
 * a company rather than to a browser.
 *
 * **The copy is a company's, not ours.** A line like "every foreground measured
 * against the ground it lands on" is Fusion's pitch wearing a customer's
 * header, and a reader judging a palette should not be reading about the
 * palette. Nothing here refers to theming at all.
 */

type State = 'danger' | 'success' | 'warning'

/**
 * One company's words.
 *
 * What is *not* here is as deliberate: "Sign in", "Work email", "Privacy",
 * "Terms" and "Status" say the same thing on a freight platform and in a shop,
 * so they are written once in whichever layout renders them. A string earns a
 * place in here by differing between companies, not by being copy.
 */
export interface Context {
  /**
   * What the toolbar of the application layout does.
   */
  action: string
  /** The bar chart: its heading, its accessible table, and the numbers in it. */
  chart: {
    caption: string
    columns: readonly [string, string]
    heading: string
    label: string
    rows: readonly (readonly [string, number, number])[]
  }
  /** The closing band, on the brand fill. */
  close: { body: string; cta: string; heading: string }
  /**
   * What the editorial layout needs and no other layout has.
   */
  editorial: {
    contact: string
    lead: string
    /**
     * What sits in the rail beside the lead.
     *
     * **A place, and not the company again.** The masthead carries the name, so
     * a rail label repeating it said the same word twice within an inch. What
     * belongs in a margin is the thing the paragraph beside it cannot say, and
     * for a lead that is where the company is.
     */
    place: string
    posts: readonly { minutes: number; title: string; when: string }[]
    sections: readonly { body: readonly string[]; rail: string }[]
  }
  /** The company whose page this is. */
  company: string
  /** The drawer: one row of the table, opened. */
  detail: {
    cta: string
    heading: string
    label: string
    lead: { caption: string; value: string }
    status: { caption: string; state: State; words: string }
    trail: { caption: string; value: string }
  }
  /** The three cards. Icons are names in `@fusion.dev/helix-icons`. */
  features: readonly { body: string; icon: string; title: string }[]
  /** The recessed band of numbers. */
  figures: readonly { figure: string; label: string }[]
  /** Above the fold. `secondary` is also the header's own button. */
  hero: {
    assurance: string
    badge: string
    body: string
    headline: string
    note: string
    primary: string
    secondary: string
  }
  /** What a reader picks this context by. */
  label: string
  /**
   * What the map layout needs: a panel over a map, and the places on it.
   *
   * **The table's four rows, put where they happen**, each keeping its state,
   * so the three status colors meet the map's ground the way they meet a card
   * everywhere else in the preview. Coordinates are OpenStreetMap's.
   */
  map: {
    heading: string
    /** What the map region is called, which a screen reader announces. */
    label: string
    lead: string
    places: readonly {
      /** The row the place stands for. */
      detail: string
      label: string
      lat: number
      lng: number
      /**
       * Where the row starts, drawn as a route to the place in the row's
       * tone: the lane from its port, the order from the mill. Absent where
       * a row is a place rather than a journey.
       */
      route?: { from: string; lat: number; lng: number }
      state: State
      status: string
    }[]
    /**
     * Something on its way, where the row's journey is under way: where it is,
     * which way it faces, how sure the feed is, and the words a reader hears.
     */
    position?: {
      accuracy: number
      description: string
      heading: number
      label: string
      lat: number
      lng: number
      state: State
    }
  }
  /** Which mark `Mark` draws. */
  mark: 'brand' | 'deckle' | 'strata' | 'weft'
  /** The three menu items, which exist to be opened rather than read. */
  menu: readonly [string, string, string]
  /** The header's links. The first is the one anchor on the page that resolves. */
  nav: readonly { href: string; label: string }[]
  /** The line beside the progress bar. */
  progress: string
  /** The table: its heading, its columns and its rows. */
  table: {
    columns: readonly [string, string, string]
    heading: string
    label: string
    link: string
    rows: readonly { state: State; status: string; subject: string; when: string }[]
  }
  /** The form card beside the table. */
  trial: {
    checkbox: string
    cta: string
    heading: string
    secondary: string
    taken: { feedback: string; label: string; value: string }
  }
  /** What the builder stores, and what names the generated string. */
  value: string
  /** The dialog the hero opens. */
  walkthrough: { body: string; cta: string; heading: string }
}

/**
 * The contexts, in the order the builder offers them.
 *
 * Three rather than one of everything. Each is a different *kind* of product
 * rather than a different industry: a platform somebody works in all day, a
 * publication somebody reads, and a shop somebody buys from. A fourth freight
 * company would cost the same bytes and answer nothing new.
 *
 * The first is the resting one.
 */
export const CONTEXTS: readonly Context[] = [
  {
    action: 'New shipment',
    chart: {
      caption: 'On-time arrivals by month, as a percentage',
      columns: ['On time', 'Recovered'],
      heading: 'On-time arrivals',
      label: 'On-time arrivals by month',
      rows: [
        ['Jan', 91, 4],
        ['Feb', 88, 7],
        ['Mar', 94, 3],
        ['Apr', 96, 2],
        ['May', 93, 5],
        ['Jun', 98, 1],
      ],
    },
    close: {
      body: 'Two weeks of your history, loaded before the call.',
      cta: 'Book a walkthrough',
      heading: 'See it against your own lanes',
    },
    company: 'Strata',
    detail: {
      cta: 'Watch this lane',
      heading: 'Rotterdam to Felixstowe',
      label: 'Lane detail',
      lead: { caption: 'Window', value: '06:00 to 09:30, berth 14' },
      status: { caption: 'Status', state: 'success', words: 'On time' },
      trail: { caption: 'Last reading', value: 'Nineteen minutes ago, from the terminal feed.' },
    },
    editorial: {
      contact: 'hello@strata.example',
      lead: 'We move freight data for a living, and write down what we learn about the parts nobody sees.',
      place: 'Rotterdam',
      posts: [
        { minutes: 9, title: 'Why a berth window is not a time', when: 'Aug 2026' },
        { minutes: 14, title: 'Reading a terminal feed nobody documents', when: 'Jul 2026' },
        { minutes: 6, title: 'The forty minutes that decide a lane', when: 'Jun 2026' },
        { minutes: 11, title: 'What we got wrong about arrival estimates', when: 'May 2026' },
      ],
      sections: [
        {
          body: [
            'Strata reads schedules, terminals and telematics across two thousand four hundred lanes, and tells an operator which of today’s shipments is about to be late while there is still something to do about it. The median warning arrives nineteen minutes before the miss, which is roughly the time it takes to call a terminal and move a booking.',
            'Nineteen minutes is not a number anybody chose. It falls out of the feeds: a berth window closes on a schedule nobody publishes, a crane goes down and the terminal knows before it tells the carrier, and the telematics on the truck already say it will not make the gate. All three facts were sitting there separately. What was missing was somebody reading them together, on every lane, at the same time.',
          ],
          rail: 'What we do',
        },
        {
          body: [
            'Small teams, close to the operators. Every engineer here has spent a week in a control room, because a dashboard designed away from one is a dashboard nobody opens twice. The people who use this have four screens and a phone that does not stop, and anything asking more of their attention than it returns gets closed by Tuesday.',
            'We ship on Thursdays and read the support queue on Fridays. Not as a ritual: the queue is the only place where the gap between what was built and what somebody needed shows up in words rather than in a metric, and words are the part you can act on.',
          ],
          rail: 'How we build',
        },
        {
          body: [
            'Everything here is written by whoever did the work. There is no content team and nothing is written to rank for anything. When a feed changes shape at three in the morning and somebody spends a day working out why, that day is worth a page, and the page is worth more if it says what actually happened rather than what would have been tidier.',
          ],
          rail: 'What we publish',
        },
      ],
    },
    features: [
      {
        body: 'Every route, every stop, every exception, in one place and current to the minute.',
        icon: 'gauge',
        title: 'One view of the fleet',
      },
      {
        body: 'Delays surface before they cascade, with the three moves that recover the schedule.',
        icon: 'pulse',
        title: 'Warnings that arrive early',
      },
      {
        body: 'Read your own data out whenever you like. No export queue, no support ticket.',
        icon: 'share-network',
        title: 'Yours to take with you',
      },
    ],
    figures: [
      { figure: '2,400', label: 'Lanes watched' },
      { figure: '19 min', label: 'Median warning lead' },
      { figure: '98.6%', label: 'Window accuracy' },
      { figure: '31', label: 'Ports live' },
    ],
    hero: {
      assurance: 'No card. Two weeks of your own history loaded on the first day.',
      badge: 'New',
      body: 'Strata reads the schedules, the terminals and the telematics, and tells you which of today’s shipments is about to be late while there is still something to do about it.',
      headline: 'Know where the freight is before the customer asks.',
      note: 'Live berth windows, in twelve more ports',
      primary: 'Start free',
      secondary: 'Book a walkthrough',
    },
    label: 'Logistics platform',
    map: {
      heading: 'Arrivals today',
      label: 'Where today’s shipments arrive',
      lead: 'Four lanes land today. The one into Aarhus missed its window, and there is still time to move the booking.',
      places: [
        {
          detail: 'Rotterdam to Felixstowe',
          label: 'Felixstowe',
          lat: 51.9643,
          lng: 1.329,
          route: { from: 'Rotterdam', lat: 51.9244, lng: 4.4778 },
          state: 'success',
          status: 'On time',
        },
        {
          detail: 'Algeciras to Genoa',
          label: 'Genoa',
          lat: 44.4073,
          lng: 8.9339,
          route: { from: 'Algeciras', lat: 36.1312, lng: -5.4474 },
          state: 'warning',
          status: 'Delayed 40m',
        },
        {
          detail: 'Gdansk to Aarhus',
          label: 'Aarhus',
          lat: 56.1496,
          lng: 10.2134,
          route: { from: 'Gdańsk', lat: 54.4288, lng: 18.7983 },
          state: 'danger',
          status: 'Missed window',
        },
        {
          detail: 'Bilbao to Cork',
          label: 'Cork',
          lat: 51.8985,
          lng: -8.4726,
          route: { from: 'Bilbao', lat: 43.263, lng: -2.935 },
          state: 'success',
          status: 'On time',
        },
      ],
      position: {
        accuracy: 8000,
        description: 'Forty minutes behind its window at Genoa',
        heading: 50,
        label: 'Corvina, Algeciras to Genoa',
        lat: 41.0969,
        lng: 3.1814,
        state: 'warning',
      },
    },
    mark: 'strata',
    menu: ['Export today', 'Subscribe to changes', 'Open in the planner'],
    nav: [
      { href: '#features', label: 'Platform' },
      { href: '#pricing', label: 'Pricing' },
      { href: '#docs', label: 'Docs' },
    ],
    progress: '68% of today’s windows closed',
    table: {
      columns: ['Lane', 'Window', 'Status'],
      heading: 'Today',
      label: 'Shipments today',
      link: 'Lane detail',
      rows: [
        {
          state: 'success',
          status: 'On time',
          subject: 'Rotterdam to Felixstowe',
          when: '14:20',
        },
        { state: 'warning', status: 'Delayed 40m', subject: 'Algeciras to Genoa', when: '09:05' },
        { state: 'danger', status: 'Missed window', subject: 'Gdansk to Aarhus', when: '22:45' },
        { state: 'success', status: 'On time', subject: 'Bilbao to Cork', when: '06:30' },
      ],
    },
    trial: {
      checkbox: 'Send me the monthly reliability report',
      cta: 'Create account',
      heading: 'Start a trial',
      secondary: 'Talk to sales',
      taken: {
        feedback: 'That company is already on a plan.',
        label: 'Company',
        value: 'Example Freight',
      },
    },
    value: 'logistics',
    walkthrough: {
      body: 'Thirty minutes with someone who runs Strata day to day. Bring a route you are unhappy with and we will look at it together.',
      cta: 'Request a time',
      heading: 'Book a walkthrough',
    },
  },
  {
    action: 'Commission a piece',
    chart: {
      caption: 'Pieces read to the end by month, as a percentage',
      columns: ['Finished', 'Saved'],
      heading: 'Read to the end',
      label: 'Pieces read to the end by month',
      rows: [
        ['Jan', 71, 12],
        ['Feb', 68, 15],
        ['Mar', 74, 11],
        ['Apr', 79, 9],
        ['May', 76, 13],
        ['Jun', 82, 8],
      ],
    },
    close: {
      body: 'The first month is open. Cancel from the same page you signed up on.',
      cta: 'Start reading',
      heading: 'Read one properly this week',
    },
    company: 'Deckle',
    detail: {
      cta: 'Follow this correspondent',
      heading: 'The last ferry from Durres',
      label: 'Piece detail',
      lead: { caption: 'Filed', value: 'Monday, 06:40, from the coast road' },
      status: { caption: 'Status', state: 'success', words: 'Published' },
      trail: { caption: 'Last edit', value: 'Nineteen minutes ago, by the desk.' },
    },
    editorial: {
      contact: 'desk@deckle.example',
      lead: 'A small desk that commissions long reporting on the things that move slowly.',
      place: 'London',
      posts: [
        { minutes: 18, title: 'The last ferry from Durres', when: 'Aug 2026' },
        { minutes: 12, title: 'What the copper price knows', when: 'Aug 2026' },
        { minutes: 22, title: 'A winter in Kiruna', when: 'Jul 2026' },
        { minutes: 9, title: 'The river that moved', when: 'Jul 2026' },
      ],
      sections: [
        {
          body: [
            'Three editors, thirty-eight countries, and correspondents paid for the time a story actually takes. Nothing is aggregated, and nothing arrives that an editor did not choose to send. One thousand eight hundred and forty pieces so far, and the median one takes eleven minutes to read.',
            'Eleven minutes is a deliberate number. It is long enough to carry an argument and short enough to finish on a train, and it is the length that survived when we stopped asking how long a piece ought to be and started measuring how long the ones people finished actually were. Ninety-four per cent of readers renew after a year, which we take as the only review that counts.',
          ],
          rail: 'The desk',
        },
        {
          body: [
            'The first month is open, and the archive with it. Every issue you paid for stays downloadable for as long as you want it, whether or not you are still subscribing, in a format that will still open in twenty years.',
            'That is not generosity. A subscription holding your library hostage is a subscription you cannot leave, and we would rather you stayed because the writing is good. Cancel from the same page you signed up on, in one click, with no call and no retention offer. We will ask once why you left, and you are free to ignore it.',
          ],
          rail: 'Subscribing',
        },
        {
          body: [
            'Every correction is dated and kept at the foot of the piece it belongs to, with the original wording still visible. A silent edit is a lie about what was published, and a publication that quietly rewrites itself is one nobody can cite.',
          ],
          rail: 'Corrections',
        },
      ],
    },
    features: [
      {
        body: 'Edited, not aggregated. Nothing arrives that an editor did not choose to send.',
        icon: 'book-open-text',
        title: 'One piece a day',
      },
      {
        body: 'Correspondents on the ground, paid for the time a story actually takes.',
        icon: 'compass',
        title: 'Reported where it happens',
      },
      {
        body: 'Every issue you paid for, downloadable, for as long as you want it.',
        icon: 'archive',
        title: 'The archive stays yours',
      },
    ],
    figures: [
      { figure: '1,840', label: 'Pieces published' },
      { figure: '11 min', label: 'Median read' },
      { figure: '94%', label: 'Renew after a year' },
      { figure: '38', label: 'Countries reported from' },
    ],
    hero: {
      assurance: 'No card. The first month is open, and the archive with it.',
      badge: 'New',
      body: 'Deckle commissions long reporting on the things that move slowly, and sends one piece a day instead of forty.',
      headline: 'Read the argument, not the headline.',
      note: 'Three new essays this week, from three continents',
      primary: 'Start reading',
      secondary: 'Read a sample',
    },
    label: 'Publication',
    map: {
      heading: 'Filed this week',
      label: 'Where this week’s pieces were filed',
      lead: 'Four pieces from four places. The one from Kiruna is held while the desk checks a source.',
      places: [
        {
          detail: 'The last ferry from Durres',
          label: 'Durrës',
          lat: 41.3133,
          lng: 19.4462,
          state: 'success',
          status: 'Published',
        },
        {
          detail: 'What the copper price knows',
          label: 'Lubin',
          lat: 51.3997,
          lng: 16.1993,
          state: 'warning',
          status: 'With the editor',
        },
        {
          detail: 'A winter in Kiruna',
          label: 'Kiruna',
          lat: 67.8496,
          lng: 20.3062,
          state: 'danger',
          status: 'Held',
        },
        {
          detail: 'The river that moved',
          label: 'Tulcea',
          lat: 45.1775,
          lng: 28.8016,
          state: 'success',
          status: 'Published',
        },
      ],
    },
    mark: 'deckle',
    menu: ['Export this week', 'Follow this section', 'Open in the desk'],
    nav: [
      { href: '#features', label: 'Sections' },
      { href: '#pricing', label: 'Subscribe' },
      { href: '#docs', label: 'Archive' },
    ],
    progress: '68% of this week’s pieces filed',
    table: {
      columns: ['Piece', 'Filed', 'Status'],
      heading: 'This week',
      label: 'Pieces this week',
      link: 'Piece detail',
      rows: [
        {
          state: 'success',
          status: 'Published',
          subject: 'The last ferry from Durres',
          when: 'Mon',
        },
        {
          state: 'warning',
          status: 'With the editor',
          subject: 'What the copper price knows',
          when: 'Tue',
        },
        { state: 'danger', status: 'Held', subject: 'A winter in Kiruna', when: 'Wed' },
        { state: 'success', status: 'Published', subject: 'The river that moved', when: 'Thu' },
      ],
    },
    trial: {
      checkbox: 'Send me the Saturday edition',
      cta: 'Create account',
      heading: 'Start reading',
      secondary: 'See the plans',
      taken: {
        feedback: 'That name is already taken.',
        label: 'Display name',
        value: 'Ada Lovelace',
      },
    },
    value: 'publication',
    walkthrough: {
      body: 'One full piece, sent now, chosen by the editor who commissioned it. No card, and no series of emails afterwards.',
      cta: 'Send it',
      heading: 'Read a sample',
    },
  },
  {
    action: 'New order',
    chart: {
      caption: 'Orders shipped inside the promised window by month, as a percentage',
      columns: ['On time', 'Recovered'],
      heading: 'Shipped on time',
      label: 'Orders shipped on time by month',
      rows: [
        ['Jan', 89, 6],
        ['Feb', 85, 9],
        ['Mar', 92, 5],
        ['Apr', 95, 3],
        ['May', 91, 6],
        ['Jun', 97, 2],
      ],
    },
    close: {
      body: 'Swatches of the whole range, posted free, before you decide.',
      cta: 'Order swatches',
      heading: 'See it against your own light',
    },
    company: 'Weft',
    detail: {
      cta: 'Track this order',
      heading: 'Herringbone throw, oat',
      label: 'Order detail',
      lead: { caption: 'Placed', value: '14:20, for next-day dispatch' },
      status: { caption: 'Status', state: 'success', words: 'Packed' },
      trail: { caption: 'Last scan', value: 'Nineteen minutes ago, on the packing bench.' },
    },
    editorial: {
      contact: 'mill@weft.example',
      lead: 'One mill, nine fibers, and a journal about everything between a fleece and a finished blanket.',
      place: 'Yorkshire',
      posts: [
        { minutes: 7, title: 'Why the selvedge matters', when: 'Aug 2026' },
        { minutes: 13, title: 'Four looms, and what each one is for', when: 'Jul 2026' },
        { minutes: 8, title: 'Dyeing in small lots', when: 'Jul 2026' },
        { minutes: 10, title: 'The winter weights, explained', when: 'Jun 2026' },
      ],
      sections: [
        {
          body: [
            'Twelve hundred meters a week, woven on four looms in one building and sold direct, so nothing on the shelf has passed through a warehouse that could not name it. Every price is printed: what the fiber cost, what the weaving cost, and what we kept.',
            'The four looms are not interchangeable. Two are wide and slow and make the blankets. One takes the fine wool and nothing else, because the tension it wants would snap anything heavier. The fourth is forty years old, cannot be repaired by anyone under sixty, and makes the herringbone that most people arrive here looking for.',
          ],
          rail: 'The mill',
        },
        {
          body: [
            'Nine fibers, with swatches of all of them posted free before you decide. Sixty days to send anything back, with a printed label already in the box and the refund issued when it is scanned rather than when somebody gets round to inspecting it.',
            'We hold stock rather than taking pre-orders, so the number on the page is the number on the shelf, counted this morning. When something sells out it says sold out, and it returns when the loom reaches it, which is usually four weeks and occasionally longer if the fleece was late.',
          ],
          rail: 'The range',
        },
        {
          body: [
            'This is where we write down what happens between a fleece and a finished blanket, mostly because none of it was written down anywhere we could find when we started. Dye lots, tension, why a selvedge matters, and what four decades of one machine’s habits do to a piece of cloth.',
          ],
          rail: 'The journal',
        },
      ],
    },
    features: [
      {
        body: 'The number on the page is the number on the shelf, counted this morning.',
        icon: 'cube',
        title: 'In stock means in stock',
      },
      {
        body: 'What the fiber cost, what the weaving cost, and what we kept.',
        icon: 'receipt',
        title: 'One price, printed',
      },
      {
        body: 'Sixty days, a printed label in the box, and a refund when it is scanned.',
        icon: 'arrow-counter-clockwise',
        title: 'Returns without a conversation',
      },
    ],
    figures: [
      { figure: '1,200', label: 'Meters woven a week' },
      { figure: '4 days', label: 'Median dispatch' },
      { figure: '99.1%', label: 'Kept after sixty days' },
      { figure: '9', label: 'Fibers in the range' },
    ],
    hero: {
      assurance: 'Free returns for sixty days. Swatches are free and always will be.',
      badge: 'New',
      body: 'Weft weaves in one mill and sells direct, so every blanket on this page has a fiber, a farm and the name of whoever finished it.',
      headline: 'Cloth you can find out everything about.',
      note: 'The winter weights are on the looms now',
      primary: 'Shop the winter range',
      secondary: 'Order swatches',
    },
    label: 'Storefront',
    map: {
      heading: 'Orders today',
      label: 'Where today’s orders are going',
      lead: 'Four orders, four addresses. The scarf is on its way back from Manchester.',
      places: [
        {
          detail: 'Herringbone throw, oat',
          label: 'Edinburgh',
          lat: 55.9533,
          lng: -3.1884,
          route: { from: 'the mill in Huddersfield', lat: 53.6467, lng: -1.7822 },
          state: 'success',
          status: 'Packed',
        },
        {
          detail: 'Waffle blanket, indigo',
          label: 'Bristol',
          lat: 51.443,
          lng: -2.5817,
          route: { from: 'the mill in Huddersfield', lat: 53.6467, lng: -1.7822 },
          state: 'warning',
          status: 'Waiting on yarn',
        },
        {
          detail: 'Fine wool scarf, rust',
          label: 'Manchester',
          lat: 53.4425,
          lng: -2.2325,
          route: { from: 'the mill in Huddersfield', lat: 53.6467, lng: -1.7822 },
          state: 'danger',
          status: 'Return opened',
        },
        {
          detail: 'Linen sheet set, chalk',
          label: 'London',
          lat: 51.5074,
          lng: -0.1278,
          route: { from: 'the mill in Huddersfield', lat: 53.6467, lng: -1.7822 },
          state: 'success',
          status: 'Packed',
        },
      ],
    },
    mark: 'weft',
    menu: ['Export today', 'Subscribe to changes', 'Open in the workroom'],
    nav: [
      { href: '#features', label: 'Shop' },
      { href: '#pricing', label: 'Fabrics' },
      { href: '#docs', label: 'Stockists' },
    ],
    progress: '68% of today’s orders packed',
    table: {
      columns: ['Order', 'Placed', 'Status'],
      heading: 'Today',
      label: 'Orders today',
      link: 'Order detail',
      rows: [
        { state: 'success', status: 'Packed', subject: 'Herringbone throw, oat', when: '14:20' },
        {
          state: 'warning',
          status: 'Waiting on yarn',
          subject: 'Waffle blanket, indigo',
          when: '09:05',
        },
        {
          state: 'danger',
          status: 'Return opened',
          subject: 'Fine wool scarf, rust',
          when: '22:45',
        },
        { state: 'success', status: 'Packed', subject: 'Linen sheet set, chalk', when: '06:30' },
      ],
    },
    trial: {
      checkbox: 'Send me the seasonal lookbook',
      cta: 'Create account',
      heading: 'Open an account',
      secondary: 'Talk to the trade desk',
      taken: {
        feedback: 'That company already has a trade account.',
        label: 'Company',
        value: 'Example Interiors',
      },
    },
    value: 'storefront',
    walkthrough: {
      body: 'Nine fibers, cut from the roll they will be woven from. Free, posted anywhere Weft ships, and yours to keep.',
      cta: 'Post them',
      heading: 'Order swatches',
    },
  },
  {
    action: 'Action',
    chart: {
      caption: 'Two series by month, as percentages',
      columns: ['Series one', 'Series two'],
      heading: 'Bar chart',
      label: 'Two series by month',
      rows: [
        ['Jan', 72, 18],
        ['Feb', 64, 26],
        ['Mar', 81, 12],
        ['Apr', 88, 9],
        ['May', 77, 20],
        ['Jun', 93, 6],
      ],
    },
    close: {
      body: 'Caption text under it, on the same fill.',
      cta: 'Button',
      heading: 'A closing band on the brand fill',
    },
    company: 'Brand',
    detail: {
      cta: 'Primary',
      heading: 'A drawer, opened from the table',
      label: 'A drawer',
      lead: { caption: 'A label', value: 'The value under it' },
      status: { caption: 'Status', state: 'success', words: 'Success' },
      trail: { caption: 'Another label', value: 'And the value under that one.' },
    },
    editorial: {
      contact: 'hello@example.com',
      lead: 'Display text on the measure, with a label in the rail beside it.',
      place: 'Rail',
      posts: [
        { minutes: 9, title: 'A list item, with supporting text', when: 'Aug 2026' },
        { minutes: 14, title: 'A second item, one rule below', when: 'Jul 2026' },
        { minutes: 6, title: 'A third, to show the rhythm', when: 'Jun 2026' },
        { minutes: 11, title: 'A fourth, and the last', when: 'May 2026' },
      ],
      sections: [
        {
          body: [
            'Body text on the measure. It runs to several lines on purpose, because leading, measure and the muted foreground are only judgeable across more than one line of it. A single sentence tells you what a color is. A paragraph tells you whether you could read a page of it.',
            'A second block, to show the space between two of them, and to give the measure enough text that its length reads as a decision rather than an accident. This is the hardest surface in the preview for a text palette: no card, no border, and nothing holding the ink up except the ground it lands on.',
          ],
          rail: 'Label',
        },
        {
          body: [
            'One more block at the same measure, so the rhythm can be seen holding down the page rather than only at the top of it. The rail beside it carries the only other word in the row, set in mono at the smallest size the theme produces, which is the one place a mono face choice is visible at all.',
          ],
          rail: 'Label',
        },
        {
          body: [
            'A third section, because two of anything is a pair and three is a pattern. Everything below this is a list, a link, and the rule that ends the page.',
          ],
          rail: 'Label',
        },
      ],
    },
    features: [
      {
        body: 'Caption text inside a card, one step down from body.',
        icon: 'circle',
        title: 'Card, with an icon',
      },
      {
        body: 'The icon above takes the primary color; this text does not.',
        icon: 'stack',
        title: 'Card, the second',
      },
      {
        body: 'Three of them, because a row of one is not a row.',
        icon: 'cube',
        title: 'Card, the third',
      },
    ],
    figures: [
      { figure: '2,400', label: 'A count' },
      { figure: '19 min', label: 'A duration' },
      { figure: '98.6%', label: 'A percentage' },
      { figure: '31', label: 'An integer' },
    ],
    hero: {
      assurance: 'Caption beside an icon, the smallest text on the page.',
      badge: 'Tag',
      body: 'Body text under it. A paragraph rather than a line, because the measure, the leading and the muted foreground all need more than one line before a reader can judge any of them.',
      headline: 'Display text, at the top of the type scale',
      note: 'Caption beside the tag',
      primary: 'Primary',
      secondary: 'Secondary',
    },
    label: 'Generic',
    map: {
      heading: 'A map',
      label: 'A map with four places',
      lead: 'Four markers, one in each state, on a map drawn from the theme.',
      places: [
        {
          detail: 'The first row',
          label: 'The first place',
          lat: 38.7078,
          lng: -9.1366,
          route: { from: 'the hub', lat: 50.1106, lng: 8.6821 },
          state: 'success',
          status: 'Success',
        },
        {
          detail: 'The second row',
          label: 'The second place',
          lat: 48.8535,
          lng: 2.3484,
          route: { from: 'the hub', lat: 50.1106, lng: 8.6821 },
          state: 'warning',
          status: 'Warning',
        },
        {
          detail: 'The third row',
          label: 'The third place',
          lat: 48.2084,
          lng: 16.3725,
          route: { from: 'the hub', lat: 50.1106, lng: 8.6821 },
          state: 'danger',
          status: 'Danger',
        },
        {
          detail: 'The fourth row',
          label: 'The fourth place',
          lat: 55.6867,
          lng: 12.5701,
          route: { from: 'the hub', lat: 50.1106, lng: 8.6821 },
          state: 'success',
          status: 'Success',
        },
      ],
      position: {
        accuracy: 8000,
        description: 'A description, spoken as it changes',
        heading: 50,
        label: 'A position',
        lat: 41.0969,
        lng: 3.1814,
        state: 'warning',
      },
    },
    mark: 'brand',
    menu: ['A menu item', 'A second item', 'A third item'],
    nav: [
      { href: '#features', label: 'First' },
      { href: '#pricing', label: 'Second' },
      { href: '#docs', label: 'Third' },
    ],
    progress: 'A caption beside a progress bar',
    table: {
      columns: ['A column', 'Another', 'Status'],
      heading: 'Table',
      label: 'A table of four rows',
      link: 'Drawer',
      rows: [
        { state: 'success', status: 'Success', subject: 'The first row', when: '14:20' },
        { state: 'warning', status: 'Warning', subject: 'The second row', when: '09:05' },
        { state: 'danger', status: 'Danger', subject: 'The third row', when: '22:45' },
        { state: 'success', status: 'Success', subject: 'The fourth row', when: '06:30' },
      ],
    },
    trial: {
      checkbox: 'A checkbox, with its label',
      cta: 'Primary',
      heading: 'A form',
      secondary: 'Ghost',
      taken: {
        feedback: 'Feedback under a field that is not valid.',
        label: 'A second input',
        value: 'Its value',
      },
    },
    value: 'generic',
    walkthrough: {
      body: 'Body text inside a dialog, which is the one surface here that is floating, scrimmed and translucent at once.',
      cta: 'Primary',
      heading: 'A dialog',
    },
  },
]
/**
 * The mark, which is a different drawing per company.
 */
export function Mark({ mark }: { mark: Context['mark'] }) {
  return (
    <svg
      aria-hidden="true"
      className="themedMark"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Strata: three beds with a fault through them. The middle one is
          displaced, which is what a fault does and is the one thing here that
          could not be any other name's mark. */}
      {mark === 'strata' ? (
        <>
          <rect height="5" rx="1.6" width="18" x="1" y="2" />
          <rect height="5" rx="1.6" width="18" x="5" y="9.5" />
          <rect height="5" rx="1.6" width="18" x="1" y="17" />
        </>
      ) : null}

      {/* Deckle: the untrimmed edge of a handmade sheet, which is the name and
          is the only part of the drawing that is not a rectangle. Two sheets,
          the back one open so the stack reads as an archive rather than as a
          page; it is drawn first and the filled one in front cuts it, which is
          the only way to get figure and ground out of a single color. */}
      {mark === 'deckle' ? (
        <>
          <rect
            fill="none"
            height="15"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.7"
            width="11"
            x="9.5"
            y="2.5"
          />
          <path d="M2 6.5 H12.5 L15 8.7 L12.5 10.9 L15 13.1 L12.5 15.3 L15 17.5 L12.5 19.7 L15 21.9 H2 Z" />
        </>
      ) : null}

      {/* Brand: a placeholder, and it says so. The generic context has no company
          behind it, so a mark that meant something would be claiming one. A ring
          and a disc are the two shapes every specimen sheet has ever used for "a
          mark goes here", and neither of them is anybody's. */}
      {mark === 'brand' ? (
        <>
          <circle cx="12" cy="12" fill="none" r="9.4" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="12" cy="12" r="4.2" />
        </>
      ) : null}

      {/* Weft: the crosswise thread, passing over the warp and then under it.
          The middle course is broken where the two uprights cross it, and that
          gap is the whole drawing: with one color an over and an under are the
          same solid junction, so the interlace can only be said by what is left
          out. */}
      {mark === 'weft' ? (
        <>
          <rect height="20" rx="1.2" width="3" x="6" y="2" />
          <rect height="20" rx="1.2" width="3" x="15" y="2" />
          <rect height="3" rx="1.2" width="20" x="2" y="4.5" />
          <rect height="3" rx="1.2" width="3" x="2" y="10.5" />
          <rect height="3" rx="1.2" width="4" x="10" y="10.5" />
          <rect height="3" rx="1.2" width="3" x="19" y="10.5" />
          <rect height="3" rx="1.2" width="20" x="2" y="16.5" />
        </>
      ) : null}
    </svg>
  )
}
