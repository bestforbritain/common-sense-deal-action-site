import type { Metadata } from "next";
import { inspectToken } from "@/lib/posted/service";
import { ConfirmButton, ConfirmOutcome } from "./ConfirmButton";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Confirm your letter | A ‘Common Sense’ Deal with Europe",
  robots: { index: false },
};

// Looks the letter up on every request; the token is never cached or logged.
export const instant = false;

export default async function ConfirmPage({ params }: PageProps<"/letters/confirm/[token]">) {
  const { token } = await params;
  const state = await inspectToken(token);

  return (
    <div className={styles.page}>
      {state.kind === "pending" ? (
        <ConfirmButton token={token} recipientName={state.recipientName} />
      ) : (
        <ConfirmOutcome result={state} />
      )}
    </div>
  );
}
