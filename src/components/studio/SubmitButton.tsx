'use client';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

type Props = {
  children: React.ReactNode;
  /** Shown while the action runs; the button is disabled so a double click never submits twice. */
  pendingText?: string;
  /** Destructive actions: the first click arms the button, the second submits. */
  confirm?: string;
  variant?: 'default' | 'outline' | 'link' | 'destructive' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  /** Renders as an underlined text button instead of a shadcn Button. */
  plain?: boolean;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
};

/** Submit button for plain `<form action={serverAction}>` forms. */
export function SubmitButton({ children, pendingText = 'Working…', confirm, variant = 'outline', size = 'sm', plain, className = '', disabled, ...rest }: Props) {
  const { pending } = useFormStatus();
  const [armed, setArmed] = useState(false);
  const label = pending ? pendingText : armed && confirm ? confirm : children;
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (confirm && !armed) {
      e.preventDefault();
      setArmed(true);
    }
  };
  const common = {
    type: 'submit' as const,
    disabled: pending || disabled,
    'aria-busy': pending || undefined,
    onClick,
    onBlur: () => setArmed(false),
    ...rest,
  };
  return (
    <>
      {plain ? (
        <button {...common} className={`underline underline-offset-2 disabled:opacity-50 ${armed ? 'font-semibold text-destructive' : ''} ${className}`}>
          {label}
        </button>
      ) : (
        <Button {...common} variant={armed && confirm ? 'destructive' : variant} size={size} className={className}>
          {label}
        </Button>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {armed && confirm ? `${confirm}. Press again to confirm.` : ''}
      </span>
    </>
  );
}
