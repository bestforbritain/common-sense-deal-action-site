"use client";

import { useActionState } from "react";
import Link from "next/link";
import { fill } from "@/content/copy";
import { confirmCopy } from "@/content/postedLetter";
import type { ConfirmResult } from "@/lib/posted/service";
import { confirmAction } from "./actions";
import formStyles from "@/components/form.module.css";

/** The confirmation step: heading and button, replaced by the outcome once pressed. */
export function ConfirmButton({ token, recipientName }: { token: string; recipientName: string }) {
  const [result, action, pending] = useActionState<ConfirmResult | null>(() => confirmAction(token), null);

  if (result) return <ConfirmOutcome result={result} />;
  return (
    <>
      <h1>{confirmCopy.pendingTitle}</h1>
      <p>{fill(confirmCopy.pending, { recipient: recipientName })}</p>
      <form action={action}>
        <button type="submit" className={formStyles.button} aria-disabled={pending || undefined}>
          {pending ? confirmCopy.confirming : confirmCopy.button}
        </button>
      </form>
    </>
  );
}

export function ConfirmOutcome({ result }: { result: ConfirmResult }) {
  const content = {
    confirmed: {
      title: confirmCopy.title,
      body: result.kind === "confirmed" && result.autoSend ? confirmCopy.bodyAutoSend : confirmCopy.body,
    },
    already: { title: confirmCopy.alreadyTitle, body: confirmCopy.already },
    expired: { title: confirmCopy.expiredTitle, body: confirmCopy.expired },
    invalid: { title: confirmCopy.invalidTitle, body: confirmCopy.invalid },
  }[result.kind];

  return (
    <div role="status">
      <h1>{content.title}</h1>
      <p>{content.body}</p>
      {result.kind === "confirmed" && result.capDelay && <p>{confirmCopy.capDelay}</p>}
      <p>
        <Link href="/">{confirmCopy.homeLink}</Link>
      </p>
    </div>
  );
}
