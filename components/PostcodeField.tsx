"use client";

import { useId, type Ref } from "react";
import { formatPostcode } from "@/lib/postcode";
import styles from "./form.module.css";

/** Business postcode input: label, hint, linked error message, formatted on blur. */
export function PostcodeField({
  label,
  hint,
  value,
  onChange,
  error,
  inputRef,
  id: idProp,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
  id?: string;
}) {
  const generated = useId();
  const id = idProp ?? `${generated}-postcode`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field} data-invalid={error ? "" : undefined}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          <span className="visually-hidden">Error: </span>
          {error}
        </p>
      )}
      <input
        id={id}
        name="postcode"
        ref={inputRef}
        className={`${styles.input} ${styles.postcode}`}
        type="text"
        autoComplete="postal-code"
        autoCapitalize="characters"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onChange(formatPostcode(value))}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
    </div>
  );
}
