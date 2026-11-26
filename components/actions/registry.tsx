import type { ComponentType } from "react";
import type { ActionId } from "@/content/actions";
import type { Sector } from "@/content/sectors";
import type { Constituency } from "@/lib/constituencies/types";
import type { VerifiedPostcode } from "@/lib/client/lookup";
import { EmailMpAction } from "./EmailMpAction";
import { PostedLetterAction } from "./PostedLetterAction";

export type ActionProps = {
  title: string;
  summary: string;
  constituency: Constituency;
  sector: Sector;
  /** The confirmed business postcode, or null until the constituent check is done. */
  verified: VerifiedPostcode | null;
};

export const actionComponents: Record<ActionId, ComponentType<ActionProps>> = {
  "email-mp": EmailMpAction,
  "posted-letter": PostedLetterAction,
};
