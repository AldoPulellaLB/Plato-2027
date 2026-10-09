// Account form field: visible label, a line that draws on focus, inline error
// near the field, optional show/hide for passwords.
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { HTMLAttributes, Ref } from "react";

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  hint?: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  /** Adds a show/hide toggle (passwords). */
  revealable?: boolean;
}

export function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  type = "text",
  autoComplete,
  inputMode,
  disabled,
  inputRef,
  revealable = false,
}: FieldProps) {
  const [shown, setShown] = useState(false);
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const inputType = revealable ? (shown ? "text" : "password") : type;

  return (
    <div className="acct-field" data-filled={value.length > 0 || undefined} data-invalid={error ? true : undefined}>
      <label className="acct-label" htmlFor={id}>
        {label}
      </label>
      <div className="acct-control">
        <input
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoCapitalize={type === "email" || revealable ? "none" : "words"}
          autoComplete={autoComplete}
          autoCorrect="off"
          className="acct-input"
          disabled={disabled}
          id={id}
          inputMode={inputMode}
          name={id}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          ref={inputRef}
          spellCheck={false}
          type={inputType}
          value={value}
        />
        {revealable ? (
          <button
            aria-controls={id}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="acct-reveal"
            onClick={() => setShown((s) => !s)}
            type="button"
          >
            {shown ? <EyeOff aria-hidden="true" size={18} strokeWidth={1.5} /> : <Eye aria-hidden="true" size={18} strokeWidth={1.5} />}
          </button>
        ) : null}
        <span aria-hidden="true" className="acct-line" />
      </div>
      {error ? (
        <p className="acct-error" id={errorId ?? undefined}>
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="acct-hint" id={hintId ?? undefined}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
