/**
 * Shared letter parts, copied word for word from inputs/letters.md
 * ("Draft · 26 November 2026 · Joshua Edwicker"). Draft awaiting sign-off.
 * Edit the wording here; no code changes are needed.
 *
 * Tokens: {mpAddressAs} {constituency} {sectorNoun} {senderName} {role} {businessName} {businessAddress}
 */

export const openings = {
  mp: ["Dear {mpAddressAs},", "I am writing to you as {role} of {businessName}, a {sectorNoun} business in {constituency}, to ask you to support the UK rejoining the European Union."],
  minister: ["Dear Minister,", "I am writing as {role} of {businessName}, a {sectorNoun} business in {constituency}, to urge the government to set the UK on a path back to EU membership."],
};

export const asks = {
  mp: ["Independent modelling by Frontier Economics for Best for Britain found that EU membership could boost the UK economy by at least £92bn and add £43bn a year in exports. For businesses like mine, it would mean fewer forms, lower costs and easier access to our biggest market.", "Please will you support the UK rejoining the EU, and press the government to signal that we intend to rejoin? I would be grateful to know what you will do."],
  minister: ["Independent modelling by Frontier Economics for Best for Britain found that EU membership could boost the UK economy by at least £92bn and add £43bn a year in exports. That is far more than any trade deal the UK has signed since leaving the EU.", "I urge the government to signal that the UK intends to rejoin the European Union. I would welcome a reply setting out what the government will do."],
};

export const signOff: string[] = ["Yours sincerely,", "{senderName}", "{role}, {businessName}", "{businessAddress}"];

export const personalParagraphPrompt = {
  label: "How has the current deal with the EU affected your business? (optional)",
  hint: "For example, orders you've lost, paperwork you now fill in, or staff you can't recruit. Up to 1,000 characters.",
};

export const emailSubject = {
  default: "A {constituency} business asking you to back EU membership",
  alternative: "{businessName} on EU membership",
};
