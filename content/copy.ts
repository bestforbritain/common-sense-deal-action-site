/**
 * All public copy for the site.
 *
 * - `{csd}` renders the campaign name, ‘COMMON SENSE’ DEAL, in the live site's style
 *   (see components/CampaignName.tsx).
 * - Anything marked [TODO JOSHUA: …] is a placeholder or a draft awaiting sign-off.
 *   Placeholders are shown on the page so they can't slip through unnoticed.
 */

export const copy = {
  meta: {
    title: "Write to your MP or the Minister | A ‘Common Sense’ Deal with Europe",
    description: "Tell them why EU membership is common sense for your business.",
  },

  skipLink: "Skip to content",

  header: {
    // Alt text for the logo, which also links to the home page.
    logoAlt: "A ‘Common Sense’ Deal with Europe: home",
  },

  home: {
    // Rendered with the styled campaign name in place of {csd}.
    headline: "Tell your MP what a {csd} would mean for your business.",

    form: {
      heading: "Find your MP",
      sectorLabel: "Sector",
      sectorPlaceholder: "Choose your sector",
      postcodeLabel: "Business postcode",
      postcodeHint: "The postcode of your business premises in England, Scotland or Wales.",
      submit: "Find my MP",
      submitting: "Finding your MP…",
      errors: {
        sectorMissing: "Choose your business’s sector",
        postcodeMissing: "Enter your business postcode",
        postcodeFormat: "Enter a full UK postcode, like SW1A 1AA",
      },
    },

    why: {
      heading: "Why EU membership is common sense",
      // Verbatim from the brief. The business paragraph (from block 2) moved to the top on
      // 27 November 2026; the rest of block 2 was removed. The £92bn sentence was changed on
      // 26 November 2026 to say "in the long run". [TODO JOSHUA: approve this wording]
      paragraphs: [
        "If you run a business you’ll find that buying and selling parts, or selling your finished products, becomes faster and cheaper if the UK and the EU agree a {csd}. There will be fewer forms to fill in and transport costs will go down - mostly because ports like Dover won’t be bogged down with paperwork.",
        "Red tape moving car parts from Germany shouldn’t cost jobs at car plants in Luton. British goods destined for French shops shouldn’t get stuck for twenty hours at Dover. And you shouldn’t be stopped from working or travelling in places like Paris, Barcelona, or Berlin.",
        "It’s just common sense.",
        "Our current deal with the EU is causing too much hassle for ordinary people and business owners.",
        "By rejoining the EU we can get rid of this unnecessary hassle. We can return freedom of movement. We can supercharge the UK economy and drive costs down.",
        "EU membership could deliver at least £92bn in economic growth in the long run, and £43bn in additional exports each and every year.",
        "It’s just common sense.",
      ],
      sourceLabel: "Source: Frontier Economics for Best for Britain",
      sourceUrl: "https://bestforbritain.org/publication/eu-uk-integration/",
    },

  },

  footer: {
    // [TODO JOSHUA: confirm footer links] Prefilled from the live campaign site's footer.
    organisation: "A Best for Britain campaign",
    links: [
      { label: "Best for Britain", href: "https://www.bestforbritain.org/" },
      { label: "Privacy notice", href: "https://www.bestforbritain.org/privacy_policy" },
      { label: "Terms of use", href: "https://www.bestforbritain.org/terms_of_use" },
      { label: "Contact", href: "[TODO JOSHUA: contact link]" },
    ],
  },

  // Lookup and action-page states. Used from Phase 2. All [TODO JOSHUA: approve].
  lookup: {
    notRecognised: "We don’t recognise that postcode. Check it’s the postcode of your business premises, not a PO Box.",
    retired: "That postcode was retired in {year}. Enter your business’s current postcode.",
    notCovered: "This tool covers businesses in England, Scotland and Wales only, so we can’t find an MP for that postcode.",
    unavailable: "We can’t look up postcodes at the moment. Try again in a minute.",
    rateLimited: "You’ve looked up a lot of postcodes in a short time. Wait a few minutes, then try again.",
    retry: "Try again",
  },

  // Action page: /act/{constituency}/{sector}. All [TODO JOSHUA: approve].
  action: {
    pageTitle: "Write to your MP in {constituency}",
    mpLine: "{name}, {party} MP for {constituency}",
    speakerLine: "{name}, Speaker of the House of Commons and MP for {constituency}",
    vacantLine: "No MP for {constituency}",
    photoAlt: "Photo of {name}",
    sectorLabel: "Your sector:",
    changeSector: "Change sector",
    changeSectorSubmit: "Use this sector",
    check: {
      heading: "Confirm your business postcode",
      intro: "So your MP knows you’re a constituent, enter the postcode of your business premises before you write.",
      submit: "Confirm postcode",
      confirmed: "Business postcode: {postcode}",
      change: "Change postcode",
      otherConstituency: "That postcode is in {constituency}, which has a different MP.",
      otherConstituencyLink: "Go to the page for {constituency}",
    },
    actionsHeading: "What you can do",
    // Phase 2 only: the action modules are built in Phases 3 and 4.
    comingSoon: "This action is being built and will be added in the next phase.",
  },

  // Email your MP. All [TODO JOSHUA: approve] unless noted.
  email: {
    needsPostcode: "Confirm your business postcode above to write your email.",
    detailsHeading: "Your details",
    fields: {
      senderName: "Your name",
      role: "Your role",
      roleHint: "For example, owner, director or manager.",
      businessName: "Business name",
      businessAddress: "Business address",
      businessAddressHint: "This goes at the end of your letter so your MP can reply. We’ve added your postcode.",
    },
    personalCount: "{count} of {max} characters",
    personalTooLong: "Your paragraph is {over} characters too long",
    letterHeading: "Your email",
    subjectLabel: "Subject",
    letterLabel: "Letter",
    letterHint: "You can change any of the wording before you send it.",
    resetLetter: "Start again from the suggested letter",
    // Shown in the letter where a detail hasn't been filled in yet.
    placeholders: {
      senderName: "[your name]",
      role: "[your role]",
      businessName: "[your business name]",
      businessAddress: "[your business address]",
      mpAddressAs: "[your MP]",
    },
    sendHeading: "Send it from your own email account",
    sendIntro: "We don’t send it for you. These buttons open a new email to {name} with your letter in it.",
    toLabel: "To:",
    openEmailApp: "Open in my email app",
    openGmail: "Open in Gmail",
    openOutlook: "Open in Outlook",
    copyLetter: "Copy letter",
    copied: "Letter copied. You can paste it into any email.",
    gaps: "Your letter still has gaps, like [your name]. Fill in your details above, or edit the letter.",
    copyFailed: "We couldn’t copy the letter. Select the text in the box above and copy it yourself.",
    tooLongForLink:
      "Your letter is too long to put in a link, so we’ve copied it for you. Paste it into the email that has just opened.",
    sentHeading: "Sent your email?",
    sentIntro: "Let us know, so we can count how many businesses have written. We only record your sector and constituency.",
    sentButton: "I’ve sent it",
    sentThanks: "Thank you for writing to {name}.",
    sentError: "We couldn’t record that just now. Try again in a minute.",
    suggestPosted: "You can also send a posted letter to your MP or the Minister.",
    suggestPostedLink: "Send a posted letter",
    marketing: {
      emailLabel: "Your email address",
      // [TODO JOSHUA: approve opt-in wording]. Bump `version` whenever the wording changes.
      version: "draft-2026-11-26",
      optIn: "Keep me updated by email about Best for Britain’s campaigns. You can unsubscribe at any time.",
      emailMissing: "Enter your email address, or untick the box",
      emailFormat: "Enter an email address in the right format, like name@example.com",
    },
  },

  mp: {
    vacant: "{constituency} doesn’t have an MP at the moment. You can still send a posted letter to the Minister.",
    speaker: "{name} is the Speaker of the House of Commons. The Speaker stays politically neutral, but still represents constituents in {constituency} and can raise their concerns with ministers.",
    noEmail: "{name} doesn’t publish an email address, so you can’t email them from here. You can send them a posted letter instead.",
    noPostalAddress: "We don’t have a postal address for {name}, so you can’t send them a posted letter from here. You can still write to the Minister.",
  },
} as const;

/** Fills `{token}` placeholders in a copy string. Leaves `{csd}` for RichText. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
