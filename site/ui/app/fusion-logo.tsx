/**
 * The Fusion mark.
 *
 * Carried over from the previous repo unchanged, because a logo is the one
 * thing in a design system that must not be redrawn on a whim.
 *
 * Fusion's brand, not Helix's, so it lives with the marketing site rather than
 * in the design system: a design system that ships one company's logo cannot be
 * used by another. It moves to a shared brand package the moment a second
 * Fusion site needs it.
 *
 * The gradients are declared against custom properties with literal fallbacks,
 * so a theme can retint the mark without the SVG being edited.
 */
export function FusionLogo({
  size = '1.75rem',
  title = 'Fusion',
}: {
  size?: string
  title?: string
}) {
  return (
    <svg
      aria-label={title}
      fill="none"
      height={size}
      role="img"
      style={{ display: 'block' }}
      viewBox="0 0 256 256"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(42.5 28) scale(2.38)">
        <path
          d="M0 1H72C72 10.9411 63.9411 19 54 19H18C8.05888 19 0 10.9411 0 1Z"
          fill="url(#fusion-bar)"
        />
        <path
          d="M27.9766 19C27.9766 9.05887 36.0354 1 45.9766 1H71.9766C71.9766 10.9411 63.9177 19 53.9766 19H27.9766Z"
          fill="url(#fusion-bar-shadow)"
        />
        <path
          d="M0.00390625 46C0.00390625 34.9543 8.95821 26 20.0039 26H54.0822C54.0822 36.4323 45.6252 44.8893 35.1929 44.8893H25.7129C21.2946 44.8893 17.7129 48.471 17.7129 52.8893V65.9737C17.7129 75.754 9.7843 83.6826 0.00390625 83.6826V46Z"
          fill="url(#fusion-c)"
        />
        <path
          d="M0 46C0 34.9543 8.95431 26 20 26H40.2464C40.2464 36.442 31.7815 44.907 21.3395 44.907H21.0588L13.4622 45.5709C6.78541 46.1544 1.29796 51.0805 0 57.6558V46Z"
          fill="url(#fusion-c-highlight)"
        />
      </g>
      <defs>
        <linearGradient
          gradientTransform="translate(42.5 28) scale(2.38)"
          gradientUnits="userSpaceOnUse"
          id="fusion-bar"
          x1="0"
          x2="72"
          y1="10"
          y2="10"
        >
          <stop stopColor="var(--logo-color-from, #E2E8F0)" />
          <stop offset="1" stopColor="var(--logo-color-to, #475569)" />
        </linearGradient>
        <linearGradient
          gradientTransform="translate(42.5 28) scale(2.38)"
          gradientUnits="userSpaceOnUse"
          id="fusion-bar-shadow"
          x1="27.9766"
          x2="71.9766"
          y1="10"
          y2="10"
        >
          <stop stopColor="var(--logo-color-from, #E2E8F0)" />
          <stop offset="1" stopColor="var(--logo-color-to, #475569)" />
        </linearGradient>
        <linearGradient
          gradientTransform="translate(42.5 28) scale(2.38)"
          gradientUnits="userSpaceOnUse"
          id="fusion-c"
          x1="27.043"
          x2="27.043"
          y1="26"
          y2="83.6826"
        >
          <stop stopColor="var(--logo-color-to, #475569)" />
          <stop offset="1" stopColor="var(--logo-color-mid, #64748B)" />
        </linearGradient>
        <linearGradient
          gradientTransform="translate(42.5 28) scale(2.38)"
          gradientUnits="userSpaceOnUse"
          id="fusion-c-highlight"
          x1="20.1232"
          x2="20.1232"
          y1="26"
          y2="57.6558"
        >
          <stop stopColor="var(--logo-color-from, #E2E8F0)" />
          <stop offset="1" stopColor="var(--logo-color-from, #E2E8F0)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  )
}
