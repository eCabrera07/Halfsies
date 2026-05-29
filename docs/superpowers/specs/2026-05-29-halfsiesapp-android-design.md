# HalfsiesApp — Native Android Design Spec

**Date:** 2026-05-29
**Phase:** 2 of the Halfsies Android roadmap
**Repo:** New repo `HalfsiesApp` (separate from the Halfsies web repo)

---

## Goal

A full native Android rewrite of Halfsies using Kotlin and Jetpack Compose. Identical user flow to the web app (capture → OCR → review → assign → share) with native-quality camera, faster OCR, and a donation link on the summary screen.

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Language | Kotlin | Standard for modern Android |
| UI | Jetpack Compose | Declarative, no XML layouts |
| Camera | CameraX | Real viewfinder, tap-to-focus, flash — better than file picker |
| OCR | ML Kit Text Recognition v2 | On-device, offline, ~200 ms on a real receipt, no WASM |
| Architecture | MVVM, manual DI | One ViewModel per screen; dependencies passed by constructor, no framework needed at this scale |
| State | StateFlow + collectAsStateWithLifecycle | Compose-friendly reactive state |
| Build | Gradle (Kotlin DSL) | Standard Android build system |
| Min SDK | API 26 (Android 8.0) | Covers ~95% of active devices; CameraX and ML Kit require ≥21 |

---

## Architecture

### Data flow

```
CaptureScreen
  └─ CaptureViewModel (CameraX)
       │ Bitmap
       ▼
OcrScreen
  └─ OcrViewModel (OcrService → ML Kit)
       │ ParsedReceiptResult
       ▼
ReviewScreen
  └─ ReviewViewModel (ReceiptRepository)
       │ Ticket
       ▼
AssignScreen
  └─ AssignViewModel (ReceiptRepository)
       │ SplitResult
       ▼
SummaryScreen
  └─ SummaryViewModel (SplitCalculator)
```

### Shared objects

Constructed once in `HalfsiesApplication` (a custom `Application` subclass), stored as properties, and passed into each `ViewModel` via its constructor. No DI framework — just straightforward constructor injection.

- **`ReceiptRepository`** — holds the in-progress `Ticket` in memory for the session lifetime. Same role as the Zustand store in the web app. No database needed for the initial release.
- **`OcrService`** — ML Kit wrapper behind an interface (`fun recognize(bitmap: Bitmap): ParsedReceiptResult`). Interface allows mocking in tests.
- **`ReceiptParser`** — Kotlin port of `receiptParsers.ts`. Same parsing logic, same receipt field classification, same warning generation.
- **`SplitCalculator`** — Kotlin port of `splitCalculator.ts`. Proportional tax/tip distribution, same rounding rules.

### Navigation

Jetpack Navigation Component with a single `NavHost`. Screens navigate forward only; back-stack handles going back. No shared ViewModel across screens — data is passed as navigation arguments or read from `ReceiptRepository`.

---

## Screens

### 1. Capture

- CameraX `PreviewView` fills the screen with a live viewfinder.
- Large shutter button at the bottom center.
- Gallery icon (top-right) opens the photo picker as a fallback.
- Flash toggle (top-left) cycles off → auto → on.
- On capture: bitmap is stored in `ReceiptRepository` so `OcrViewModel` can retrieve it. Bitmaps cannot be serialized as navigation arguments (too large), so the repository is the handoff point.

### 2. Processing (OCR)

- Full-screen loading indicator while ML Kit runs.
- `OcrViewModel` calls `OcrService.recognize(bitmap)` which:
  1. Converts the bitmap to grayscale and applies adaptive threshold preprocessing (Kotlin port of `imagePreprocessor.ts`).
  2. Passes the processed bitmap to ML Kit Text Recognition v2.
  3. Runs `ReceiptParser.parse(rawText)` to produce `ParsedReceiptResult`.
- On success: navigate to Review, passing the result.
- On failure: show an error with a "Try again" button that returns to Capture.

### 3. Review / Edit

- Scrollable list of receipt items. Each row: name, qty (integer), unit price, total price.
- **Total is editable** — editing total back-calculates unit price (`total ÷ qty`), matching the web app behaviour.
- QTY is integer-only.
- Tax field is editable. An **"+ Add tax"** button below it appends to the existing tax value (for receipts with multiple tax lines).
- Tip field is editable.
- Subtotal and grand total update reactively.
- "Add item" button appends a blank row.
- Swipe-to-delete on each row.
- "Re-upload" button returns to Capture and resets state.
- "Assign →" button advances to Assign.

### 4. Assign

- Participant chips at the top. "Add person" opens a bottom sheet with a name input.
- Item list below. Tapping an item opens a bottom sheet showing all participants with checkboxes.
- Each participant chip shows their running subtotal in real time.
- "Summary →" button advances when at least one participant exists.

### 5. Summary

- Card per participant: name, food subtotal, tax/tip share, total owed, "Mark paid" toggle.
- Grand total footer.
- **"Share results" button** — fires Android share sheet with plain text breakdown (names + amounts, no URL).
- **"☕ Support Halfsies" link** — opens `buymeacoffee.com/<page>` in the system browser via `Intent.ACTION_VIEW`. Shown as a small secondary link below the share button. Play Store compliant.
- "← Back to Assign" button.

---

## Donation Button

### Setup (one-time, user action required)

1. Go to **buymeacoffee.com** → create a free account.
2. Set your page name (e.g. `buymeacoffee.com/halfsies`).
3. Provide the URL — it will be stored as a constant (`DONATE_URL`) in the app.

### Implementation

```kotlin
const val DONATE_URL = "https://buymeacoffee.com/halfsies" // replace with real URL

// In SummaryScreen composable:
val context = LocalContext.current
TextButton(onClick = {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(DONATE_URL))
    context.startActivity(intent)
}) {
    Text("☕ Support Halfsies")
}
```

No Google Play Billing, no in-app purchase, no compliance issues. Opening an external URL in the browser is unrestricted.

---

## Data Model (Kotlin)

Direct port from `src/types/index.ts`. Names kept identical for cross-reference.

```kotlin
data class TicketItem(
    val id: String,
    val name: String,
    val quantity: Int,
    val pricePerUnit: Double,
    val totalPrice: Double,
    val assignedUserIds: List<String>,
)

data class Participant(
    val id: String,
    val name: String,
    val color: String,
    val paymentStatus: PaymentStatus = PaymentStatus.PENDING,
)

enum class PaymentStatus { PENDING, PAID }

data class Ticket(
    val id: String,
    val items: List<TicketItem>,
    val participants: List<Participant>,
    val subtotal: Double,
    val tax: Double,
    val tip: Double,
    val grandTotal: Double,
)
```

---

## OCR Pipeline

1. **Capture** — CameraX returns a `Bitmap` at full resolution.
2. **Preprocess** — `ImagePreprocessor.kt` (port of `imagePreprocessor.ts`): resize to max 2048px on the long edge, convert to grayscale, apply adaptive threshold (blockSize=31, C=10).
3. **ML Kit** — `TextRecognizer` (Latin script) runs on the preprocessed bitmap and returns a block/line/element hierarchy. Lines are joined into raw text.
4. **Parse** — `ReceiptParser.kt` (port of `receiptParsers.ts`) extracts items, subtotal, tax, tip, grand total, and warnings.

---

## Testing Strategy

- **Unit tests:** `ReceiptParser`, `SplitCalculator`, `ImagePreprocessor` — same fixtures as the TypeScript tests.
- **ViewModel tests:** `OcrViewModel`, `ReviewViewModel`, `AssignViewModel`, `SummaryViewModel` — mock `OcrService` and `ReceiptRepository`.
- **No UI tests in the initial release** — the flow is simple enough that manual smoke testing on device covers it. Add Espresso/Compose UI tests when the app grows.

---

## Repo & Project Setup

**What gets created programmatically:**
- GitHub repo `HalfsiesApp` (public, under the user's account)
- Standard Android Gradle project structure
- `README.md` with setup instructions
- This design doc copied to `docs/`

**What requires Android Studio:**
- Initial "New Project → Empty Compose Activity" wizard creates the Gradle wrapper, `settings.gradle.kts`, `build.gradle.kts`, and boilerplate `MainActivity.kt`.
- The implementation plan will pick up from that point.

---

## What's Different From the Web App

| Web App | Native Android |
|---|---|
| `<input capture="environment">` | CameraX viewfinder |
| Tesseract.js WASM (slow, ~5s) | ML Kit on-device (~200ms) |
| Adaptive threshold via Canvas API | Adaptive threshold via Android Bitmap API |
| Zustand store | ReceiptRepository (in-memory) |
| Tailwind CSS | Material 3 + Compose |
| `navigator.share()` | Android share sheet (`Intent.ACTION_SEND`) |
| No donation button | ☕ Buy Me a Coffee link on Summary |
