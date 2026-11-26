"use client";

import { useRef, useState, type FormEvent } from "react";
import { copy, fill } from "@/content/copy";
import type { Sector } from "@/content/sectors";
import type { Constituency } from "@/lib/constituencies/types";
import { isEmailFormat } from "@/lib/validation";
import { TextField } from "../TextField";
import { Turnstile } from "../Turnstile";
import formStyles from "../form.module.css";
import styles from "./actions.module.css";

const text = copy.email;

/** "I've sent it": a self-reported count, with an optional, unticked marketing opt-in. */
export function EmailSentForm({ constituency, sector, mpName }: { constituency: Constituency; sector: Sector; mpName: string }) {
  const [optIn, setOptIn] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const emailRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "busy") return;
    if (optIn && !isEmailFormat(email)) {
      setEmailError(email.trim() ? text.marketing.emailFormat : text.marketing.emailMissing);
      emailRef.current?.focus();
      return;
    }
    setEmailError(undefined);
    setState("busy");
    try {
      const res = await fetch("/api/email-sent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          constituencySlug: constituency.slug,
          sectorSlug: sector.slug,
          turnstileToken: token,
          optIn,
          // Only sent if they opted in: otherwise we don't collect it.
          email: optIn ? email.trim() : undefined,
        }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className={styles.sent} role="status">
        <p className={styles.sentThanks}>{fill(text.sentThanks, { name: mpName })}</p>
        <p>
          {text.suggestPosted} <a href="#action-posted-letter">{text.suggestPostedLink}</a>
        </p>
      </div>
    );
  }

  return (
    <form method="post" noValidate onSubmit={handleSubmit} className={styles.sent} aria-labelledby="email-sent-heading">
      <h4 id="email-sent-heading" className={styles.stepHeading}>
        {text.sentHeading}
      </h4>
      <p>{text.sentIntro}</p>

      <div className={formStyles.checkbox}>
        <input id="email-optin" type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
        <label htmlFor="email-optin">{text.marketing.optIn}</label>
      </div>
      {optIn && (
        <TextField
          id="email-optin-address"
          label={text.marketing.emailLabel}
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={emailError}
          inputRef={emailRef}
        />
      )}

      <Turnstile onToken={setToken} />

      <button type="submit" className={formStyles.button} aria-disabled={state === "busy" || undefined}>
        {text.sentButton}
      </button>
      <p role="status" className={formStyles.status}>
        {state === "error" ? text.sentError : ""}
      </p>
    </form>
  );
}
