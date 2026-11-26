import { Fragment } from "react";
import { CampaignName } from "./CampaignName";

/** Renders a copy string, swapping each `{csd}` token for the styled campaign name. */
export function RichText({ text }: { text: string }) {
  const parts = text.split("{csd}");
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && <CampaignName />}
        </Fragment>
      ))}
    </>
  );
}
