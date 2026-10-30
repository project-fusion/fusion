import type { HelixManifest } from '../types.js'
import {
  comment,
  customCssProperties,
  type Element,
  elementsOf,
  eventAliases,
  importLine,
  lead,
  NUMERIC_STRING,
  PLATFORM,
  TYPED_EVENT,
  tagDoc,
} from './elements.js'

/**
 * React's casing for the native events whose names are two words run together,
 * `onTimeUpdate` for `timeupdate`.
 *
 * **The same table as `reactNativeProp` in core**, which is what the element
 * binds on a hydrated page, so the typings offer the prop that is bound. Kept
 * here as well because this package is a build tool core depends on, and the
 * dependency cannot run the other way. This package's spec reads core's table
 * from its source and holds the two to each other.
 */
export const REACT_CASING: Readonly<Record<string, string>> = {
  canplay: 'onCanPlay',
  canplaythrough: 'onCanPlayThrough',
  durationchange: 'onDurationChange',
  loadeddata: 'onLoadedData',
  loadedmetadata: 'onLoadedMetadata',
  loadstart: 'onLoadStart',
  ratechange: 'onRateChange',
  scrollend: 'onScrollEnd',
  timeupdate: 'onTimeUpdate',
  volumechange: 'onVolumeChange',
}

/** `toggle` to `onToggle`, and `timeupdate` to `onTimeUpdate`, which is what React reads. */
const handlerName = (event: string): string =>
  REACT_CASING[event] ?? `on${event.charAt(0).toUpperCase()}${event.slice(1)}`

/** Each native handler every tag takes, with the DOM's own event type. */
const NATIVE_HANDLERS: readonly (readonly [name: string, event: string, doc: string])[] = [
  [
    'onClick',
    'MouseEvent',
    'Triggered when the element is clicked by the user by mouse or keyboard.',
  ],
  [
    'onContextMenu',
    'MouseEvent',
    'Fired when the context menu is triggered, often by right-clicking.',
  ],
  ['onDoubleClick', 'MouseEvent', 'Fired when the element is double-clicked.'],
  ['onDrag', 'DragEvent', 'Fired repeatedly as the draggable element is being dragged.'],
  ['onDragEnd', 'DragEvent', 'Fired when the dragging of a draggable element is finished.'],
  [
    'onDragEnter',
    'DragEvent',
    'Fired when a dragged element or text selection enters a valid drop target.',
  ],
  [
    'onDragExit',
    'DragEvent',
    'Fired when a dragged element or text selection leaves a valid drop target.',
  ],
  [
    'onDragLeave',
    'DragEvent',
    'Fired when a dragged element or text selection leaves a valid drop target.',
  ],
  [
    'onDragOver',
    'DragEvent',
    'Fired when an element or text selection is being dragged over a valid drop target (every few hundred milliseconds).',
  ],
  ['onDragStart', 'DragEvent', 'Fired when a draggable element starts being dragged.'],
  ['onDrop', 'DragEvent', 'Fired when a dragged element is dropped onto a drop target.'],
  ['onMouseDown', 'MouseEvent', 'Fired when a mouse button is pressed down on the element.'],
  ['onMouseEnter', 'MouseEvent', 'Fired when the mouse cursor enters the element.'],
  ['onMouseLeave', 'MouseEvent', 'Triggered when the mouse cursor leaves the element.'],
  [
    'onMouseMove',
    'MouseEvent',
    "Fired at an element when a pointing device (usually a mouse) is moved while the cursor's hotspot is inside it.",
  ],
  [
    'onMouseOut',
    'MouseEvent',
    'Fired at an Element when a pointing device (usually a mouse) is used to move the cursor so that it is no longer contained within the element or one of its children.',
  ],
  [
    'onMouseOver',
    'MouseEvent',
    'Fired at an Element when a pointing device (such as a mouse or trackpad) is used to move the cursor onto the element or one of its child elements.',
  ],
  ['onMouseUp', 'MouseEvent', 'Fired when a mouse button is released on the element.'],
  ['onKeyDown', 'KeyboardEvent', 'Fired when a key is pressed down.'],
  ['onKeyUp', 'KeyboardEvent', 'Fired when a key is released.'],
  [
    'onFocus',
    'FocusEvent',
    'Fired when the element receives focus, often triggered by tab navigation.',
  ],
  ['onBlur', 'FocusEvent', 'Fired when the element loses focus.'],
  [
    'onChange',
    'Event',
    'Fired when the value of an input element changes, such as with text inputs or select elements.',
  ],
  [
    'onInput',
    'Event',
    'Fires when the value of an <input>, <select>, or <textarea> element has been changed.',
  ],
  [
    'onSubmit',
    'Event',
    'Fired when a form is submitted, usually on pressing Enter in a text input.',
  ],
  ['onReset', 'Event', 'Fired when a form is reset.'],
  ['onScroll', 'UIEvent', 'Fired when the content of an element is scrolled.'],
  ['onWheel', 'WheelEvent', 'Fired when the mouse wheel is scrolled while the element is focused.'],
  ['onAnimationStart', 'AnimationEvent', 'Fired when a CSS animation starts.'],
  ['onAnimationEnd', 'AnimationEvent', 'Fired when a CSS animation completes.'],
  ['onAnimationIteration', 'AnimationEvent', 'Fired when a CSS animation completes one iteration.'],
  ['onTransitionEnd', 'TransitionEvent', 'Fired when a CSS transition has completed.'],
  ['onLoad', 'Event', 'Fired when an element (usually an image) finishes loading.'],
  [
    'onError',
    'Event',
    'Fired when an error occurs during the loading of an element, like an image not being found.',
  ],
  [
    'onCopy',
    'ClipboardEvent',
    "Fires when the user initiates a copy action through the browser's user interface.",
  ],
  [
    'onCut',
    'ClipboardEvent',
    'Fired when the user has initiated a "cut" action through the browser\'s user interface.',
  ],
  [
    'onPaste',
    'ClipboardEvent',
    'Fired when the user has initiated a "paste" action through the browser\'s user interface.',
  ],
  [
    'onPointerDown',
    'PointerEvent',
    'Fired when a mouse button, a pen or a finger goes down on the element.',
  ],
  ['onPointerMove', 'PointerEvent', 'Fired when a pointer moves over the element.'],
  ['onPointerUp', 'PointerEvent', 'Fired when a pointer is released over the element.'],
  [
    'onPointerCancel',
    'PointerEvent',
    'Fired when the browser takes a pointer over, such as to scroll, and the element hears no more from it.',
  ],
  [
    'onPointerEnter',
    'PointerEvent',
    'Fired when a pointer enters the element. It does not bubble.',
  ],
  [
    'onPointerLeave',
    'PointerEvent',
    'Fired when a pointer leaves the element. It does not bubble.',
  ],
  [
    'onPointerOver',
    'PointerEvent',
    'Fired when a pointer moves onto the element or one of its children.',
  ],
  [
    'onPointerOut',
    'PointerEvent',
    'Fired when a pointer moves off the element or one of its children.',
  ],
  ['onGotPointerCapture', 'PointerEvent', 'Fired when the element captures a pointer.'],
  [
    'onLostPointerCapture',
    'PointerEvent',
    'Fired when the element releases a pointer it had captured.',
  ],
  ['onTouchStart', 'TouchEvent', 'Fired when a finger touches the element.'],
  ['onTouchMove', 'TouchEvent', 'Fired when a finger moves across the element.'],
  ['onTouchEnd', 'TouchEvent', 'Fired when a finger lifts from the element.'],
  ['onTouchCancel', 'TouchEvent', 'Fired when the browser interrupts a touch.'],
]

/**
 * The type a declared handler takes, from what the manifest declares.
 *
 * **The handler takes the one type every element agrees on, where it is the
 * platform's.** The bag is shared by every tag, so a `toggle` declared as a `ToggleEvent` by every
 * element that sends it types `onToggle` as one, and `event.newState` compiles.
 * Elements that disagree fall back to `Event`, and so does a type of this
 * package's own, which a shared bag has no element to read it from.
 */
const platformType = (types: Set<string>): string => {
  const [only] = types
  return types.size === 1 && only !== undefined && PLATFORM.test(only) ? only : 'Event'
}

/**
 * A handler for every native-named event the manifest declares and the list
 * above lacks: `onToggle` on the popover-backed families, `onClose` on Dialog,
 * and `onPlay` on Video. The list carries a real event type for each it names,
 * which is better than the bare `Event` the manifest records, so it wins.
 */
const declaredHandlers = (manifest: HelixManifest): string => {
  const declared = new Map<string, Set<string>>()
  for (const unit of manifest.modules ?? []) {
    for (const declaration of unit.declarations ?? []) {
      for (const event of declaration.events ?? []) {
        if (event.name && !event.name.startsWith('helix-')) {
          const types = declared.get(event.name) ?? new Set<string>()
          types.add(event.type?.text ?? 'Event')
          declared.set(event.name, types)
        }
      }
    }
  }
  const named = new Set(NATIVE_HANDLERS.map(([name]) => name))
  return [...declared]
    .filter(([event]) => !named.has(handlerName(event)))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([event, types]) => handler(handlerName(event), platformType(types), DECLARED_DOC))
    .join('')
}

/** What a handler the manifest added says of itself. */
const DECLARED_DOC = "Declared by an element in this package's manifest."

/**
 * One handler in the shared bag.
 *
 * `currentTarget` on any event dispatched at an element is that element, so the
 * bag is generic on the element, and you read `event.currentTarget.value` without
 * a cast.
 */
const handler = (name: string, event: string, doc: string): string =>
  `${comment(doc, '  ')}  ${name}?: ((event: ${event} & { currentTarget: T }) => void) | undefined;\n`

/**
 * What every framework shares, and what differs between them.
 *
 * `ref` and `style` are each framework's own, and only in that framework's JSX,
 * so `useRef<T>(null)` is assignable and `style={{ colr: 'red' }}` is refused.
 *
 * `suppressHydrationWarning` is React's, and `never` everywhere else. A custom
 * element writes its own state attributes the moment it upgrades, and
 * registration can beat React to the subtree, so hydration finds an attribute
 * its own render never produced. React's answer is this prop.
 */
const HEAD = `/**
 * This type can be used to create scoped tags for your components.
 *
 * Usage:
 *
 * \`\`\`ts
 * import type { ScopedElements } from "path/to/library/jsx-integration";
 *
 * declare module "my-library" {
 *   namespace JSX {
 *     interface IntrinsicElements
 *       extends ScopedElements<'test-', ''> {}
 *   }
 * }
 * \`\`\`
 *
 * @deprecated Runtime scoped elements result in duplicate types and can be confusing for developers.
 */
export type ScopedElements<
  Prefix extends string = "",
  Suffix extends string = "",
> = {
  [Key in keyof CustomElements as \`\${Prefix}\${Key}\${Suffix}\`]: CustomElements[Key];
};

${TYPED_EVENT}
/**
 * The JSX a tag is written in. React, Preact, and Solid each read a tag map
 * with their own name, and every other framework reads it as \`"other"\`.
 *
 * **Each framework's types are imported only on its own branch below.** Every
 * framework loads this file, the Svelte typings included, and a project has
 * only its own framework's types installed. A reference to a module that is
 * not installed is an error in any file the program loads, under
 * \`skipLibCheck: false\`, so the comment above each import keeps a project
 * without that module compiling. Where the module is installed, the import
 * resolves as written.
 */
type Framework = "other" | "preact" | "react" | "solid";

/** \`ref\` as each framework types it, and the plain shape for the rest, which is Solid's own. */
type FrameworkRef<T extends HTMLElement, F extends Framework> = F extends "react"
  ? // @ts-ignore: React's types, read only by React's JSX.
    import('react').Ref<T>
  : F extends "preact"
    ? // @ts-ignore: Preact's types, read only by Preact's JSX.
      import('preact').Ref<T>
    : T | ((e: T) => void);

/** \`style\` as each framework types it on a \`<div>\`, and any object for the rest. */
type FrameworkStyle<F extends Framework> = F extends "react"
  ? // @ts-ignore: React's types, read only by React's JSX.
    import('react').CSSProperties
  : F extends "preact"
    ? // @ts-ignore: Preact's types, read only by Preact's JSX.
      import('preact').JSX.IntrinsicElements["div"]["style"]
    : F extends "solid"
      ? // @ts-ignore: Solid's types, read only by Solid's JSX.
        import('solid-js').JSX.IntrinsicElements["div"]["style"]
      : Record<string, string | number>;

type BaseProps<T extends HTMLElement, F extends Framework = "other"> = {
  /** Skips the hydration check for an element whose DOM is written by something other than React, which a custom element writing its own state attributes is. React takes it, and no other framework does. */
  suppressHydrationWarning?: (F extends "react" ? boolean : never) | undefined;
  /** Content added between the opening and closing tags of the element */
  children?: any;
  /** Used for declaratively styling one or more elements using CSS (Cascading Stylesheets) */
  class?: string | undefined;
  /** Used for declaratively styling one or more elements using CSS (Cascading Stylesheets) */
  className?: string | undefined;
  /** Takes an object where the key is the class name(s) and the value is a boolean expression. When true, the class is applied, and when false, it is removed. */
  classList?: Record<string, boolean | undefined> | undefined;
  /** Specifies the text direction of the element. */
  dir?: "ltr" | "rtl" | undefined;
  /** Contains a space-separated list of the part names of the element that should be exposed on the host element. */
  exportparts?: string | undefined;
  /** For <label> and <output>, lets you associate the label with some control. */
  htmlFor?: string | undefined;
  /** Specifies whether the element should be hidden. */
  hidden?: boolean | string | undefined;
  /** A unique identifier for the element. */
  id?: string | undefined;
  /** Keys tell React which array item each component corresponds to */
  key?: string | number | undefined;
  /** Specifies the language of the element. */
  lang?: string | undefined;
  /** Defines the element's semantic role for accessibility APIs. */
  role?: string | undefined;
  /** Contains a space-separated list of the part names of the element. Part names allows CSS to select and style specific elements in a shadow tree via the ::part pseudo-element. */
  part?: string | undefined;
  /** Use the ref attribute with a variable to assign a DOM element to the variable once the element is rendered. */
  ref?: FrameworkRef<T, F> | undefined;
  /** Adds a reference for a custom element slot */
  slot?: string | undefined;
  /** Prop for setting inline styles */
  style?: FrameworkStyle<F> | undefined;
  /** Overrides the default Tab button behavior. Avoid using values other than -1 and 0. */
  tabIndex?: number | undefined;
  /** Specifies the tooltip text for the element. */
  title?: string | undefined;
  /** Passing 'no' excludes the element content from being translated. */
  translate?: "yes" | "no" | undefined;
  /** The popover global attribute is used to designate an element as a popover element. */
  popover?: "auto" | "hint" | "manual" | undefined;
  /** Turns an element into a popover control button; takes the ID of the popover element to control as its value. */
  popovertarget?: string | undefined;
  /** Specifies the action to be performed on a popover element being controlled by a control element. */
  popovertargetaction?: "show" | "hide" | "toggle" | undefined;
};
`

/** Every module whose JSX reads the tag map, and which map it reads. */
const AUGMENTED: readonly (readonly [module: string, map: string])[] = [
  ['react', 'CustomElements<"react">'],
  ['react/jsx-runtime', 'CustomElements<"react">'],
  ['react/jsx-dev-runtime', 'CustomElements<"react">'],
  ['preact', 'CustomElements<"preact">'],
  ['@builder.io/qwik', 'CustomElements'],
  ['@stencil/core', 'CustomElements'],
  ['hono/jsx', 'CustomElements'],
  ['react-native', 'CustomElements'],
  ['solid-js', 'CustomElementsSolidJs'],
]

/**
 * Solid's JSX where it is declared, and without its compiler.
 *
 * `solid-js`'s `JSX` is a re-export, which reaches the compiler's JSX only in a
 * program where some file imports `solid-js`, so `solid-js/jsx-runtime` is
 * augmented as well: it is the module `jsxImportSource: "solid-js"` reads.
 *
 * `jsxImportSource: "solid-js/h"` reads the `JSX` of `solid-js/h/jsx-runtime`, a
 * namespace of its own. `h` reads a function given to a prop as the prop's
 * value, so its map is Solid's with each prop also taking a function that
 * returns it.
 */
const SOLID_TAIL = `declare module "solid-js/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends CustomElementsSolidJs {}
  }
}

/**
 * A prop as Solid's JSX takes it without the compiler, with
 * \`jsxImportSource: "solid-js/h"\`. \`h\` calls a function given to a prop for
 * the prop's value, and calls it again when a signal it read changes, so each
 * prop takes its value or a function that returns it. \`ref\`, \`children\`, and
 * the props named \`on…\` are taken as they are, as \`h\` takes them. A property
 * whose value is a function takes only a function that returns it, because
 * \`h\` calls any function it is given. A prop typed \`any\` stays \`any\`.
 */
type SolidHProp<K, V> = K extends "children" | "ref" | \`on\${string}\`
  ? V
  : 0 extends 1 & V
    ? V
    : [Exclude<V, undefined>] extends [(...args: never[]) => unknown]
      ? (() => V) | undefined
      : V | (() => V);

/** One tag's props as Solid's JSX takes them without the compiler. */
type SolidHProps<P> = { [K in keyof P]: SolidHProp<K, P[K]> };

/** The tag map Solid's JSX reads without the compiler: \`CustomElementsSolidJs\`, each prop as \`SolidHProp\` takes it. */
export type CustomElementsSolidH = {
  [Tag in keyof CustomElementsSolidJs]: SolidHProps<CustomElementsSolidJs[Tag]>;
};

declare module "solid-js/h/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends CustomElementsSolidH {}
  }
}
`

/** The props one tag declares, as React, Preact, and every other JSX take them. */
const propsType = ({ events, name, props }: Element): string => {
  const written = new Set<string>()
  const lines: string[] = []
  const entry = (key: string, doc: string, type: string): void => {
    if (!written.has(key)) {
      written.add(key)
      lines.push(`${comment(doc, '  ')}  "${key}"?: ${type};\n`)
    }
  }
  for (const { attribute, doc, numeric, property, type } of props) {
    if (attribute !== undefined && attribute !== property) {
      entry(attribute, doc, `${type}${numeric ? ` | ${NUMERIC_STRING}` : ''} | undefined`)
    }
    if (property !== undefined) {
      /* **One paragraph where the attribute beside it says them all**, the
         attribute being what markup writes. */
      entry(
        property,
        attribute !== undefined && attribute !== property ? lead(doc) : doc,
        `${type} | undefined`,
      )
    }
  }
  for (const { doc, handler: type, name: event } of events) {
    entry(`on${event}`, doc, `((e: ${type}) => void) | undefined`)
  }
  return `export type ${name}Props = {\n${lines.join('')}};\n`
}

/**
 * Solid's spellings of the same props: `prop:` for a property, `attr:` or
 * `bool:` for an attribute named apart from it, and `on:` for an event.
 *
 * **Each says one paragraph**, since the plain spelling beside it on the same
 * tag says the description whole.
 */
const solidType = ({ events, name, props }: Element): string => {
  const written = new Set<string>()
  const lines: string[] = []
  const entry = (key: string, doc: string, type: string): void => {
    if (!written.has(key)) {
      written.add(key)
      lines.push(`${comment(lead(doc), '  ')}  "${key}"?: ${type};\n`)
    }
  }
  for (const { attribute, boolean, doc, numeric, property, type } of props) {
    if (attribute !== undefined && attribute !== property) {
      entry(
        `${boolean ? 'bool' : 'attr'}:${attribute}`,
        doc,
        `${type}${numeric ? ` | ${NUMERIC_STRING}` : ''} | undefined`,
      )
    }
    if (property !== undefined) {
      entry(`prop:${property}`, doc, `${type} | undefined`)
    }
  }
  for (const { doc, handler: type, name: event } of events) {
    entry(`on:${event}`, doc, `((e: ${type}) => void) | undefined`)
  }
  return `export type ${name}SolidJsProps = {
${lines.join('')}  /** Set the innerHTML of the element */
  innerHTML?: string | undefined;
  /** Set the textContent of the element */
  textContent?: string | number | undefined;
};
`
}

/**
 * The tags, each with the doc a hover on it shows, and the two tag maps over
 * them.
 *
 * **Both maps are mapped over one interface, so each doc is written once.** A
 * mapped type keeps the declarations of the keys it maps, so a hover on
 * `<helix-button>` shows the comment here in every framework. Writing each tag
 * into each map was two megabytes of the styled tier's file.
 */
const tagMaps = (elements: Element[]): string => {
  const tags = elements
    .map(
      (element) =>
        `${tagDoc(element, '  ')}  "${element.tagName}": { element: ${element.name}; props: ${element.name}Props; solid: ${element.name}SolidJsProps };\n`,
    )
    .join('')
  return `/** Every tag this package declares, with its class and its props in each spelling. */
interface Tags {
${tags}}

export type CustomElements<F extends Framework = "other"> = {
  [Tag in keyof Tags]: Tags[Tag]["props"] &
    BaseProps<Tags[Tag]["element"], F> &
    BaseEvents<Tags[Tag]["element"]>;
};

export type CustomElementsSolidJs = {
  [Tag in keyof Tags]: Tags[Tag]["props"] &
    Tags[Tag]["solid"] &
    BaseProps<Tags[Tag]["element"], "solid"> &
    BaseEvents<Tags[Tag]["element"]>;
};
`
}

const augmentation = ([module, map]: readonly [
  string,
  string,
]): string => `declare module "${module}" {
  namespace JSX {
    interface IntrinsicElements extends ${map} {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}
`

/**
 * `jsx.d.ts`: the tag map for the whole JSX family, written from the manifest.
 *
 * **Every framework reads the same props.** What differs between them is `ref`
 * and `style`, which `BaseProps` takes as a parameter, and Solid's extra
 * spellings, which it reads from its own map.
 *
 * `?: T | undefined` everywhere, because under `exactOptionalPropertyTypes`
 * `?: T` refuses the `undefined` a component forwarding an optional prop holds.
 * React's own types are written the same way.
 */
export const renderJsx = (manifest: HelixManifest, packageName: string): string => {
  const elements = elementsOf(manifest)
  return [
    "// Generated by `helix-cem` from this package's manifest. Do not edit.\n",
    importLine(elements, packageName),
    HEAD,
    `type BaseEvents<T = HTMLElement> = {\n${NATIVE_HANDLERS.map(([name, event, doc]) =>
      handler(name, event, doc),
    ).join('')}${declaredHandlers(manifest)}};\n`,
    ...elements.flatMap((element) => [
      eventAliases(element),
      propsType(element),
      solidType(element),
    ]),
    tagMaps(elements),
    customCssProperties(elements),
    ...AUGMENTED.map(augmentation),
    SOLID_TAIL,
    `declare global {
  namespace JSX {
    interface IntrinsicElements extends CustomElements {}
  }
  export interface CSSProperties extends CustomCssProperties {}
}
`,
  ].join('\n')
}
