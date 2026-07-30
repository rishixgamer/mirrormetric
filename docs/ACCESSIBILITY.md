# Accessibility verification

Target: WCAG 2.2 Level AA.

## Automated release evidence

- Axe browser audit: no A/AA/2.2-AA violations on every public
  product/policy route and available, withheld, and opted-out result states.
- End-to-end keyboard-operable scan, correction, history, deletion, and error
  recovery journeys at desktop and phone viewports.
- CSS audit: 4/4 detected foreground/background pairs pass AA normal text;
  primary paper and dark themes exceed 15:1, error text exceeds 9:1.
- React source audit led to explicit alert live regions, fieldset/legend
  grouping for required and score confirmations, a single labeled file picker,
and one complete accessible name for the score and its labeled range.

The source scanner also reports file-level false positives because it treats
every component and stylesheet as a standalone document. In the rendered DOM,
`PageShell` provides one main landmark, a first-focusable skip link, primary and
footer navigation, one route-specific H1, and a polite navigation announcement.
Mutually exclusive route branches and separate exported page components account
for the scanner’s multiple-H1 warnings.

## Implemented behavior

- native buttons, links, labels, inputs, fieldsets, and details controls;
- visible `:focus-visible` treatment and logical focus order;
- minimum touch targets, responsive 320 px layout, and no horizontal workflow;
- reduced-motion overrides;
- status and assertive error announcements;
- non-drag landmark selection and directional nudge controls;
- undo, reset, and error recovery;
- text labels alongside every status color; and
- print styles for local PDF reports.

## Manual checks still expected per release

Automated scans cannot prove conformance. Release review should include keyboard
only, VoiceOver on Safari/iOS, NVDA or JAWS on Windows, 200% and 400% zoom,
forced colors/high contrast, text spacing overrides, reduced motion, and
landmark-editor comprehension with screen magnification.
