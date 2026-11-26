"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/content/copy";
import { sectors, type Sector } from "@/content/sectors";
import styles from "./ChangeSector.module.css";
import formStyles from "./form.module.css";

const text = copy.action;

/** Shows the chosen sector, with a small form to switch to another one. */
export function ChangeSector({ constituencySlug, sector }: { constituencySlug: string; sector: Sector }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(sector.slug);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpen(false);
    if (value !== sector.slug) router.push(`/act/${constituencySlug}/${value}`);
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.current}>
        {text.sectorLabel} <strong>{sector.name}</strong>{" "}
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {text.changeSector}
        </button>
      </p>
      {open && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="change-sector" className="visually-hidden">
            {copy.home.form.sectorLabel}
          </label>
          <select
            id="change-sector"
            className={formStyles.select}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            {sectors.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.submit}>
            {text.changeSectorSubmit}
          </button>
        </form>
      )}
    </div>
  );
}
