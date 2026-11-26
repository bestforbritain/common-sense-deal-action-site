"use client";

import { useRef, useState, type MouseEvent } from "react";
import { copy, fill } from "@/content/copy";
import { personalParagraphPrompt } from "@/content/letters";
import type { Sector } from "@/content/sectors";
import type { Constituency, Mp } from "@/lib/constituencies/types";
import { composeLink, type ComposeTarget } from "@/lib/emailLinks";
import { buildLetter, buildSubject, letterTokens, PERSONAL_PARAGRAPH_MAX, type SenderDetails } from "@/lib/letters";
import type { VerifiedPostcode } from "@/lib/client/lookup";
import { TextField } from "../TextField";
import { EmailSentForm } from "./EmailSentForm";
import formStyles from "../form.module.css";
import styles from "./actions.module.css";

const text = copy.email;
const placeholderValues = Object.values(text.placeholders);

// [TODO JOSHUA: BCC address, or none]. Null means no BCC.
const CAMPAIGN_BCC: string | null = null;

/**
 * Email your MP: details → editable letter → open in the sender's own email account.
 * The letter follows the details until the sender edits it; after that, their edits win.
 */
export function EmailComposer({
  constituency,
  sector,
  mp,
  verified,
}: {
  constituency: Constituency;
  sector: Sector;
  mp: Mp & { email: string };
  verified: VerifiedPostcode;
}) {
  const [sender, setSender] = useState<SenderDetails>({
    senderName: "",
    role: "",
    businessName: "",
    businessAddress: verified.postcode,
  });
  const [personal, setPersonal] = useState("");
  const [editedLetter, setEditedLetter] = useState<string | null>(null);
  const [editedSubject, setEditedSubject] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [gapsError, setGapsError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const tokens = letterTokens({ sectorSlug: sector.slug, constituency: constituency.name, mp, sender });
  const suggestedLetter = buildLetter({ sectorSlug: sector.slug, recipient: "mp", tokens, personalParagraph: personal });
  const letter = editedLetter ?? suggestedLetter;
  const subject = editedSubject ?? buildSubject(tokens);
  const email = { to: mp.email, subject, body: letter, bcc: CAMPAIGN_BCC };

  const update = (key: keyof SenderDetails) => (value: string) => setSender((s) => ({ ...s, [key]: value }));

  /** Stops sending while the letter still contains "[your name]"-style gaps. */
  function hasGaps(): boolean {
    if (!placeholderValues.some((p) => letter.includes(p))) {
      setGapsError("");
      return false;
    }
    setGapsError(copy.email.gaps);
    firstFieldRef.current?.focus();
    return true;
  }

  async function copyToClipboard(message: string) {
    try {
      await navigator.clipboard.writeText(letter);
      setNotice(message);
    } catch {
      setNotice(text.copyFailed);
    }
  }

  function handleOpen(event: MouseEvent<HTMLAnchorElement>) {
    if (hasGaps()) {
      event.preventDefault();
      return;
    }
    const target = event.currentTarget.dataset.target as ComposeTarget;
    if (!composeLink(target, email).includesBody) void copyToClipboard(text.tooLongForLink);
    else setNotice("");
  }

  const links = {
    mailto: composeLink("mailto", email).url,
    gmail: composeLink("gmail", email).url,
    outlook: composeLink("outlook", email).url,
  };

  return (
    <div className={styles.composer}>
      <h4 className={styles.stepHeading}>{text.detailsHeading}</h4>
      <TextField id="email-sender-name" label={text.fields.senderName} autoComplete="name" value={sender.senderName} onChange={update("senderName")} inputRef={firstFieldRef} />
      <TextField id="email-role" label={text.fields.role} hint={text.fields.roleHint} autoComplete="organization-title" value={sender.role} onChange={update("role")} />
      <TextField id="email-business-name" label={text.fields.businessName} autoComplete="organization" value={sender.businessName} onChange={update("businessName")} />
      <TextField
        id="email-business-address"
        label={text.fields.businessAddress}
        hint={text.fields.businessAddressHint}
        multiline
        rows={4}
        autoComplete="street-address"
        value={sender.businessAddress}
        onChange={update("businessAddress")}
      />
      <TextField
        id="email-personal"
        label={personalParagraphPrompt.label}
        hint={personalParagraphPrompt.hint}
        multiline
        rows={5}
        maxLength={PERSONAL_PARAGRAPH_MAX}
        value={personal}
        onChange={setPersonal}
        footer={fill(text.personalCount, { count: personal.length.toLocaleString("en-GB"), max: PERSONAL_PARAGRAPH_MAX.toLocaleString("en-GB") })}
        wide
      />

      <h4 className={styles.stepHeading}>{text.letterHeading}</h4>
      <TextField id="email-subject" label={text.subjectLabel} value={subject} onChange={setEditedSubject} wide />
      <TextField
        id="email-letter"
        label={text.letterLabel}
        hint={text.letterHint}
        multiline
        rows={22}
        value={letter}
        onChange={setEditedLetter}
        wide
      />
      {(editedLetter !== null || editedSubject !== null) && (
        <p>
          <button
            type="button"
            className={formStyles.linkButton}
            onClick={() => {
              setEditedLetter(null);
              setEditedSubject(null);
            }}
          >
            {text.resetLetter}
          </button>
        </p>
      )}

      <h4 className={styles.stepHeading}>{text.sendHeading}</h4>
      <p>{fill(text.sendIntro, { name: mp.displayName })}</p>
      <p>
        {text.toLabel} <strong>{mp.email}</strong>
      </p>
      {gapsError && (
        <p className={formStyles.error} role="alert">
          {gapsError}
        </p>
      )}
      <div className={styles.sendButtons}>
        <a href={links.mailto} className={formStyles.button} data-target="mailto" onClick={handleOpen}>
          {text.openEmailApp}
        </a>
        <a href={links.gmail} target="_blank" rel="noopener noreferrer" className={formStyles.secondaryButton} data-target="gmail" onClick={handleOpen}>
          {text.openGmail}
        </a>
        <a href={links.outlook} target="_blank" rel="noopener noreferrer" className={formStyles.secondaryButton} data-target="outlook" onClick={handleOpen}>
          {text.openOutlook}
        </a>
        <button
          type="button"
          className={formStyles.secondaryButton}
          onClick={() => {
            if (!hasGaps()) void copyToClipboard(text.copied);
          }}
        >
          {text.copyLetter}
        </button>
      </div>
      <p role="status" className={formStyles.status}>
        {notice}
      </p>

      <EmailSentForm constituency={constituency} sector={sector} mpName={mp.displayName} />
    </div>
  );
}
