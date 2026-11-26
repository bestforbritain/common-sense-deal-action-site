"use client";

import type { Ref } from "react";
import styles from "./form.module.css";

/** Labelled text input or textarea with optional hint, linked error and extra description. */
export function TextField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  multiline = false,
  rows,
  autoComplete,
  type = "text",
  maxLength,
  footer,
  inputRef,
  wide = false,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  autoComplete?: string;
  type?: string;
  maxLength?: number;
  /** Shown under the field and linked to it, e.g. a character count. */
  footer?: string;
  inputRef?: Ref<HTMLInputElement & HTMLTextAreaElement>;
  wide?: boolean;
}) {
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`, footer && `${id}-footer`].filter(Boolean).join(" ") || undefined;
  const shared = {
    id,
    name: id,
    value,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    autoComplete,
    maxLength,
    ref: inputRef,
  };

  return (
    <div className={`${styles.field} ${wide ? styles.wide : ""}`} data-invalid={error ? "" : undefined}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          <span className="visually-hidden">Error: </span>
          {error}
        </p>
      )}
      {multiline ? (
        <textarea {...shared} rows={rows} className={`${styles.input} ${styles.textarea}`} />
      ) : (
        <input {...shared} type={type} className={styles.input} />
      )}
      {footer && (
        <p id={`${id}-footer`} className={styles.footer}>
          {footer}
        </p>
      )}
    </div>
  );
}
