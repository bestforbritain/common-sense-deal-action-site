"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/content/copy";
import { sectors } from "@/content/sectors";
import { formatPostcode, isPostcodeFormat } from "@/lib/postcode";
import { lookupErrorMessage, requestLookup, saveVerifiedPostcode } from "@/lib/client/lookup";
import { PostcodeField } from "./PostcodeField";
import styles from "./form.module.css";

type Errors = { sector?: string; postcode?: string };

const text = copy.home.form;

/**
 * Sector + business postcode form on the home page.
 *
 * The postcode never goes in a URL: it is sent in a POST body to /api/lookup and kept
 * in sessionStorage for the action page (see lib/client/lookup.ts).
 */
export function FindMpForm() {
  const router = useRouter();
  const [sector, setSector] = useState("");
  const [postcode, setPostcode] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const sectorRef = useRef<HTMLSelectElement>(null);
  const postcodeRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const next: Errors = {};
    if (!sector) next.sector = text.errors.sectorMissing;
    if (!postcode.trim()) next.postcode = text.errors.postcodeMissing;
    else if (!isPostcodeFormat(postcode)) next.postcode = text.errors.postcodeFormat;
    setErrors(next);
    setFormError("");
    if (next.sector) return sectorRef.current?.focus();
    if (next.postcode) return postcodeRef.current?.focus();

    setBusy(true);
    const result = await requestLookup(postcode);
    if (result.kind === "ok") {
      saveVerifiedPostcode({ postcode: formatPostcode(postcode), constituencySlug: result.constituency.slug });
      router.push(`/act/${result.constituency.slug}/${sector}`);
      return;
    }
    setBusy(false);
    const error = lookupErrorMessage(result);
    if (error?.field) {
      setErrors({ postcode: error.message });
      postcodeRef.current?.focus();
    } else if (error) {
      setFormError(error.message);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy) void submit();
  }

  return (
    <form method="post" noValidate onSubmit={handleSubmit} className={styles.form} aria-labelledby="find-mp">
      <h2 id="find-mp" className="visually-hidden">
        {text.heading}
      </h2>

      <div className={styles.field} data-invalid={errors.sector ? "" : undefined}>
        <label htmlFor="sector" className={styles.label}>
          {text.sectorLabel}
        </label>
        {errors.sector && (
          <p id="sector-error" className={styles.error}>
            <span className="visually-hidden">Error: </span>
            {errors.sector}
          </p>
        )}
        <select
          id="sector"
          name="sector"
          ref={sectorRef}
          className={styles.select}
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          aria-invalid={errors.sector ? true : undefined}
          aria-describedby={errors.sector ? "sector-error" : undefined}
        >
          <option value="" disabled>
            {text.sectorPlaceholder}
          </option>
          {sectors.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <PostcodeField
        id="postcode"
        label={text.postcodeLabel}
        hint={text.postcodeHint}
        value={postcode}
        onChange={setPostcode}
        error={errors.postcode}
        inputRef={postcodeRef}
      />

      <button type="submit" className={styles.button} aria-disabled={busy || undefined}>
        {busy ? text.submitting : text.submit}
      </button>

      <p role="status" className={styles.status}>
        {formError}
        {formError && (
          <button type="button" onClick={() => void submit()}>
            {copy.lookup.retry}
          </button>
        )}
      </p>
    </form>
  );
}
