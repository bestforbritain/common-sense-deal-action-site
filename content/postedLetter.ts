/**
 * Settings and copy for the "Send a posted letter" action.
 * All [TODO JOSHUA: approve] unless noted.
 */

/** Small line at the foot of every posted letter. [TODO JOSHUA: include or not, and wording] */
export const letterFooter = {
  enabled: false,
  text: "Sent via commonsensedeal.com, a Best for Britain campaign",
};

export const postedCopy = {
  needsPostcode: "Confirm your business postcode above to write your letter.",
  recipientHeading: "Who do you want to write to?",
  recipientMp: "Your MP, {name}",
  recipientMinister: "{name}, {role}",
  recipientMpUnavailable: "We can’t post a letter to your MP from here, but you can write to the Minister.",
  detailsHeading: "Your details",
  fields: {
    senderName: "Your full name",
    role: "Your role",
    roleHint: "For example, owner, director or manager.",
    businessName: "Business name",
    businessAddress: "Business address",
    businessAddressHint: "We print this on the letter so the recipient can reply. We’ve added your postcode.",
    email: "Your email address",
    emailHint: "We’ll email you a link to confirm your letter. We won’t print it on the letter.",
  },
  letterHeading: "Your letter",
  letterHint: "You can change any of the wording. Your letter must fit on one side of A4.",
  letterLength: "{count} characters",
  previewButton: "Preview my letter",
  previewing: "Making your preview…",
  previewHeading: "Your letter as it will be posted",
  previewIntro: "This is exactly what we’ll print and post. If you change anything, preview it again.",
  previewFrameTitle: "Preview of your letter",
  previewDownload: "Open the preview as a PDF",
  previewStale: "You’ve changed your letter since the preview. Preview it again before you send it.",
  tooLong: "Your letter is too long to fit on one side of A4. Shorten it, then preview it again.",
  consent: "I agree to Best for Britain printing and posting this letter in my name. [TODO JOSHUA: approve]",
  consentMissing: "Tick the box to agree to us posting the letter in your name",
  submit: "Send my letter",
  submitting: "Sending…",
  errors: {
    required: "Enter your {field}",
    emailFormat: "Enter an email address in the right format, like name@example.com",
    duplicate: "You’ve already sent a letter to this recipient from that email address.",
    previewChanged: "Your letter has changed since you previewed it. Preview it again before you send it.",
    unavailable: "We couldn’t send your letter just now. Try again in a minute.",
    botCheck: "We couldn’t check you’re not a bot. Reload the page and try again.",
  },
  // Page shown after submitting.
  checkEmailHeading: "Check your email",
  checkEmail: "We’ve sent a link to {email}. Click it within 48 hours to confirm your letter. We won’t post anything until you do.",
};

/** Confirmation page: /letters/confirm/{token} */
export const confirmCopy = {
  pendingTitle: "Confirm your letter",
  pending: "Confirm that you want Best for Britain to print and post your letter to {recipient}.",
  button: "Confirm my letter",
  confirming: "Confirming…",
  title: "Your letter is on its way to approval",
  body: "Thank you. A member of the Best for Britain team will check your letter before we print and post it. We’ll email you when it’s been posted.",
  bodyAutoSend: "Thank you. We’ll print and post your letter, and email you when it’s on its way.",
  capDelay: "We’re posting a lot of letters at the moment, so yours may take a few extra days.",
  expiredTitle: "This link has expired",
  expired: "Confirmation links last 48 hours. You can write your letter again from the home page.",
  invalidTitle: "We can’t find that letter",
  invalid: "The link may be incomplete. Check you’ve copied the whole link from the email.",
  alreadyTitle: "You’ve already confirmed this letter",
  already: "There’s nothing more to do. We’ll email you when it’s been posted.",
  homeLink: "Go to the home page",
};

/** Transactional emails. [TODO JOSHUA: approve] */
export const emailCopy = {
  from: "Common Sense Deal <letters@[TODO JOSHUA: sending domain]>",
  confirm: {
    subject: "Confirm your letter to {recipient}",
    body: [
      "Hello {name},",
      "Thank you for writing to {recipient}. Please confirm your letter by opening this link within 48 hours:",
      "{link}",
      "We won’t print or post anything until you do. If you didn’t ask for this, you can ignore this email.",
      "Best for Britain",
    ],
  },
  received: {
    subject: "We’ve received your letter to {recipient}",
    body: [
      "Hello {name},",
      "Thank you for confirming your letter to {recipient}. A member of the Best for Britain team will check it before we print and post it.",
      "We’ll email you again when it’s been posted.",
      "Best for Britain",
    ],
  },
  posted: {
    subject: "Your letter to {recipient} has been posted",
    body: ["Hello {name},", "Your letter to {recipient} has been printed and posted.", "Thank you for taking part.", "Best for Britain"],
  },
};
