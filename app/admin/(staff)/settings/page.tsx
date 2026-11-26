import { requireAdmin } from "@/lib/admin/auth";
import { getPostedStore } from "@/lib/posted/store";
import { isLivePosting } from "@/lib/stannp";
import { SettingsForm } from "./SettingsForm";
import styles from "../../admin.module.css";

export const instant = false;

export default async function SettingsPage() {
  await requireAdmin();
  const store = getPostedStore();
  const [settings, spend, sentToday] = await Promise.all([store.getSettings(), store.spendPence(), store.sentTodayCount()]);
  const env = { STANNP_LIVE: process.env.STANNP_LIVE, VERCEL_ENV: process.env.VERCEL_ENV };
  const live = isLivePosting(env, settings.livePosting);

  return (
    <>
      <h1>Settings</h1>

      <div className={`${styles.mode} ${live ? styles.modeLive : ""}`} role="status">
        <p>
          <strong>{live ? "LIVE: approved letters are printed, posted and charged." : "Test mode: Stannp makes sample PDFs. Nothing is posted or charged."}</strong>
        </p>
        <p>Letters are only posted for real when all three of these are true:</p>
        <ul>
          <li>The STANNP_LIVE setting on the server is “true”: {env.STANNP_LIVE === "true" ? "yes" : "no"}</li>
          <li>This is the live site: {env.VERCEL_ENV === "production" ? "yes" : `no (${env.VERCEL_ENV ?? "local"})`}</li>
          <li>“Live posting” below is on: {settings.livePosting ? "yes" : "no"}</li>
        </ul>
        <p>Stannp API key: {process.env.STANNP_API_KEY ? "set" : "not set (queued letters wait until it is)"}</p>
      </div>

      <h2>Spend</h2>
      <p>
        Spent on real letters so far: <strong>£{(spend / 100).toFixed(2)}</strong>, from Stannp’s reported costs. Letters sent to Stannp
        today: <strong>{sentToday}</strong>.
      </p>

      <SettingsForm settings={settings} />

      {settings.updatedAt && (
        <p>
          Last changed {new Date(settings.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} by {settings.updatedBy}.
        </p>
      )}
    </>
  );
}
