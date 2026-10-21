function Icon({ className, d }: { className?: string; d: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function ResetIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      d="M3 12a9 9 0 1 0 2.64-6.36L3 8.27M3 3v5.27h5.27"
    />
  );
}

export function SendIcon({ className }: { className?: string }) {
  return <Icon className={className} d="M12 19V5M5 12L12 5L19 12" />;
}

export function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <circle className="cc-launcher__spark-cut" cx="20.5" cy="3.5" r="5" />
      <path
        className="cc-launcher__spark"
        d="M20.5 0Q20.5 3.5 24 3.5Q20.5 3.5 20.5 7Q20.5 3.5 17 3.5Q20.5 3.5 20.5 0Z"
      />
    </svg>
  );
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CartIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 8H6.2M9.5 19.5h.01M16.5 19.5h.01"
    />
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return <Icon className={className} d="M5 12.5l4.5 4.5L19 7.5" />;
}

export function SpinnerIcon({ className }: { className?: string }) {
  return <Icon className={className} d="M12 3a9 9 0 1 0 9 9" />;
}

export function PlusIcon({ className }: { className?: string }) {
  return <Icon className={className} d="M12 5v14M5 12h14" />;
}

export function MinusIcon({ className }: { className?: string }) {
  return <Icon className={className} d="M5 12h14" />;
}

export function ChevronUpIcon({ className }: { className?: string }) {
  return <Icon className={className} d="M6 15l6-6 6 6" />;
}

export function ChevronDownIcon({ className }: { className?: string }) {
  return <Icon className={className} d="M6 9l6 6 6-6" />;
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return <Icon className={className} d="M5 12h14M13 6l6 6-6 6" />;
}

export function PageIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4"
    />
  );
}

export function AlertIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      d="M12 8v5M12 16.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
    />
  );
}

export function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2Q12 12 22 12Q12 12 12 22Q12 12 2 12Q12 12 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
