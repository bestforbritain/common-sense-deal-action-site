"use client";

import { useEffect, useState, type FormEvent } from "react";
import { copy, fill } from "@/content/copy";
import { personalParagraphPrompt } from "@/content/letters";
import { minister } from "@/content/minister";
import { postedCopy } from "@/content/postedLetter";
import type { Sector } from "@/content/sectors";
import type { Constituency } from "@/lib/constituencies/types";
import type { VerifiedPostcode } from "@/lib/client/lookup";
import { buildLetter, letterTokens, PERSONAL_PARAGRAPH_MAX, type SenderDetails } from "@/lib/letters";
import { isEmailFormat } from "@/lib/validation";
import { TextField } from "../TextField";
import { Turnstile } from "../Turnstile";
import formStyles from "../form.module.css";
import styles from "./actions.module.css";

const text = postedCopy;
const placeholderValues = Object.values(copy.email.placeholders);
type Recipient = "mp" | "minister";
type Field = keyof SenderDetails | "email" | "letterText" | "consent";

// Element ids, used to move focus to the first field with an error.
const FIELD_IDS: Record<Field, string> = {
  senderName: "posted-sender-name",
  role: "posted-role",
  businessName: "posted-business-name",
  businessAddress: "posted-business-address",
  email: "posted-email",
  letterText: "posted-letter",
  consent: "posted-consent",
};
const focusField = (field: Field) => document.getElementById(FIELD_IDS[field])?.focus();

const FIELD_NAMES: Record<string, string> = {
  senderName: "full name",
  role: "role",
  businessName: "business name",
  businessAddress: "business address",
  letterText: "letter",
};

/** Send a posted letter: recipient → details → editable letter → A4 preview → submit. */
export function PostedLetterComposer({
  constituency,
  sector,
  verified,
}: {
  constituency: Constituency;
  sector: Sector;
  verified: VerifiedPostcode;
}) {
  const mp = constituency.mp;
  const mpAvailable = Boolean(mp?.postalAddress);
  const [recipient, setRecipient] = useState<Recipient>(mpAvailable ? "mp" : "minister");
  const [sender, setSender] = useState<SenderDetails>({ senderName: "", role: "", businessName: "", businessAddress: verified.postcode });
  const [email, setEmail] = useState("");
  const [personal, setPersonal] = useState("");
  const [editedLetter, setEditedLetter] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");
  const [preview, setPreview] = useState<{ url: string; sha256: string; key: string } | null>(null);
  const [busy, setBusy] = useState<"preview" | "submit" | null>(null);
  const [done, setDone] = useState(false);

  const tokens = letterTokens({ sectorSlug: sector.slug, constituency: constituency.name, mp, sender });
  const suggested = buildLetter({ sectorSlug: sector.slug, recipient, tokens, personalParagraph: personal });
  const letterText = editedLetter ?? suggested;

  const payload = {
    constituencySlug: constituency.slug,
    sectorSlug: sector.slug,
    recipientType: recipient,
    senderName: sender.senderName,
    role: sender.role,
    businessName: sender.businessName,
    businessAddress: sender.businessAddress,
    email,
    letterText,
  };
  // The preview is only valid for exactly these inputs.
  const key = JSON.stringify(payload);
  const fresh = preview?.key === key;

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const update = (k: keyof SenderDetails) => (v: string) => setSender((s) => ({ ...s, [k]: v }));

  function validate(forSubmit: boolean): boolean {
    const next: Partial<Record<Field, string>> = {};
    for (const k of ["senderName", "role", "businessName", "businessAddress"] as const) {
      if (!sender[k].trim()) next[k] = fill(text.errors.required, { field: FIELD_NAMES[k] });
    }
    if (!isEmailFormat(email)) next.email = email.trim() ? text.errors.emailFormat : fill(text.errors.required, { field: "email address" });
    if (!letterText.trim()) next.letterText = fill(text.errors.required, { field: "letter" });
    else if (placeholderValues.some((p) => letterText.includes(p))) next.letterText = copy.email.gaps;
    if (forSubmit && !consent) next.consent = text.consentMissing;
    setErrors(next);
    const first = (Object.keys(next) as Field[])[0];
    if (first) focusField(first);
    return !first;
  }

  async function handlePreview() {
    setFormError("");
    if (!validate(false)) return;
    setBusy("preview");
    try {
      const res = await fetch("/api/letters/preview", { method: "POST", headers: { "content-type": "application/json" }, body: key });
      if (res.ok) {
        const blob = await res.blob();
        setPreview({ url: URL.createObjectURL(blob), sha256: res.headers.get("x-pdf-sha256") ?? "", key });
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body.error === "too-long") {
          setErrors({ letterText: text.tooLong });
          focusField("letterText");
        } else setFormError(text.errors.unavailable);
      }
    } catch {
      setFormError(text.errors.unavailable);
    }
    setBusy(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (busy || !preview || !fresh || !validate(true)) return;
    setBusy("submit");
    try {
      const res = await fetch("/api/letters/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, previewSha256: preview.sha256, consent, optIn, turnstileToken: token }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (body.ok) setDone(true);
      else
        setFormError(
          body.error === "duplicate"
            ? text.errors.duplicate
            : body.error === "preview-changed"
              ? text.errors.previewChanged
              : body.error === "bot-check"
                ? text.errors.botCheck
                : text.errors.unavailable,
        );
    } catch {
      setFormError(text.errors.unavailable);
    }
    setBusy(null);
  }

  if (done) {
    return (
      <div className={styles.sent} role="status">
        <h4 className={styles.stepHeading}>{text.checkEmailHeading}</h4>
        <p>{fill(text.checkEmail, { email })}</p>
      </div>
    );
  }

  return (
    <form method="post" noValidate onSubmit={handleSubmit} className={styles.composer}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.stepHeading}>{text.recipientHeading}</legend>
        {mpAvailable && mp && (
          <div className={formStyles.checkbox}>
            <input id="posted-recipient-mp" type="radio" name="recipient" checked={recipient === "mp"} onChange={() => setRecipient("mp")} />
            <label htmlFor="posted-recipient-mp">{fill(text.recipientMp, { name: mp.displayName })}</label>
          </div>
        )}
        <div className={formStyles.checkbox}>
          <input id="posted-recipient-minister" type="radio" name="recipient" checked={recipient === "minister"} onChange={() => setRecipient("minister")} />
          <label htmlFor="posted-recipient-minister">{fill(text.recipientMinister, { name: minister.name, role: minister.role })}</label>
        </div>
        {!mpAvailable && mp && <p>{text.recipientMpUnavailable}</p>}
      </fieldset>

      <h4 className={styles.stepHeading}>{text.detailsHeading}</h4>
      <TextField id="posted-sender-name" label={text.fields.senderName} autoComplete="name" value={sender.senderName} onChange={update("senderName")} error={errors.senderName} />
      <TextField id="posted-role" label={text.fields.role} hint={text.fields.roleHint} autoComplete="organization-title" value={sender.role} onChange={update("role")} error={errors.role} />
      <TextField id="posted-business-name" label={text.fields.businessName} autoComplete="organization" value={sender.businessName} onChange={update("businessName")} error={errors.businessName} />
      <TextField
        id="posted-business-address"
        label={text.fields.businessAddress}
        hint={text.fields.businessAddressHint}
        multiline
        rows={4}
        autoComplete="street-address"
        value={sender.businessAddress}
        onChange={update("businessAddress")}
        error={errors.businessAddress}
       
      />
      <TextField id="posted-email" label={text.fields.email} hint={text.fields.emailHint} type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
      <TextField
        id="posted-personal"
        label={personalParagraphPrompt.label}
        hint={personalParagraphPrompt.hint}
        multiline
        rows={5}
        maxLength={PERSONAL_PARAGRAPH_MAX}
        value={personal}
        onChange={setPersonal}
        footer={fill(copy.email.personalCount, { count: personal.length.toLocaleString("en-GB"), max: PERSONAL_PARAGRAPH_MAX.toLocaleString("en-GB") })}
        wide
      />

      <h4 className={styles.stepHeading}>{text.letterHeading}</h4>
      <TextField
        id="posted-letter"
        label={copy.email.letterLabel}
        hint={text.letterHint}
        multiline
        rows={22}
        value={letterText}
        onChange={setEditedLetter}
        error={errors.letterText}
        footer={fill(text.letterLength, { count: letterText.length.toLocaleString("en-GB") })}
       
        wide
      />
      {editedLetter !== null && (
        <p>
          <button type="button" className={formStyles.linkButton} onClick={() => setEditedLetter(null)}>
            {copy.email.resetLetter}
          </button>
        </p>
      )}

      <button type="button" className={formStyles.secondaryButton} onClick={() => void handlePreview()} aria-disabled={busy === "preview" || undefined}>
        {busy === "preview" ? text.previewing : text.previewButton}
      </button>

      {preview && (
        <section className={styles.preview} aria-labelledby="posted-preview-heading">
          <h4 id="posted-preview-heading" className={styles.stepHeading}>
            {text.previewHeading}
          </h4>
          <p>{fresh ? text.previewIntro : <strong className={formStyles.error}>{text.previewStale}</strong>}</p>
          <iframe className={styles.previewFrame} src={preview.url} title={text.previewFrameTitle} />
          <p>
            <a href={preview.url} target="_blank" rel="noopener">
              {text.previewDownload}
            </a>
          </p>

          {fresh && (
            <>
              <div className={formStyles.field} data-invalid={errors.consent ? "" : undefined}>
                {errors.consent && (
                  <p id="posted-consent-error" className={formStyles.error}>
                    <span className="visually-hidden">Error: </span>
                    {errors.consent}
                  </p>
                )}
                <div className={formStyles.checkbox}>
                  <input
                    id="posted-consent"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    aria-describedby={errors.consent ? "posted-consent-error" : undefined}
                    aria-invalid={errors.consent ? true : undefined}
                  />
                  <label htmlFor="posted-consent">{text.consent}</label>
                </div>
              </div>
              <div className={formStyles.checkbox}>
                <input id="posted-optin" type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
                <label htmlFor="posted-optin">{copy.email.marketing.optIn}</label>
              </div>
              <Turnstile onToken={setToken} />
              <button type="submit" className={formStyles.button} aria-disabled={busy === "submit" || undefined}>
                {busy === "submit" ? text.submitting : text.submit}
              </button>
            </>
          )}
        </section>
      )}

      <p role="status" className={formStyles.status}>
        {formError}
      </p>
    </form>
  );
}
