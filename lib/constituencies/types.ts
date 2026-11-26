export type Nation = "england" | "scotland" | "wales" | "northern-ireland";

export type Mp = {
  /** Members API id. */
  id: number;
  /** e.g. "Lucy Powell", "Sir Julian Lewis". */
  displayName: string;
  /**
   * Parliament's "address as" name, e.g. "Sir Lindsay". Empty for most MPs, so letters
   * fall back to displayName (decision 26 November 2026). Never derived from gender.
   */
  addressAs: string | null;
  /** e.g. "Labour (Co-op)", "Speaker". */
  party: string;
  isSpeaker: boolean;
  /** Public email from the Members API, trimmed. Never constructed. */
  email: string | null;
  /** Parliamentary office address lines, ending with the postcode. */
  postalAddress: string[] | null;
  thumbnailUrl: string;
};

export type Constituency = {
  onsCode: string;
  name: string;
  slug: string;
  nation: Nation;
  /** Null when the seat is vacant. */
  mp: Mp | null;
  refreshedAt: string;
};
