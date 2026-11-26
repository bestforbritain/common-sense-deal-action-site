"use client";

import { useActionState } from "react";
import { sendMagicLink } from "../actions";
import formStyles from "@/components/form.module.css";

export function LoginForm() {
  const [message, action, pending] = useActionState(sendMagicLink, null);
  return (
    <form action={action} className={formStyles.form}>
      <div className={formStyles.field}>
        <label htmlFor="email" className={formStyles.label}>
          Email address
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={formStyles.input} />
      </div>
      <button type="submit" className={formStyles.button} aria-disabled={pending || undefined}>
        Email me a sign-in link
      </button>
      <p role="status" className={formStyles.status}>
        {message ?? ""}
      </p>
    </form>
  );
}
