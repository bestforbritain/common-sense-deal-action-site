import styles from "./CampaignName.module.css";

/**
 * The campaign name as the live site renders it: capitals, curly quotes,
 * white text on a red block. Each wrapped line gets its own block.
 */
export function CampaignName() {
  return <span className={styles.csd}>‘COMMON SENSE’ DEAL</span>;
}
