/**
 * The actions shown on the action page, in order. Add new actions here and give them
 * a component in components/actions/registry.tsx.
 */
export type ActionId = "email-mp" | "posted-letter";

export type ActionConfig = {
  id: ActionId;
  title: string;
  summary: string;
  enabled: boolean;
  order: number;
};

export const actions: readonly ActionConfig[] = [
  {
    id: "email-mp",
    title: "Email your MP",
    summary: "Send a letter about your sector from your own email account. [TODO JOSHUA: approve]",
    enabled: true,
    order: 1,
  },
  {
    id: "posted-letter",
    title: "Send a posted letter",
    summary: "Write to your MP or the Minister, and we’ll print and post your letter for free. [TODO JOSHUA: approve]",
    enabled: true,
    order: 2,
  },
];

export function enabledActions(): ActionConfig[] {
  return actions.filter((a) => a.enabled).sort((a, b) => a.order - b.order);
}
