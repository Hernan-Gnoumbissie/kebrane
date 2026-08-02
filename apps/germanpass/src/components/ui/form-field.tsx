"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";

/**
 * Enveloppe accessible autour des primitives shadcn existantes.
 *
 * Apporte ce qui manquait aux écrans d'authentification :
 * - erreur affichée SOUS le champ concerné, avec icône (la couleur n'est
 *   jamais le seul vecteur d'information — WCAG 1.4.1) ;
 * - `aria-invalid` + `aria-describedby` pour VoiceOver / TalkBack ;
 * - hauteur ≥ 44 px et police 16 px (évite le zoom auto de Safari iOS).
 */

const CONTROL_CLS = "h-11 text-base";
const ERROR_CLS = "border-destructive focus-visible:ring-destructive";

function AlertIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path d="M8 1.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5Zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.5Zm0 6a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z" />
    </svg>
  );
}

export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-1 flex items-start gap-1 text-sm font-medium text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <AlertIcon />
      <span>{children}</span>
    </p>
  );
}

interface FieldShellProps {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: (aria: {
    id: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
    className: string;
  }) => React.ReactNode;
}

/** Structure commune : label → contrôle → aide ou erreur. */
function FieldShell({ id, label, error, hint, optional, className, children }: FieldShellProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">(facultatif)</span>
        )}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: cn(CONTROL_CLS, error && ERROR_CLS),
      })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  wrapperClassName?: string;
};

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, error, hint, optional, wrapperClassName, ...rest },
  ref,
) {
  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      optional={optional}
      className={wrapperClassName}
    >
      {(aria) => <Input ref={ref} {...rest} {...aria} />}
    </FieldShell>
  );
});

type PasswordFieldProps = Omit<TextFieldProps, "type">;

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ id, label, error, hint, wrapperClassName, ...rest }, ref) {
    return (
      <FieldShell id={id} label={label} error={error} hint={hint} className={wrapperClassName}>
        {(aria) => <PasswordInput ref={ref} {...rest} {...aria} />}
      </FieldShell>
    );
  },
);

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  wrapperClassName?: string;
};

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    { id, label, error, hint, optional, wrapperClassName, children, ...rest },
    ref,
  ) {
    return (
      <FieldShell
        id={id}
        label={label}
        error={error}
        hint={hint}
        optional={optional}
        className={wrapperClassName}
      >
        {(aria) => (
          <select
            ref={ref}
            {...rest}
            {...aria}
            className={cn(
              "w-full rounded-md border border-input bg-background px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              aria.className,
            )}
          >
            {children}
          </select>
        )}
      </FieldShell>
    );
  },
);
