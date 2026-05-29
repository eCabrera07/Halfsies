# Halfsies Future Plans

Tracks what remains to be built. Completed work has been removed.

---

## Collaborative Sessions (Backend Required)

The current flow is host-assigns-everything, shared via plain text. True collaborative splitting needs a backend.

- Add a backend persistence layer for tickets, participants, item assignments, and session invite links.
- Use a short public session id in shared URLs with sensitive state stored server-side.
- Add optimistic assignment updates so item toggles feel immediate.
- Add conflict handling for two guests claiming the same item simultaneously.

Recommended stack:
- Database: Supabase Postgres or Firebase Firestore (quick hosted realtime)
- Auth: Google OAuth through Supabase Auth, Firebase Auth, or NextAuth
- Realtime: Supabase Realtime channels or Firestore listeners

### Google Sign-In

- Add Google OAuth as the first identity provider.
- Store participants by authenticated user id plus display name and email.
- Allow the host to add placeholder participants for people who do not join immediately.
- When a guest joins from a link, match them to an existing placeholder by email when possible.

### Self Assignment Flow

- Shared links open a session landing state.
- Signed-in guests see receipt items and can toggle themselves on or off each item.
- Hosts retain edit permission for receipt data, tax, tip, participants, and all assignments.
- Guests can only assign or unassign themselves unless future permissions expand.
- Summary updates live as guests claim items.
- Replace query-encoded sharing with durable session links.

---

## Computer Vision — Advanced Preprocessing

Basic preprocessing is done (resize + adaptive threshold). What remains:

- Detect receipt corners and perspective-correct (deskew) before OCR — critical for photos taken at an angle.
- Crop to the receipt boundary to reduce noise from table surfaces, hands, etc.
- Add image preview tools before OCR: rotate, crop, retake, and confirm.

---

## OCR — Hosted Provider

Tesseract.js (on-device WASM) is the current provider. For better accuracy:

- Add a cloud OCR provider implementation behind the existing `OcrService` interface (Google Vision, AWS Textract, or Azure Read).
- Evaluate accuracy vs. cost tradeoff — Tesseract struggles with abbreviations, non-standard fonts, and poor lighting even after preprocessing.
- Keep Tesseract as the offline fallback.

---

## Receipt Parsing — Remaining Edge Cases

The parser handles qty-prefix/suffix, SKU look-ahead, subtotal/tax/tip/total classification, and reconciliation warnings. Outstanding cases:

- **Modifier lines:** Items with indented modifier lines (e.g., `+ No onions -0.00`, `+ Add guac 2.50`) — currently parsed as separate items instead of being attached to their parent.
- **Discounts:** Negative-amount lines (e.g., `Loyalty discount -1.50`) should reduce subtotal, not become items.
- **Service charges / auto-gratuity:** Lines like `Auto-grat 18% 4.32` should map to tip, not a food item.
- **Delivery / packaging fees:** Should be a separate charge category, not a food item.
- **Qty-only-total receipts with ambiguous prefix:** `11 Waters 11.00` — qty=11, total=$11.00, inferred unit=$1.00. Parser already infers unit correctly via `totalPrice / qty`, but validate round-trip (`qty × unit ≈ total`) before committing to avoid false qty matches.

---

## Android

- **Phase 2 — Native Kotlin / Jetpack Compose** (separate repo, not started): Full native rewrite with ML Kit on-device OCR. Start when user is ready.
- **Phase 3 — Google Play Internal Testing** (after Phase 2): Publish to Internal Testing track (up to 100 testers by email, $25 one-time fee). Plan is in `docs/superpowers/plans/2026-05-27-android-capacitor.md` under Phase 3.

---

## Open Decisions

- Choose Supabase, Firebase, or a custom API backend for collaborative sessions.
- Choose the first cloud OCR provider and acceptable monthly cost.
- Decide whether shared sessions are public-with-secret-link or require every guest to sign in before viewing.
- Decide whether payment collection links (Venmo/Cash App deep links) are in scope.
