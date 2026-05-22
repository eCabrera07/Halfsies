# Halfsies Future Plans

This document tracks the next product pass after the first local-only web scaffold. The goal is to turn Halfsies into a collaborative receipt session where guests can open a shared link, sign in with Gmail, and assign their own items.

## Product Goals

- Hosts can create a receipt session from a captured receipt photo.
- Hosts can send a link to guests through native share, SMS, chat, or email.
- Guests can sign in with Google and assign themselves to receipt items.
- Item claims update for everyone in the session.
- Tax and tip remain distributed proportionally based on each participant's assigned food subtotal.
- The web app supports light and dark themes.
- Receipt capture works well on mobile web without forcing desktop webcam flows.
- Computer vision improves OCR reliability across common receipt formats.

## Phase 2 Architecture

### Collaborative Sessions

- Add a backend persistence layer for tickets, participants, item assignments, and session invite links.
- Use a short public session id in shared URLs, with sensitive state stored server-side instead of fully encoded in the query string.
- Keep `src/types` as the shared contract between frontend, backend, and future mobile clients.
- Add optimistic assignment updates in the client so item toggles feel immediate.
- Add conflict handling for two guests claiming the same item at the same time.

Recommended stack:

- Database: Supabase Postgres or Firebase Firestore for quick hosted realtime collaboration.
- Auth: Google OAuth through Supabase Auth, Firebase Auth, or NextAuth if the project moves to Next.js.
- Realtime: Supabase Realtime channels, Firestore listeners, or WebSockets.

### Google Sign-In

- Add Google OAuth as the first identity provider.
- Store participants by authenticated user id plus display name and email.
- Allow the host to add placeholder participants for people who do not join immediately.
- When a guest joins from a link, match them to an existing placeholder by email when possible.
- Keep payment status editable by the host and visible to guests.

### Self Assignment Flow

- Shared links should open a session landing state.
- Signed-in guests see receipt items and can toggle themselves on or off each item.
- Hosts retain edit permission for receipt data, tax, tip, participants, and all assignments.
- Guests can only assign or unassign themselves unless future permissions expand.
- Summary should update live as guests claim items.

### Dark Mode

- Add a theme store with `light`, `dark`, and `system` modes.
- Persist the selected theme in local storage.
- Use Tailwind dark variants and CSS custom properties for surfaces, text, borders, and semantic accents.
- Add a compact icon toggle in the app header.
- Test all workflow screens for contrast and readability in both themes.

### Receipt Image Capture

- Keep mobile capture based on `<input type="file" accept="image/*" capture="environment">`.
- Avoid using desktop webcam streams as the primary receipt capture flow.
- Add browser capability checks and copy that adapts between mobile capture and desktop upload.
- Add image preview tools before OCR: rotate, crop, retake, and confirm.
- Test on iOS Safari, Android Chrome, desktop Chrome, and desktop Edge.

### Computer Vision and OCR

- Add a preprocessing pipeline before text extraction:
  - Detect receipt corners.
  - Deskew and perspective-correct the receipt.
  - Improve contrast and remove shadows when possible.
  - Crop to the receipt boundary.
- Add OCR provider abstraction behind the existing `OcrService` interface.
- Start with a hosted OCR provider for accuracy, then evaluate local/on-device fallback later.
- Store raw OCR text and parsed line confidence for host review.
- Keep parsing deterministic and testable after OCR text is returned.

### Receipt Type Considerations

Support different receipt layouts through parser strategies:

- Restaurant itemized receipts with subtotal, tax, tip, and total.
- Counter-service receipts with modifiers, combos, and discounts.
- Receipts with quantity prefixes such as `2 Tacos 18.00`.
- Receipts with quantity suffixes such as `Tacos x2 18.00`.
- Receipts with separate modifier lines indented below a parent item.
- Receipts with service charges, automatic gratuity, delivery fees, and discounts.
- Receipts with multiple tax lines or local tax labels.
- Receipts where item totals are ambiguous or missing.

The host review screen remains mandatory because OCR and receipt parsing will never be perfect across every restaurant.

## Implementation Plan

1. Add a backend session model and persistence adapter.
2. Add Google OAuth and authenticated participant joining.
3. Replace query-only sharing with durable session links.
4. Add realtime item assignment updates.
5. Add role-based permissions for host and guest actions.
6. Add dark mode tokens, theme store, and theme toggle.
7. Add mobile receipt capture QA and desktop upload fallback.
8. Add receipt image preprocessing before OCR.
9. Add OCR provider implementations behind `OcrService`.
10. Add parser strategy tests for multiple receipt formats.

## Testing Plan

- Unit test proportional split math for shared items, unassigned items, service charges, discounts, and zero-subtotal edge cases.
- Unit test receipt parsing fixtures for every supported receipt type.
- Integration test session creation, guest joining, item claiming, and live summary updates.
- E2E test host and guest flows in separate browser contexts.
- Manual QA receipt capture on real mobile browsers.
- Accessibility test light and dark modes for keyboard flow and contrast.

## Open Decisions

- Choose Supabase, Firebase, or a custom API backend.
- Choose the first OCR provider and expected monthly cost.
- Decide whether shared sessions are public-with-secret-link or require every guest to sign in before viewing.
- Decide whether guests can edit their display names after joining.
- Decide whether payment collection links are in scope for the next pass.
