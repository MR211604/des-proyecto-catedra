export function MailIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m3.75 6.75 8.25 6 8.25-6M4.5 5.25h15a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.25V6.75a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <rect
        height="10.5"
        rx="1.75"
        stroke="currentColor"
        strokeWidth="1.7"
        width="14"
        x="5"
        y="10"
      />
      <path
        d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10M12 14.25v2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 3 21 21M10.58 10.59a2 2 0 0 0 2.83 2.83M9.88 5.09A10.7 10.7 0 0 1 12 4.88c5.25 0 8.7 4.9 9.75 7.12a1 1 0 0 1 0 1c-.43.9-1.22 2.1-2.35 3.3M6.23 6.23C4.45 7.42 3.3 9.14 2.25 11.99a1 1 0 0 0 0 1C3.3 15.2 6.75 20.12 12 20.12c1.3 0 2.48-.32 3.55-.83"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  ) : (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.25 12s3.45-7.12 9.75-7.12S21.75 12 21.75 12 18.3 19.12 12 19.12 2.25 12 2.25 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="2.75"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 12h14.25M13 6.25 18.75 12 13 17.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SignInIcon() {
  return (
    <svg aria-hidden="true" className="size-8" fill="none" viewBox="0 0 32 32">
      <path
        d="M11 25.5 15.4 14M21 25.5 16.6 14M13.3 8.5 16 5.5l2.7 3M12.6 11.8a3.4 3.4 0 1 0 6.8 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.1"
      />
      <circle cx="16" cy="4.5" fill="currentColor" r="1.4" />
    </svg>
  );
}
