# Accessibility audit

Target: WCAG 2.2 AA (brief, section 12). Audited 26 November 2026 on the local build.

## Automated checks

axe-core (WCAG 2.0, 2.1 and 2.2 A and AA rules, plus best practice), run with Playwright at 1280px:

| Page or state | Result |
| --- | --- |
| Home page | No issues |
| Home page with form errors | No issues |
| Action page before the postcode is confirmed | No issues |
| Action page with the email and posted-letter forms | No issues |
| Posted letter preview | No issues |
| Posted letter with the consent error | No issues |
| MP with no email (New Forest East) | No issues |
| The Speaker (Chorley) | No issues |
| Letter confirmation page | No issues |
| Admin: letters, stats, settings, audit log | No issues |

Other checks:

- No horizontal scrolling at 320px wide (home and action pages).
- No content blocked by the content security policy.

## Built in

- Every field has a visible label. Hints and errors are linked to their fields (`aria-describedby`), and invalid fields are marked `aria-invalid`.
- On a failed submit, focus moves to the first field with an error. Error text says what's wrong and how to fix it.
- Status messages (lookup errors, "Letter copied", "Check your email") are announced via `role="status"`.
- There's a skip link, and keyboard focus is visible everywhere (a 3px navy outline, white on the navy header).
- The site's one animation, the MP card arriving, is switched off when the person's device is set to reduce motion.
- Headings follow the page structure. The MP's name is the action page's `h1`.
- MP photos have meaningful alt text ("Photo of …").
- The PDF preview has a title and a link to open the PDF on its own.

## Still to do by hand before launch

Automated tools catch roughly a third of problems. Before launch:

1. Complete both journeys (email and posted letter) using **only the keyboard**, on desktop.
2. Complete both journeys with **VoiceOver on an iPhone**, and with **NVDA or VoiceOver on desktop**.
3. Zoom the browser to **200% and 400%** and check nothing is cut off.
4. Check the **embedded PDF preview** with a screen reader. If it isn't readable, the editable letter text above it is the accessible version, so consider saying so next to the preview.
