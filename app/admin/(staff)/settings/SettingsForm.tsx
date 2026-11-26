"use client";

import { useActionState } from "react";
import type { Settings } from "@/lib/posted/types";
import { saveSettingsAction } from "../../actions";
import formStyles from "@/components/form.module.css";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [message, action, pending] = useActionState(saveSettingsAction, null);

  return (
    <form action={action}>
      <h2>Approval and posting</h2>
      <div className={formStyles.checkbox}>
        <input id="autoSend" name="autoSend" type="checkbox" defaultChecked={settings.autoSend} />
        <label htmlFor="autoSend">
          <strong>Auto-send.</strong> Confirmed letters skip staff approval and go straight to the posting queue. Needs a total budget cap.
        </label>
      </div>
      <div className={formStyles.checkbox}>
        <input id="livePosting" name="livePosting" type="checkbox" defaultChecked={settings.livePosting} />
        <label htmlFor="livePosting">
          <strong>Live posting.</strong> Letters are printed, posted and charged (only on the live site, and only if STANNP_LIVE is “true”).
        </label>
      </div>
      {!settings.livePosting && (
        <div className={formStyles.checkbox}>
          <input id="liveConfirm" name="liveConfirm" type="checkbox" />
          <label htmlFor="liveConfirm">I understand that switching on live posting sends real letters and charges Best for Britain’s Stannp account.</label>
        </div>
      )}

      <h2>Caps</h2>
      <p>Leave blank for no cap. When a cap is reached, letters wait in the queue.</p>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="dailyCap">
          Daily cap (letters per day)
        </label>
        <input id="dailyCap" name="dailyCap" inputMode="numeric" className={`${formStyles.input} ${formStyles.postcode}`} defaultValue={settings.dailyCap ?? ""} />
      </div>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="totalBudget">
          Total budget cap (£)
        </label>
        <input
          id="totalBudget"
          name="totalBudget"
          inputMode="decimal"
          className={`${formStyles.input} ${formStyles.postcode}`}
          defaultValue={settings.totalBudgetPence === null ? "" : (settings.totalBudgetPence / 100).toFixed(2)}
        />
      </div>

      <button type="submit" className={formStyles.button} aria-disabled={pending || undefined}>
        Save settings
      </button>
      <p role="status" className={formStyles.status}>
        {message ?? ""}
      </p>
    </form>
  );
}
