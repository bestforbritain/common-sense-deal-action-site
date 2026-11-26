"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { copy, fill } from "@/content/copy";
import { formatPostcode, isPostcodeFormat } from "@/lib/postcode";
import {
  clearVerifiedPostcode,
  lookupErrorMessage,
  requestLookup,
  saveVerifiedPostcode,
  type VerifiedPostcode,
} from "@/lib/client/lookup";
import { PostcodeField } from "./PostcodeField";
import styles from "./form.module.css";

const text = copy.action.check;

/**
 * Asks for the business postcode when someone lands on an action page directly,
 * so we know they're a constituent before they send anything.
 */
export function ConstituentCheck(props: {
  constituencySlug: string;
  sectorSlug: string;
  verified: VerifiedPostcode | null;
}) {
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState("");
  const [elsewhere, setElsewhere] = useState<{ slug: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (props.verified?.constituencySlug === props.constituencySlug) {
    return (
      <p className={styles.confirmed}>
        {fill(text.confirmed, { postcode: props.verified.postcode })}{" "}
        <button type="button" className={styles.linkButton} onClick={clearVerifiedPostcode}>
          {text.change}
        </button>
      </p>
    );
  }

  async function submit() {
    setFormError("");
    setElsewhere(null);
    if (!isPostcodeFormat(postcode)) {
      setError(postcode.trim() ? copy.home.form.errors.postcodeFormat : copy.home.form.errors.postcodeMissing);
      inputRef.current?.focus();
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = await requestLookup(postcode);
    setBusy(false);
    if (result.kind === "ok") {
      saveVerifiedPostcode({ postcode: formatPostcode(postcode), constituencySlug: result.constituency.slug });
      if (result.constituency.slug !== props.constituencySlug) setElsewhere(result.constituency);
      return;
    }
    const message = lookupErrorMessage(result);
    if (message?.field) {
      setError(message.message);
      inputRef.current?.focus();
    } else if (message) {
      setFormError(message.message);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy) void submit();
  }

  return (
    <form method="post" noValidate onSubmit={handleSubmit} className={styles.check} aria-labelledby="check-heading">
      <h2 id="check-heading" className={styles.checkHeading}>
        {text.heading}
      </h2>
      <p>{text.intro}</p>
      <PostcodeField
        label={copy.home.form.postcodeLabel}
        value={postcode}
        onChange={setPostcode}
        error={error}
        inputRef={inputRef}
      />
      <button type="submit" className={styles.button} aria-disabled={busy || undefined}>
        {text.submit}
      </button>
      <div role="status" className={styles.status}>
        {formError}
        {formError && (
          <button type="button" onClick={() => void submit()}>
            {copy.lookup.retry}
          </button>
        )}
        {elsewhere && (
          <>
            {fill(text.otherConstituency, { constituency: elsewhere.name })}{" "}
            <Link href={`/act/${elsewhere.slug}/${props.sectorSlug}`}>
              {fill(text.otherConstituencyLink, { constituency: elsewhere.name })}
            </Link>
          </>
        )}
      </div>
    </form>
  );
}
