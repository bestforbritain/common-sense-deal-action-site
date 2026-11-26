"use client";

import { useSyncExternalStore } from "react";
import { copy } from "@/content/copy";
import { enabledActions } from "@/content/actions";
import type { Sector } from "@/content/sectors";
import type { Constituency } from "@/lib/constituencies/types";
import { parseVerifiedPostcode, readVerifiedPostcodeRaw, subscribeVerifiedPostcode } from "@/lib/client/lookup";
import { actionComponents } from "./actions/registry";
import { ConstituentCheck } from "./ConstituentCheck";
import styles from "./ActionArea.module.css";

/** Constituent check plus the config-driven list of action modules. */
export function ActionArea({ constituency, sector }: { constituency: Constituency; sector: Sector }) {
  // undefined on the server and during hydration; the stored value after that.
  const raw = useSyncExternalStore(subscribeVerifiedPostcode, readVerifiedPostcodeRaw, () => undefined);
  const verified = parseVerifiedPostcode(raw);
  const confirmed = verified?.constituencySlug === constituency.slug ? verified : null;

  return (
    <div className={styles.area}>
      {raw !== undefined && (
        <ConstituentCheck constituencySlug={constituency.slug} sectorSlug={sector.slug} verified={verified} />
      )}

      <h2 className={styles.heading}>{copy.action.actionsHeading}</h2>
      {enabledActions().map((action) => {
        const Component = actionComponents[action.id];
        return (
          <Component
            key={action.id}
            title={action.title}
            summary={action.summary}
            constituency={constituency}
            sector={sector}
            verified={confirmed}
          />
        );
      })}
    </div>
  );
}
