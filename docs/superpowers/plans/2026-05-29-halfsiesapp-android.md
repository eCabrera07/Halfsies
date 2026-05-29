# HalfsiesApp Native Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Kotlin/Jetpack Compose Android app mirroring the Halfsies web flow — camera capture → ML Kit OCR → review/edit → assign → share — with a Buy Me a Coffee donation link on the summary screen.

**Architecture:** MVVM, one ViewModel per screen, StateFlow for reactive state, manual constructor DI. `ReceiptRepository` holds the in-progress `Ticket` in memory. CameraX for capture, ML Kit Text Recognition v2 for OCR. No database — purely in-memory session state.

**Tech Stack:** Kotlin, Jetpack Compose, CameraX 1.3, ML Kit Text Recognition 16, Jetpack Navigation Compose 2.7, StateFlow/coroutines, JUnit 4.

---

## File Structure

```
app/src/main/java/com/halfsies/app/
  HalfsiesApplication.kt          — creates shared objects (repository, ocrService)
  model/
    Models.kt                     — TicketItem, Participant, Ticket, ParsedReceiptResult, SplitResult, ParticipantShare
  calculator/
    SplitCalculator.kt            — proportional split math (port of splitCalculator.ts)
  parser/
    ReceiptParser.kt              — line-by-line receipt text parsing (port of receiptParsers.ts)
  ocr/
    ImagePreprocessor.kt          — resize + adaptive threshold on Bitmap (port of imagePreprocessor.ts)
    OcrService.kt                 — interface: suspend fun recognize(bitmap: Bitmap): ParsedReceiptResult
    MlKitOcrService.kt            — ML Kit implementation of OcrService
  data/
    ReceiptRepository.kt          — in-memory session state (bitmap, ticket, participants)
  navigation/
    AppNavigation.kt              — NavHost + route constants
  ui/
    capture/
      CaptureScreen.kt            — CameraX viewfinder + shutter + gallery button
      CaptureViewModel.kt
    ocr/
      OcrScreen.kt                — loading spinner while ML Kit runs
      OcrViewModel.kt
    review/
      ReviewScreen.kt             — editable item list, tax adder, qty/unit/total inputs
      ReviewViewModel.kt
    assign/
      AssignScreen.kt             — participant chips + item assignment bottom sheet
      AssignViewModel.kt
    summary/
      SummaryScreen.kt            — per-person cards, share button, donate link
      SummaryViewModel.kt
    theme/
      Theme.kt                    — Material 3 colour scheme + typography

app/src/test/java/com/halfsies/app/
  calculator/SplitCalculatorTest.kt
  parser/ReceiptParserTest.kt
  ocr/ImagePreprocessorTest.kt
  ocr/OcrViewModelTest.kt
  review/ReviewViewModelTest.kt

app/src/main/AndroidManifest.xml  — CAMERA, READ_MEDIA_IMAGES, READ_EXTERNAL_STORAGE
app/build.gradle.kts              — all dependency declarations
```

---

### Task 1: Create the GitHub repo

**Files:**
- Create: new repo `HalfsiesApp` on GitHub
- Create: `README.md` in new repo
- Create: copy this plan into `docs/plans/` in the new repo

- [ ] **Step 1: Create the public GitHub repo**

```bash
gh repo create HalfsiesApp --public --description "Native Kotlin/Jetpack Compose Android receipt splitter"
```

Expected: repo URL printed, e.g. `https://github.com/<you>/HalfsiesApp`

- [ ] **Step 2: Clone it locally**

```bash
gh repo clone HalfsiesApp C:\Dev\HalfsiesApp
cd C:\Dev\HalfsiesApp
```

- [ ] **Step 3: Copy the design spec and this plan into the new repo**

```bash
mkdir -p docs/plans docs/specs
cp "C:\Dev\Halfsies\docs\superpowers\specs\2026-05-29-halfsiesapp-android-design.md" docs/specs/
cp "C:\Dev\Halfsies\docs\superpowers\plans\2026-05-29-halfsiesapp-android.md" docs/plans/
git add docs/
git commit -m "docs: add design spec and implementation plan"
git push
```

---

### Task 2: Create the Android Studio project (manual steps)

**Files:**
- Generate: entire Android Gradle project under `C:\Dev\HalfsiesApp\`

This task requires Android Studio. It creates the Gradle wrapper, settings files, and boilerplate MainActivity that the remaining tasks build on.

- [ ] **Step 1: Open Android Studio → New Project → Empty Activity**

Settings:
- **Name:** HalfsiesApp
- **Package name:** com.halfsies.app
- **Save location:** `C:\Dev\HalfsiesApp`
- **Language:** Kotlin
- **Minimum SDK:** API 26 (Android 8.0)
- **Build configuration language:** Kotlin DSL

Click **Finish**. Wait for Gradle sync to complete.

- [ ] **Step 2: Verify the project builds**

In Android Studio: **Build → Make Project**. Expected: `BUILD SUCCESSFUL` in the Build panel with no errors.

- [ ] **Step 3: Commit the generated project**

```bash
cd C:\Dev\HalfsiesApp
git add .
git commit -m "chore: scaffold Android Studio Compose project"
git push
```

---

### Task 3: Configure Gradle dependencies

**Files:**
- Modify: `app/build.gradle.kts`
- Modify: `gradle/libs.versions.toml` (if using version catalogs — delete this file and use direct strings instead for simplicity)

- [ ] **Step 1: Replace `app/build.gradle.kts` dependencies block**

Open `app/build.gradle.kts`. Replace the entire `dependencies { }` block with:

```kotlin
val composeBom = platform("androidx.compose:compose-bom:2024.06.00")

dependencies {
    // Compose
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.0")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // CameraX
    implementation("androidx.camera:camera-core:1.3.3")
    implementation("androidx.camera:camera-camera2:1.3.3")
    implementation("androidx.camera:camera-lifecycle:1.3.3")
    implementation("androidx.camera:camera-view:1.3.3")

    // ML Kit OCR
    implementation("com.google.mlkit:text-recognition:16.0.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // ListenableFuture → suspend (needed for CameraX)
    implementation("androidx.concurrent:concurrent-futures-ktx:1.2.0")

    // ListenableFuture await() for ML Kit tasks
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")

    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    // Robolectric — lets ViewModel tests use Android types (Bitmap, etc.) on the JVM
    testImplementation("org.robolectric:robolectric:4.11.1")
    testImplementation("androidx.test:core-ktx:1.5.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
```

- [ ] **Step 2: Sync and verify**

In Android Studio: **File → Sync Project with Gradle Files**. Expected: Gradle sync completes with no errors. If a dependency version is not found, check [maven.google.com](https://maven.google.com) for the latest patch version.

- [ ] **Step 3: Commit**

```bash
git add app/build.gradle.kts
git commit -m "chore: add Compose, CameraX, ML Kit, and coroutines dependencies"
git push
```

---

### Task 4: Core data model

**Files:**
- Create: `app/src/main/java/com/halfsies/app/model/Models.kt`

No tests needed — these are plain data classes with no logic.

- [ ] **Step 1: Create `Models.kt`**

```kotlin
package com.halfsies.app.model

import java.util.UUID

// ── Ticket ────────────────────────────────────────────────────────────────────

data class TicketItem(
    val id: String,
    val name: String,
    val quantity: Int,
    val pricePerUnit: Double,
    val totalPrice: Double,
    val assignedParticipantIds: List<String> = emptyList(),
)

data class Participant(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val color: String,
    val paymentStatus: PaymentStatus = PaymentStatus.PENDING,
)

enum class PaymentStatus { PENDING, PAID }

data class Ticket(
    val id: String = UUID.randomUUID().toString(),
    val items: List<TicketItem> = emptyList(),
    val participants: List<Participant> = emptyList(),
    val subtotal: Double = 0.0,
    val tax: Double = 0.0,
    val tip: Double = 0.0,
    val grandTotal: Double = 0.0,
)

// ── OCR result ────────────────────────────────────────────────────────────────

data class ParsedReceiptResult(
    val items: List<TicketItem>,
    val subtotal: Double?,
    val tax: Double?,
    val tip: Double?,
    val grandTotal: Double?,
    val rawText: String,
    val warnings: List<String>,
)

// ── Split result ──────────────────────────────────────────────────────────────

data class ParticipantShare(
    val participantId: String,
    val participantName: String,
    val color: String,
    val itemShares: List<TicketItem>,
    val subtotal: Double,
    val taxAndTipShare: Double,
    val total: Double,
    val paymentStatus: PaymentStatus,
)

data class SplitResult(
    val ticketId: String,
    val participants: List<ParticipantShare>,
    val grandTotal: Double,
    val unassignedSubtotal: Double,
    val unallocatedTaxAndTip: Double,
)
```

- [ ] **Step 2: Build to verify it compiles**

```bash
./gradlew :app:compileDebugKotlin
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Commit**

```bash
git add app/src/main/java/com/halfsies/app/model/Models.kt
git commit -m "feat: add core data model (Ticket, Participant, SplitResult)"
git push
```

---

### Task 5: SplitCalculator

**Files:**
- Create: `app/src/main/java/com/halfsies/app/calculator/SplitCalculator.kt`
- Create: `app/src/test/java/com/halfsies/app/calculator/SplitCalculatorTest.kt`

- [ ] **Step 1: Write the failing tests**

```kotlin
// SplitCalculatorTest.kt
package com.halfsies.app.calculator

import com.halfsies.app.model.*
import org.junit.Assert.assertEquals
import org.junit.Test

class SplitCalculatorTest {

    private fun ticket(vararg items: TicketItem, tax: Double = 0.0, tip: Double = 0.0): Ticket {
        val subtotal = items.sumOf { it.totalPrice }.let { SplitCalculator.roundCurrency(it) }
        return Ticket(
            id = "t1",
            items = items.toList(),
            participants = emptyList(),
            subtotal = subtotal,
            tax = tax,
            tip = tip,
            grandTotal = SplitCalculator.roundCurrency(subtotal + tax + tip),
        )
    }

    private fun item(id: String, price: Double, vararg pIds: String) = TicketItem(
        id = id, name = id, quantity = 1, pricePerUnit = price, totalPrice = price,
        assignedParticipantIds = pIds.toList(),
    )

    private fun participant(id: String) = Participant(id = id, name = id, color = "#000")

    @Test fun `roundCurrency rounds to two decimal places`() {
        assertEquals(1.24, SplitCalculator.roundCurrency(1.244), 0.0)
        assertEquals(1.25, SplitCalculator.roundCurrency(1.245), 0.0)
    }

    @Test fun `split with two participants each assigned one item`() {
        val alice = participant("alice")
        val bob = participant("bob")
        val t = ticket(item("burger", 10.0, "alice"), item("salad", 8.0, "bob"), tax = 1.80)
            .copy(participants = listOf(alice, bob))

        val result = SplitCalculator.calculateSplit(t)
        val aliceShare = result.participants.first { it.participantId == "alice" }
        val bobShare = result.participants.first { it.participantId == "bob" }

        assertEquals(10.0, aliceShare.subtotal, 0.0)
        assertEquals(8.0, bobShare.subtotal, 0.0)
        // Alice's tax share = 10/18 * 1.80 ≈ 1.00; Bob's ≈ 0.80
        assertEquals(1.0, aliceShare.taxAndTipShare, 0.01)
        assertEquals(0.8, bobShare.taxAndTipShare, 0.01)
    }

    @Test fun `shared item splits evenly between assignees`() {
        val alice = participant("alice")
        val bob = participant("bob")
        val t = ticket(item("fries", 4.0, "alice", "bob"))
            .copy(participants = listOf(alice, bob))

        val result = SplitCalculator.calculateSplit(t)
        val aliceShare = result.participants.first { it.participantId == "alice" }
        assertEquals(2.0, aliceShare.subtotal, 0.0)
    }

    @Test fun `unassigned items appear in unassignedSubtotal`() {
        val alice = participant("alice")
        val t = ticket(item("soup", 5.0), item("steak", 20.0, "alice"))
            .copy(participants = listOf(alice))

        val result = SplitCalculator.calculateSplit(t)
        assertEquals(5.0, result.unassignedSubtotal, 0.0)
    }
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
./gradlew :app:test --tests "com.halfsies.app.calculator.SplitCalculatorTest"
```

Expected: FAILED — `SplitCalculator` does not exist yet.

- [ ] **Step 3: Implement `SplitCalculator.kt`**

```kotlin
package com.halfsies.app.calculator

import com.halfsies.app.model.*
import kotlin.math.roundToInt

object SplitCalculator {

    fun roundCurrency(amount: Double): Double = (amount * 100).roundToInt() / 100.0

    fun formatMoney(amount: Double): String = "$%.2f".format(amount)

    fun normalizeTicket(ticket: Ticket): Ticket {
        val subtotal = roundCurrency(ticket.items.sumOf { it.totalPrice })
        return ticket.copy(
            subtotal = subtotal,
            tax = roundCurrency(ticket.tax),
            tip = roundCurrency(ticket.tip),
            grandTotal = roundCurrency(subtotal + ticket.tax + ticket.tip),
        )
    }

    fun calculateSplit(ticket: Ticket): SplitResult {
        val subtotal = ticket.subtotal
        val taxAndTip = roundCurrency(ticket.tax + ticket.tip)

        val participantShares = ticket.participants.map { participant ->
            val myItems = ticket.items.filter { participant.id in it.assignedParticipantIds }
            val mySubtotal = roundCurrency(myItems.sumOf { item ->
                item.totalPrice / item.assignedParticipantIds.size.coerceAtLeast(1)
            })
            val myTaxAndTip = if (subtotal > 0.0) {
                roundCurrency((mySubtotal / subtotal) * taxAndTip)
            } else 0.0
            ParticipantShare(
                participantId = participant.id,
                participantName = participant.name,
                color = participant.color,
                itemShares = myItems,
                subtotal = mySubtotal,
                taxAndTipShare = myTaxAndTip,
                total = roundCurrency(mySubtotal + myTaxAndTip),
                paymentStatus = participant.paymentStatus,
            )
        }

        val assignedSubtotal = roundCurrency(participantShares.sumOf { it.subtotal })
        val allocatedTaxAndTip = roundCurrency(participantShares.sumOf { it.taxAndTipShare })

        return SplitResult(
            ticketId = ticket.id,
            participants = participantShares,
            grandTotal = roundCurrency(subtotal + taxAndTip),
            unassignedSubtotal = roundCurrency(subtotal - assignedSubtotal),
            unallocatedTaxAndTip = roundCurrency(taxAndTip - allocatedTaxAndTip),
        )
    }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
./gradlew :app:test --tests "com.halfsies.app.calculator.SplitCalculatorTest"
```

Expected: `BUILD SUCCESSFUL`, 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/halfsies/app/calculator/ \
        app/src/test/java/com/halfsies/app/calculator/
git commit -m "feat: add SplitCalculator with proportional tax/tip distribution"
git push
```

---

### Task 6: ReceiptParser

**Files:**
- Create: `app/src/main/java/com/halfsies/app/parser/ReceiptParser.kt`
- Create: `app/src/test/java/com/halfsies/app/parser/ReceiptParserTest.kt`

- [ ] **Step 1: Write the failing tests**

```kotlin
package com.halfsies.app.parser

import org.junit.Assert.*
import org.junit.Test

class ReceiptParserTest {

    private val parser = ReceiptParser()

    @Test fun `parses simple item line`() {
        val result = parser.parse("Burger 12.50\nTax 1.00\nTotal 13.50")
        assertEquals(1, result.items.size)
        assertEquals("Burger", result.items[0].name)
        assertEquals(12.50, result.items[0].totalPrice, 0.0)
        assertEquals(1.0, result.tax, 0.0)
        assertEquals(13.50, result.grandTotal, 0.0)
    }

    @Test fun `parses quantity prefix — infers unit price`() {
        val result = parser.parse("11 Waters 11.00\nTotal 11.00")
        assertEquals(1, result.items.size)
        assertEquals(11, result.items[0].quantity)
        assertEquals("Waters", result.items[0].name)
        assertEquals(1.0, result.items[0].pricePerUnit, 0.001)
        assertEquals(11.0, result.items[0].totalPrice, 0.0)
    }

    @Test fun `parses quantity suffix`() {
        val result = parser.parse("Tacos x3 15.00")
        assertEquals(3, result.items[0].quantity)
        assertEquals("Tacos", result.items[0].name)
        assertEquals(5.0, result.items[0].pricePerUnit, 0.001)
    }

    @Test fun `classifies subtotal, tax, tip, grand total`() {
        val text = "Food 20.00\nSubtotal 20.00\nTax 1.60\nTip 3.00\nTotal 24.60"
        val result = parser.parse(text)
        assertEquals(20.0, result.subtotal, 0.0)
        assertEquals(1.60, result.tax, 0.0)
        assertEquals(3.0, result.tip, 0.0)
        assertEquals(24.60, result.grandTotal, 0.0)
    }

    @Test fun `ignores payment lines`() {
        val text = "Burger 10.00\nVisa 10.00\nTotal 10.00"
        val result = parser.parse(text)
        assertEquals(1, result.items.size)
        assertEquals("Burger", result.items[0].name)
    }

    @Test fun `warns when item totals differ from subtotal`() {
        val text = "Burger 10.00\nFries 5.00\nSubtotal 20.00\nTotal 20.00"
        val result = parser.parse(text)
        assertTrue(result.warnings.any { it.contains("differ") })
    }

    @Test fun `accumulates multiple tax lines`() {
        val text = "Food 10.00\nState Tax 0.60\nLocal Tax 0.30\nTotal 10.90"
        val result = parser.parse(text)
        assertEquals(0.90, result.tax!!, 0.01)
    }
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
./gradlew :app:test --tests "com.halfsies.app.parser.ReceiptParserTest"
```

Expected: FAILED — `ReceiptParser` does not exist yet.

- [ ] **Step 3: Implement `ReceiptParser.kt`**

```kotlin
package com.halfsies.app.parser

import com.halfsies.app.calculator.SplitCalculator.formatMoney
import com.halfsies.app.calculator.SplitCalculator.roundCurrency
import com.halfsies.app.model.ParsedReceiptResult
import com.halfsies.app.model.TicketItem
import kotlin.math.abs

class ReceiptParser {

    private val amountRegex = Regex("""\$?\s*(-?\d+(?:,\d{3})*[.:]\d{1,2})(?!\d)""")

    private val ignoredLabels = setOf(
        "amount due", "balance", "card", "cash", "cashless", "change",
        "certificate", "comp value", "credit", "debit", "invoice",
        "mastercard", "paid", "payment", "reference", "visa",
    )

    data class AmountMatch(val value: Double, val startIndex: Int, val endIndex: Int, val raw: String)

    fun parse(rawText: String): ParsedReceiptResult {
        val lines = rawText.split(Regex("\r?\n"))
            .map { it.replace(Regex("\\s+"), " ").trim() }
            .filter { it.isNotEmpty() }

        val items = mutableListOf<TicketItem>()
        val warnings = mutableListOf<String>()
        var subtotal: Double? = null
        var tax: Double? = null
        var tip: Double? = null
        var grandTotal: Double? = null

        var i = 0
        while (i < lines.size) {
            val line = lines[i]
            val amount = extractAmount(line)
            if (amount == null) { i++; continue }

            val label = line.substring(0, amount.startIndex).trim()
            when (classifyField(label)) {
                "subtotal"   -> subtotal = amount.value
                "tax"        -> tax = roundCurrency((tax ?: 0.0) + amount.value)
                "tip"        -> tip = amount.value
                "grandTotal" -> grandTotal = amount.value
                null -> {
                    if (!shouldIgnore(label)) {
                        val nextLine = lines.getOrNull(i + 1)
                        val itemLabel = if (isSkuLabel(label) && nextLine != null && extractAmount(nextLine) == null)
                            nextLine else label
                        parseItemLine(itemLabel, amount.value, items.size)?.let { items.add(it) }
                    }
                }
            }
            i++
        }

        // Warnings
        if (subtotal != null && items.isNotEmpty()) {
            val parsedSubtotal = roundCurrency(items.sumOf { it.totalPrice })
            val diff = roundCurrency(subtotal - parsedSubtotal)
            if (abs(diff) >= 0.01)
                warnings.add("Parsed item totals differ from the receipt subtotal by ${formatMoney(abs(diff))}.")
        }
        if (subtotal != null && grandTotal != null) {
            val expected = roundCurrency(subtotal + (tax ?: 0.0) + (tip ?: 0.0))
            val diff = roundCurrency(grandTotal - expected)
            if (abs(diff) >= 0.01)
                warnings.add("Parsed total differs from subtotal + tax + tip by ${formatMoney(abs(diff))}.")
        }

        return ParsedReceiptResult(
            items = items, subtotal = subtotal, tax = tax,
            tip = tip, grandTotal = grandTotal, rawText = rawText, warnings = warnings,
        )
    }

    private fun extractAmount(line: String): AmountMatch? {
        val matches = amountRegex.findAll(line).toList()
        val match = matches.lastOrNull { hasOnlyTrailingReceiptCode(line, it) } ?: return null
        val raw = match.groupValues[1]
        val value = raw.replace(",", "").replace(":", ".").toDoubleOrNull() ?: return null
        return AmountMatch(roundCurrency(value), match.range.first, match.range.last + 1, raw)
    }

    private fun hasOnlyTrailingReceiptCode(line: String, match: MatchResult): Boolean {
        val trailing = getTrailingTokens(line, match.range.last + 1) ?: return true
        return trailing.all { it.length <= 3 || Regex("^[a-z]\\d[a-z]?$", RegexOption.IGNORE_CASE).matches(it) }
    }

    private fun getTrailingTokens(line: String, endIndex: Int): List<String>? {
        val trailing = line.substring(endIndex)
            .replace(Regex("[^\\p{L}\\p{N}\\s]"), " ").trim()
        return if (trailing.isEmpty()) null else trailing.split(Regex("\\s+"))
    }

    private fun classifyField(label: String): String? {
        val n = normalizeLabel(label)
        return when {
            "subtotal" in n || n == "sub total" -> "subtotal"
            "tax" in n || n == "gov" || n == "mun" || n.startsWith("gov ") || n.startsWith("mun ") -> "tax"
            "tip" in n || "gratuity" in n -> "tip"
            n == "total" || n.endsWith(" total") || "grand total" in n || "amount due" in n -> "grandTotal"
            else -> null
        }
    }

    private fun shouldIgnore(label: String): Boolean {
        val n = normalizeLabel(label)
        return ignoredLabels.any { it in n }
    }

    private fun parseItemLine(label: String, totalPrice: Double, index: Int): TicketItem? {
        if (totalPrice <= 0) return null
        val clean = label.replace(Regex("\\s+"), " ").trim()
        val prefixMatch = Regex("^(\\d+(?:\\.\\d+)?)\\s*[xX]?\\s+(.+)$").find(clean)
        val suffixMatch = Regex("^(.+?)\\s+[xX]\\s*(\\d+(?:\\.\\d+)?)\$").find(clean)
        val quantity = prefixMatch?.groupValues?.get(1)?.toDoubleOrNull()?.toInt()
            ?: suffixMatch?.groupValues?.get(2)?.toDoubleOrNull()?.toInt()
            ?: 1
        val name = cleanItemName(
            prefixMatch?.groupValues?.get(2) ?: suffixMatch?.groupValues?.get(1) ?: clean
        ).ifEmpty { return null }
        return TicketItem(
            id = "item-${index + 1}-${name.lowercase().replace(Regex("[^a-z0-9]+"), "-")}",
            name = name,
            quantity = quantity,
            pricePerUnit = roundCurrency(totalPrice / quantity),
            totalPrice = roundCurrency(totalPrice),
        )
    }

    private fun isSkuLabel(label: String): Boolean {
        val n = label.replace(Regex("[^a-z0-9]+", RegexOption.IGNORE_CASE), " ").trim()
        if (n.isEmpty()) return false
        val tokens = n.split(Regex("\\s+"))
        return tokens.size <= 3 && tokens.any { it.matches(Regex("\\d{5,}")) }
    }

    private fun cleanItemName(label: String): String = label
        .replace(Regex("[#*]+"), "")
        .replace(Regex("^[Il|]\\s+(?=[A-Z])"), "")
        .replace(Regex("^\\s*(?:CE|AE|E)\\s*[-:\\[\\]\\\\/|]*\\s*", RegexOption.IGNORE_CASE), "")
        .replace(Regex("^\\s*\\d{5,}\\s+"), "")
        .replace(Regex("\\s+T[A-Z0-9]{0,3}\$", RegexOption.IGNORE_CASE), "")
        .trim()
        .replace(Regex("^[\\s\\p{P}\\p{S}]+|[\\s\\p{P}\\p{S}]+\$"), "")
        .trim()

    private fun normalizeLabel(label: String) =
        label.lowercase().replace(Regex("[^a-z0-9]+"), " ").trim()
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
./gradlew :app:test --tests "com.halfsies.app.parser.ReceiptParserTest"
```

Expected: `BUILD SUCCESSFUL`, 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/halfsies/app/parser/ \
        app/src/test/java/com/halfsies/app/parser/
git commit -m "feat: add ReceiptParser (Kotlin port of receiptParsers.ts)"
git push
```

---

### Task 7: ImagePreprocessor

**Files:**
- Create: `app/src/main/java/com/halfsies/app/ocr/ImagePreprocessor.kt`
- Create: `app/src/test/java/com/halfsies/app/ocr/ImagePreprocessorTest.kt`

The Bitmap-dependent public API cannot run on the JVM test runner. Extract the pixel math into a testable pure function `adaptiveThresholdPixels(IntArray, Int, Int): IntArray` and test that. The Bitmap wrapper is verified manually during smoke testing.

- [ ] **Step 1: Write the failing tests**

```kotlin
package com.halfsies.app.ocr

import org.junit.Assert.*
import org.junit.Test

class ImagePreprocessorTest {

    // 5-pixel wide, 1-pixel tall strip: [200,200,200,200, 10 ,200,200,200,200]
    // The dark centre pixel (10) should threshold to black; neighbours to white.
    private fun makePixels(vararg lumas: Int): IntArray =
        lumas.map { l -> (0xFF shl 24) or (l shl 16) or (l shl 8) or l }.toIntArray()

    @Test fun `pixel darker than neighbourhood thresholds to black`() {
        val pixels = makePixels(200, 200, 200, 200, 10, 200, 200, 200, 200)
        val result = ImagePreprocessor.adaptiveThresholdPixels(pixels, 9, 1, blockSize = 9, c = 10)
        val centre = result[4] and 0xFF  // blue channel = luminance
        assertEquals(0, centre)
    }

    @Test fun `pixel lighter than neighbourhood thresholds to white`() {
        val pixels = makePixels(10, 10, 10, 10, 200, 10, 10, 10, 10)
        val result = ImagePreprocessor.adaptiveThresholdPixels(pixels, 9, 1, blockSize = 9, c = 10)
        val centre = result[4] and 0xFF
        assertEquals(255, centre)
    }

    @Test fun `alpha channel is preserved`() {
        val pixels = makePixels(200, 200, 200, 200, 10, 200, 200, 200, 200)
        val result = ImagePreprocessor.adaptiveThresholdPixels(pixels, 9, 1)
        result.forEach { pixel -> assertEquals(0xFF, (pixel ushr 24) and 0xFF) }
    }

    @Test fun `uniformly lit image thresholds entirely to white`() {
        val pixels = makePixels(128, 128, 128, 128, 128)
        val result = ImagePreprocessor.adaptiveThresholdPixels(pixels, 5, 1)
        result.forEach { pixel -> assertEquals(255, pixel and 0xFF) }
    }
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
./gradlew :app:test --tests "com.halfsies.app.ocr.ImagePreprocessorTest"
```

Expected: FAILED — `ImagePreprocessor` does not exist.

- [ ] **Step 3: Implement `ImagePreprocessor.kt`**

```kotlin
package com.halfsies.app.ocr

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint

object ImagePreprocessor {

    private const val MAX_DIMENSION = 2048
    private const val DEFAULT_BLOCK_SIZE = 31
    private const val DEFAULT_C = 10

    fun prepareForOcr(original: Bitmap): Bitmap {
        val scaled = scaleBitmap(original)
        val grayscale = toGrayscale(scaled)
        val width = grayscale.width
        val height = grayscale.height
        val pixels = IntArray(width * height)
        grayscale.getPixels(pixels, 0, width, 0, 0, width, height)
        val thresholded = adaptiveThresholdPixels(pixels, width, height)
        val result = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        result.setPixels(thresholded, 0, width, 0, 0, width, height)
        return result
    }

    private fun scaleBitmap(bitmap: Bitmap): Bitmap {
        val maxSide = maxOf(bitmap.width, bitmap.height)
        if (maxSide <= MAX_DIMENSION) return bitmap
        val scale = MAX_DIMENSION.toFloat() / maxSide
        return Bitmap.createScaledBitmap(
            bitmap, (bitmap.width * scale).toInt(), (bitmap.height * scale).toInt(), true
        )
    }

    private fun toGrayscale(bitmap: Bitmap): Bitmap {
        val result = Bitmap.createBitmap(bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
        val paint = Paint().apply {
            colorFilter = ColorMatrixColorFilter(ColorMatrix().apply { setSaturation(0f) })
        }
        Canvas(result).drawBitmap(bitmap, 0f, 0f, paint)
        return result
    }

    /**
     * Pure pixel math — exposed internal for unit testing without Android Bitmap.
     * Input: ARGB_8888 packed ints (width × height). Output: thresholded ARGB_8888 ints.
     */
    fun adaptiveThresholdPixels(
        pixels: IntArray,
        width: Int,
        height: Int,
        blockSize: Int = DEFAULT_BLOCK_SIZE,
        c: Int = DEFAULT_C,
    ): IntArray {
        val lum = FloatArray(pixels.size) { i ->
            val r = (pixels[i] shr 16) and 0xFF
            val g = (pixels[i] shr 8) and 0xFF
            val b = pixels[i] and 0xFF
            0.299f * r + 0.587f * g + 0.114f * b
        }

        // Integral image (summed area table)
        val integral = DoubleArray(pixels.size)
        for (y in 0 until height) {
            for (x in 0 until width) {
                val idx = y * width + x
                integral[idx] = lum[idx] +
                    (if (x > 0) integral[idx - 1] else 0.0) +
                    (if (y > 0) integral[idx - width] else 0.0) -
                    (if (x > 0 && y > 0) integral[idx - width - 1] else 0.0)
            }
        }

        val half = blockSize / 2
        return IntArray(pixels.size) { idx ->
            val x = idx % width
            val y = idx / width
            val x1 = (x - half).coerceAtLeast(0)
            val y1 = (y - half).coerceAtLeast(0)
            val x2 = (x + half).coerceAtMost(width - 1)
            val y2 = (y + half).coerceAtMost(height - 1)
            val count = (x2 - x1 + 1) * (y2 - y1 + 1)
            val sum = integral[y2 * width + x2] -
                (if (x1 > 0) integral[y2 * width + x1 - 1] else 0.0) -
                (if (y1 > 0) integral[(y1 - 1) * width + x2] else 0.0) +
                (if (x1 > 0 && y1 > 0) integral[(y1 - 1) * width + x1 - 1] else 0.0)
            val value = if (lum[idx] < (sum / count) - c) 0 else 255
            (0xFF shl 24) or (value shl 16) or (value shl 8) or value
        }
    }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
./gradlew :app:test --tests "com.halfsies.app.ocr.ImagePreprocessorTest"
```

Expected: `BUILD SUCCESSFUL`, 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/halfsies/app/ocr/ImagePreprocessor.kt \
        app/src/test/java/com/halfsies/app/ocr/ImagePreprocessorTest.kt
git commit -m "feat: add ImagePreprocessor with adaptive threshold (testable pixel math)"
git push
```

---

### Task 8: OcrService + MlKitOcrService + ReceiptRepository

**Files:**
- Create: `app/src/main/java/com/halfsies/app/ocr/OcrService.kt`
- Create: `app/src/main/java/com/halfsies/app/ocr/MlKitOcrService.kt`
- Create: `app/src/main/java/com/halfsies/app/data/ReceiptRepository.kt`

No unit tests for `MlKitOcrService` (requires device/emulator). `OcrViewModel` test in Task 11 uses a fake `OcrService`.

- [ ] **Step 1: Create `OcrService.kt` (interface)**

```kotlin
package com.halfsies.app.ocr

import android.graphics.Bitmap
import com.halfsies.app.model.ParsedReceiptResult

interface OcrService {
    suspend fun recognize(bitmap: Bitmap): ParsedReceiptResult
}
```

- [ ] **Step 2: Create `MlKitOcrService.kt`**

```kotlin
package com.halfsies.app.ocr

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.halfsies.app.model.ParsedReceiptResult
import com.halfsies.app.parser.ReceiptParser
import kotlinx.coroutines.tasks.await

class MlKitOcrService(private val parser: ReceiptParser) : OcrService {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    override suspend fun recognize(bitmap: Bitmap): ParsedReceiptResult {
        val processed = ImagePreprocessor.prepareForOcr(bitmap)
        val inputImage = InputImage.fromBitmap(processed, 0)
        val visionResult = recognizer.process(inputImage).await()
        val rawText = visionResult.textBlocks
            .flatMap { block -> block.lines }
            .joinToString("\n") { it.text }
        return parser.parse(rawText)
    }
}
```

Note: `kotlinx.coroutines.tasks.await` comes from the `kotlinx-coroutines-play-services` artifact. Add it to `app/build.gradle.kts`:

```kotlin
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")
```

- [ ] **Step 3: Create `ReceiptRepository.kt`**

```kotlin
package com.halfsies.app.data

import android.graphics.Bitmap
import com.halfsies.app.model.Participant
import com.halfsies.app.model.Ticket
import com.halfsies.app.model.TicketItem
import com.halfsies.app.calculator.SplitCalculator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ReceiptRepository {

    // Capture → OCR handoff (too large for nav arguments)
    var pendingBitmap: Bitmap? = null

    private val _ticket = MutableStateFlow(Ticket())
    val ticket: StateFlow<Ticket> = _ticket

    fun setTicket(ticket: Ticket) {
        _ticket.value = SplitCalculator.normalizeTicket(ticket)
    }

    fun updateItem(itemId: String, patch: TicketItem.() -> TicketItem) {
        val updated = _ticket.value.items.map { if (it.id == itemId) it.patch() else it }
        setTicket(_ticket.value.copy(items = updated))
    }

    fun addItem() {
        val newItem = TicketItem(
            id = "item-new-${System.currentTimeMillis()}",
            name = "New item",
            quantity = 1,
            pricePerUnit = 0.0,
            totalPrice = 0.0,
        )
        setTicket(_ticket.value.copy(items = _ticket.value.items + newItem))
    }

    fun removeItem(itemId: String) {
        setTicket(_ticket.value.copy(items = _ticket.value.items.filter { it.id != itemId }))
    }

    fun updateCharges(tax: Double? = null, tip: Double? = null) {
        setTicket(_ticket.value.copy(
            tax = tax ?: _ticket.value.tax,
            tip = tip ?: _ticket.value.tip,
        ))
    }

    fun addParticipant(name: String, color: String) {
        val p = Participant(name = name, color = color)
        setTicket(_ticket.value.copy(participants = _ticket.value.participants + p))
    }

    fun removeParticipant(participantId: String) {
        val updatedItems = _ticket.value.items.map { item ->
            item.copy(assignedParticipantIds = item.assignedParticipantIds - participantId)
        }
        setTicket(_ticket.value.copy(
            participants = _ticket.value.participants.filter { it.id != participantId },
            items = updatedItems,
        ))
    }

    fun toggleAssignment(itemId: String, participantId: String) {
        updateItem(itemId) {
            val ids = assignedParticipantIds
            copy(assignedParticipantIds = if (participantId in ids) ids - participantId else ids + participantId)
        }
    }

    fun markPaid(participantId: String, paid: Boolean) {
        val updated = _ticket.value.participants.map { p ->
            if (p.id == participantId) p.copy(
                paymentStatus = if (paid) com.halfsies.app.model.PaymentStatus.PAID
                                else com.halfsies.app.model.PaymentStatus.PENDING
            ) else p
        }
        _ticket.value = _ticket.value.copy(participants = updated)
    }

    fun reset() {
        pendingBitmap = null
        _ticket.value = Ticket()
    }
}
```

- [ ] **Step 4: Sync Gradle and build**

```bash
./gradlew :app:compileDebugKotlin
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/com/halfsies/app/ocr/OcrService.kt \
        app/src/main/java/com/halfsies/app/ocr/MlKitOcrService.kt \
        app/src/main/java/com/halfsies/app/data/ReceiptRepository.kt \
        app/build.gradle.kts
git commit -m "feat: add OcrService interface, MlKitOcrService, and ReceiptRepository"
git push
```

---

### Task 9: HalfsiesApplication + Theme + Navigation

**Files:**
- Create: `app/src/main/java/com/halfsies/app/HalfsiesApplication.kt`
- Create: `app/src/main/java/com/halfsies/app/ui/theme/Theme.kt`
- Create: `app/src/main/java/com/halfsies/app/navigation/AppNavigation.kt`
- Modify: `app/src/main/AndroidManifest.xml` — add `android:name=".HalfsiesApplication"`
- Modify: `app/src/main/java/com/halfsies/app/MainActivity.kt`

- [ ] **Step 1: Create `HalfsiesApplication.kt`**

```kotlin
package com.halfsies.app

import android.app.Application
import com.halfsies.app.data.ReceiptRepository
import com.halfsies.app.ocr.MlKitOcrService
import com.halfsies.app.parser.ReceiptParser

class HalfsiesApplication : Application() {
    val repository = ReceiptRepository()
    private val parser = ReceiptParser()
    val ocrService = MlKitOcrService(parser)
}
```

- [ ] **Step 2: Create `Theme.kt`**

```kotlin
package com.halfsies.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import android.os.Build

private val Purple = Color(0xFF7C3AED)
private val PurpleLight = Color(0xFFA78BFA)

private val LightColors = lightColorScheme(
    primary = Purple,
    onPrimary = Color.White,
    secondary = Purple,
)

private val DarkColors = darkColorScheme(
    primary = PurpleLight,
    onPrimary = Color.Black,
    secondary = PurpleLight,
)

@Composable
fun HalfsiesTheme(content: @Composable () -> Unit) {
    val colorScheme = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val context = LocalContext.current
        dynamicLightColorScheme(context) // respects system dynamic colour on Android 12+
    } else {
        LightColors
    }
    MaterialTheme(colorScheme = colorScheme, content = content)
}
```

- [ ] **Step 3: Create `AppNavigation.kt`**

```kotlin
package com.halfsies.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.halfsies.app.data.ReceiptRepository
import com.halfsies.app.ocr.OcrService
import com.halfsies.app.ui.assign.AssignScreen
import com.halfsies.app.ui.capture.CaptureScreen
import com.halfsies.app.ui.ocr.OcrScreen
import com.halfsies.app.ui.review.ReviewScreen
import com.halfsies.app.ui.summary.SummaryScreen

object Routes {
    const val CAPTURE = "capture"
    const val OCR = "ocr"
    const val REVIEW = "review"
    const val ASSIGN = "assign"
    const val SUMMARY = "summary"
}

@Composable
fun AppNavigation(
    navController: NavHostController,
    repository: ReceiptRepository,
    ocrService: OcrService,
) {
    NavHost(navController = navController, startDestination = Routes.CAPTURE) {
        composable(Routes.CAPTURE) {
            CaptureScreen(
                repository = repository,
                onImageCaptured = { navController.navigate(Routes.OCR) },
            )
        }
        composable(Routes.OCR) {
            OcrScreen(
                repository = repository,
                ocrService = ocrService,
                onSuccess = { navController.navigate(Routes.REVIEW) { popUpTo(Routes.CAPTURE) } },
                onBack = { navController.popBackStack() },
            )
        }
        composable(Routes.REVIEW) {
            ReviewScreen(
                repository = repository,
                onNext = { navController.navigate(Routes.ASSIGN) },
                onRestart = { repository.reset(); navController.navigate(Routes.CAPTURE) { popUpTo(Routes.CAPTURE) { inclusive = true } } },
            )
        }
        composable(Routes.ASSIGN) {
            AssignScreen(
                repository = repository,
                onNext = { navController.navigate(Routes.SUMMARY) },
                onBack = { navController.popBackStack() },
            )
        }
        composable(Routes.SUMMARY) {
            SummaryScreen(
                repository = repository,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
```

- [ ] **Step 4: Update `MainActivity.kt`**

```kotlin
package com.halfsies.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.navigation.compose.rememberNavController
import com.halfsies.app.navigation.AppNavigation
import com.halfsies.app.ui.theme.HalfsiesTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as HalfsiesApplication
        setContent {
            HalfsiesTheme {
                val navController = rememberNavController()
                AppNavigation(
                    navController = navController,
                    repository = app.repository,
                    ocrService = app.ocrService,
                )
            }
        }
    }
}
```

- [ ] **Step 5: Add `android:name` to AndroidManifest.xml**

In `app/src/main/AndroidManifest.xml`, add `android:name=".HalfsiesApplication"` to the `<application>` tag:

```xml
<application
    android:name=".HalfsiesApplication"
    android:allowBackup="true"
    ...>
```

- [ ] **Step 6: Build to verify**

```bash
./gradlew :app:compileDebugKotlin
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 7: Commit**

```bash
git add app/src/main/java/com/halfsies/app/ \
        app/src/main/AndroidManifest.xml
git commit -m "feat: add HalfsiesApplication, theme, and navigation graph"
git push
```

---

### Task 10: CaptureScreen + CaptureViewModel

**Files:**
- Create: `app/src/main/java/com/halfsies/app/ui/capture/CaptureViewModel.kt`
- Create: `app/src/main/java/com/halfsies/app/ui/capture/CaptureScreen.kt`

- [ ] **Step 1: Create `CaptureViewModel.kt`**

```kotlin
package com.halfsies.app.ui.capture

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import com.halfsies.app.data.ReceiptRepository

class CaptureViewModel(private val repository: ReceiptRepository) : ViewModel() {

    fun onImageCaptured(bitmap: Bitmap) {
        repository.pendingBitmap = bitmap
    }
}
```

- [ ] **Step 2: Create `CaptureScreen.kt`**

```kotlin
package com.halfsies.app.ui.capture

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.concurrent.futures.await
import androidx.lifecycle.viewmodel.compose.viewModel
import com.halfsies.app.data.ReceiptRepository
import kotlinx.coroutines.launch
import java.io.File
import java.util.concurrent.Executors

@Composable
fun CaptureScreen(
    repository: ReceiptRepository,
    onImageCaptured: () -> Unit,
) {
    val vm: CaptureViewModel = viewModel(factory = object : androidx.lifecycle.ViewModelProvider.Factory {
        override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
            @Suppress("UNCHECKED_CAST")
            return CaptureViewModel(repository) as T
        }
    })

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val previewView = remember { PreviewView(context) }
    val imageCapture = remember { ImageCapture.Builder().build() }
    var flashEnabled by remember { mutableStateOf(false) }

    // Gallery picker
    val galleryLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri ?: return@rememberLauncherForActivityResult
        context.contentResolver.openInputStream(uri)?.use { stream ->
            val bitmap = BitmapFactory.decodeStream(stream) ?: return@use
            vm.onImageCaptured(bitmap)
            onImageCaptured()
        }
    }

    LaunchedEffect(Unit) {
        val provider = ProcessCameraProvider.getInstance(context).await()
        val preview = Preview.Builder().build().also {
            it.setSurfaceProvider(previewView.surfaceProvider)
        }
        val selector = CameraSelector.DEFAULT_BACK_CAMERA
        provider.unbindAll()
        provider.bindToLifecycle(lifecycleOwner, selector, preview, imageCapture)
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())

        // Flash toggle
        IconButton(
            onClick = {
                flashEnabled = !flashEnabled
                imageCapture.flashMode = if (flashEnabled) ImageCapture.FLASH_MODE_ON
                                         else ImageCapture.FLASH_MODE_OFF
            },
            modifier = Modifier.align(Alignment.TopStart).padding(16.dp),
        ) {
            Icon(
                if (flashEnabled) Icons.Default.FlashOn else Icons.Default.FlashOff,
                contentDescription = "Flash",
                tint = MaterialTheme.colorScheme.onPrimary,
            )
        }

        // Gallery button
        IconButton(
            onClick = { galleryLauncher.launch("image/*") },
            modifier = Modifier.align(Alignment.TopEnd).padding(16.dp),
        ) {
            Icon(
                Icons.Default.PhotoLibrary,
                contentDescription = "Choose from gallery",
                tint = MaterialTheme.colorScheme.onPrimary,
            )
        }

        // Shutter button
        Button(
            onClick = {
                val executor = Executors.newSingleThreadExecutor()
                val outputFile = File(context.cacheDir, "capture.jpg")
                val outputOptions = ImageCapture.OutputFileOptions.Builder(outputFile).build()
                imageCapture.takePicture(outputOptions, executor, object : ImageCapture.OnImageSavedCallback {
                    override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                        val bitmap = BitmapFactory.decodeFile(outputFile.absolutePath) ?: return
                        scope.launch {
                            vm.onImageCaptured(bitmap)
                            onImageCaptured()
                        }
                    }
                    override fun onError(exc: ImageCaptureException) {
                        // TODO: surface error to user in a future pass
                    }
                })
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 48.dp)
                .size(80.dp),
            shape = androidx.compose.foundation.shape.CircleShape,
        ) { /* empty — circle shutter button */ }
    }
}
```

- [ ] **Step 3: Build to verify**

```bash
./gradlew :app:compileDebugKotlin
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add app/src/main/java/com/halfsies/app/ui/capture/
git commit -m "feat: add CaptureScreen with CameraX viewfinder, flash, and gallery fallback"
git push
```

---

### Task 11: OcrScreen + OcrViewModel

**Files:**
- Create: `app/src/main/java/com/halfsies/app/ui/ocr/OcrViewModel.kt`
- Create: `app/src/main/java/com/halfsies/app/ui/ocr/OcrScreen.kt`
- Create: `app/src/test/java/com/halfsies/app/ocr/OcrViewModelTest.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
package com.halfsies.app.ocr

import android.graphics.Bitmap
import com.halfsies.app.calculator.SplitCalculator
import com.halfsies.app.data.ReceiptRepository
import com.halfsies.app.model.*
import com.halfsies.app.ui.ocr.OcrViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

// Robolectric lets Bitmap.createBitmap() work on the JVM without a device
@RunWith(RobolectricTestRunner::class)
@OptIn(ExperimentalCoroutinesApi::class)
class OcrViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() { Dispatchers.setMain(dispatcher) }
    @After fun tearDown() { Dispatchers.resetMain() }

    private val fakeResult = ParsedReceiptResult(
        items = listOf(TicketItem("i1", "Burger", 1, 10.0, 10.0)),
        subtotal = 10.0, tax = 0.80, tip = null, grandTotal = 10.80,
        rawText = "Burger 10.00\nTax 0.80", warnings = emptyList(),
    )

    private val fakeOcr = object : OcrService {
        override suspend fun recognize(bitmap: Bitmap) = fakeResult
    }

    @Test fun `recognize populates repository ticket on success`() = runTest {
        val repo = ReceiptRepository()
        repo.pendingBitmap = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
        val vm = OcrViewModel(repo, fakeOcr)

        vm.startRecognition()
        advanceUntilIdle()

        val ticket = repo.ticket.value
        assertEquals(1, ticket.items.size)
        assertEquals(10.0, ticket.items[0].totalPrice, 0.0)
        assertEquals(0.80, ticket.tax, 0.0)
        assertTrue(vm.uiState.value is OcrViewModel.State.Success)
    }

    @Test fun `recognize sets error state when bitmap is null`() = runTest {
        val repo = ReceiptRepository() // pendingBitmap = null
        val vm = OcrViewModel(repo, fakeOcr)

        vm.startRecognition()
        advanceUntilIdle()

        assertTrue(vm.uiState.value is OcrViewModel.State.Error)
    }
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
./gradlew :app:test --tests "com.halfsies.app.ocr.OcrViewModelTest"
```

Expected: FAILED — `OcrViewModel` does not exist.

- [ ] **Step 3: Create `OcrViewModel.kt`**

```kotlin
package com.halfsies.app.ui.ocr

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.halfsies.app.calculator.SplitCalculator
import com.halfsies.app.data.ReceiptRepository
import com.halfsies.app.model.Ticket
import com.halfsies.app.ocr.OcrService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class OcrViewModel(
    private val repository: ReceiptRepository,
    private val ocrService: OcrService,
) : ViewModel() {

    sealed class State {
        object Idle : State()
        object Running : State()
        object Success : State()
        data class Error(val message: String) : State()
    }

    private val _uiState = MutableStateFlow<State>(State.Idle)
    val uiState: StateFlow<State> = _uiState

    fun startRecognition() {
        val bitmap = repository.pendingBitmap
        if (bitmap == null) {
            _uiState.value = State.Error("No image captured.")
            return
        }
        _uiState.value = State.Running
        viewModelScope.launch {
            try {
                val result = ocrService.recognize(bitmap)
                val ticket = Ticket(
                    items = result.items,
                    subtotal = result.subtotal ?: SplitCalculator.roundCurrency(result.items.sumOf { it.totalPrice }),
                    tax = result.tax ?: 0.0,
                    tip = result.tip ?: 0.0,
                    grandTotal = result.grandTotal ?: 0.0,
                )
                repository.setTicket(ticket)
                _uiState.value = State.Success
            } catch (e: Exception) {
                _uiState.value = State.Error(e.message ?: "OCR failed.")
            }
        }
    }
}
```

- [ ] **Step 4: Create `OcrScreen.kt`**

```kotlin
package com.halfsies.app.ui.ocr

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.halfsies.app.data.ReceiptRepository
import com.halfsies.app.ocr.OcrService

@Composable
fun OcrScreen(
    repository: ReceiptRepository,
    ocrService: OcrService,
    onSuccess: () -> Unit,
    onBack: () -> Unit,
) {
    val vm: OcrViewModel = viewModel(factory = object : androidx.lifecycle.ViewModelProvider.Factory {
        override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
            @Suppress("UNCHECKED_CAST")
            return OcrViewModel(repository, ocrService) as T
        }
    })

    val state by vm.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { vm.startRecognition() }

    LaunchedEffect(state) {
        if (state is OcrViewModel.State.Success) onSuccess()
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        when (state) {
            is OcrViewModel.State.Running, OcrViewModel.State.Idle -> {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    CircularProgressIndicator()
                    Text("Reading receipt…", style = MaterialTheme.typography.bodyLarge)
                }
            }
            is OcrViewModel.State.Error -> {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text((state as OcrViewModel.State.Error).message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = onBack) { Text("Try again") }
                }
            }
            else -> {}
        }
    }
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
./gradlew :app:test --tests "com.halfsies.app.ocr.OcrViewModelTest"
```

Expected: `BUILD SUCCESSFUL`, 2 tests passed.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/com/halfsies/app/ui/ocr/ \
        app/src/test/java/com/halfsies/app/ocr/OcrViewModelTest.kt
git commit -m "feat: add OcrScreen and OcrViewModel with ML Kit integration"
git push
```

---

### Task 12: ReviewScreen + ReviewViewModel

**Files:**
- Create: `app/src/main/java/com/halfsies/app/ui/review/ReviewViewModel.kt`
- Create: `app/src/main/java/com/halfsies/app/ui/review/ReviewScreen.kt`
- Create: `app/src/test/java/com/halfsies/app/review/ReviewViewModelTest.kt`

- [ ] **Step 1: Write the failing tests**

```kotlin
package com.halfsies.app.review

import com.halfsies.app.data.ReceiptRepository
import com.halfsies.app.model.*
import com.halfsies.app.ui.review.ReviewViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ReviewViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    @Before fun setUp() { Dispatchers.setMain(dispatcher) }
    @After fun tearDown() { Dispatchers.resetMain() }

    private fun item(id: String, qty: Int, unit: Double) = TicketItem(
        id, id, qty, unit, unit * qty
    )

    @Test fun `updateItem recalculates total from qty and unit`() = runTest {
        val repo = ReceiptRepository()
        repo.setTicket(Ticket(items = listOf(item("i1", 1, 10.0))))
        val vm = ReviewViewModel(repo)

        vm.updateItem("i1", quantity = 3)
        advanceUntilIdle()

        val updated = repo.ticket.value.items.first()
        assertEquals(3, updated.quantity)
        assertEquals(30.0, updated.totalPrice, 0.0)
    }

    @Test fun `editing total back-calculates unit price`() = runTest {
        val repo = ReceiptRepository()
        repo.setTicket(Ticket(items = listOf(item("i1", 11, 11.0)))) // unit wrongly 11
        val vm = ReviewViewModel(repo)

        vm.updateItem("i1", totalPrice = 11.0)
        advanceUntilIdle()

        val updated = repo.ticket.value.items.first()
        assertEquals(1.0, updated.pricePerUnit, 0.001)
        assertEquals(11.0, updated.totalPrice, 0.0)
    }

    @Test fun `addTax appends to existing tax`() = runTest {
        val repo = ReceiptRepository()
        repo.setTicket(Ticket(tax = 0.31))
        val vm = ReviewViewModel(repo)

        vm.addTax(1.86)
        advanceUntilIdle()

        assertEquals(2.17, repo.ticket.value.tax, 0.001)
    }
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
./gradlew :app:test --tests "com.halfsies.app.review.ReviewViewModelTest"
```

Expected: FAILED — `ReviewViewModel` does not exist.

- [ ] **Step 3: Create `ReviewViewModel.kt`**

```kotlin
package com.halfsies.app.ui.review

import androidx.lifecycle.ViewModel
import com.halfsies.app.calculator.SplitCalculator.roundCurrency
import com.halfsies.app.data.ReceiptRepository

class ReviewViewModel(private val repository: ReceiptRepository) : ViewModel() {

    val ticket = repository.ticket

    fun updateItem(
        itemId: String,
        name: String? = null,
        quantity: Int? = null,
        pricePerUnit: Double? = null,
        totalPrice: Double? = null,
    ) {
        repository.updateItem(itemId) {
            val newQty = quantity ?: this.quantity
            val newTotal = totalPrice
            val newUnit = when {
                newTotal != null -> roundCurrency(newTotal / newQty.coerceAtLeast(1))
                pricePerUnit != null -> pricePerUnit
                else -> this.pricePerUnit
            }
            copy(
                name = name ?: this.name,
                quantity = newQty,
                pricePerUnit = newUnit,
                totalPrice = roundCurrency(newUnit * newQty),
            )
        }
    }

    fun addItem() = repository.addItem()
    fun removeItem(itemId: String) = repository.removeItem(itemId)
    fun setTax(value: Double) = repository.updateCharges(tax = value)
    fun addTax(addend: Double) = repository.updateCharges(tax = roundCurrency(ticket.value.tax + addend))
    fun setTip(value: Double) = repository.updateCharges(tip = value)
}
```

- [ ] **Step 4: Create `ReviewScreen.kt`**

```kotlin
package com.halfsies.app.ui.review

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.halfsies.app.calculator.SplitCalculator.formatMoney
import com.halfsies.app.data.ReceiptRepository
import com.halfsies.app.model.TicketItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReviewScreen(
    repository: ReceiptRepository,
    onNext: () -> Unit,
    onRestart: () -> Unit,
) {
    val vm: ReviewViewModel = viewModel(factory = object : androidx.lifecycle.ViewModelProvider.Factory {
        override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
            @Suppress("UNCHECKED_CAST")
            return ReviewViewModel(repository) as T
        }
    })
    val ticket by vm.ticket.collectAsStateWithLifecycle()
    var showTaxAdder by remember { mutableStateOf(false) }
    var taxAddend by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Review receipt") }, actions = {
                TextButton(onClick = onRestart) { Text("Re-upload") }
                IconButton(onClick = { vm.addItem() }) {
                    Icon(Icons.Default.Add, contentDescription = "Add item")
                }
            })
        },
        bottomBar = {
            Button(
                onClick = onNext,
                modifier = Modifier.fillMaxWidth().padding(16.dp),
            ) { Text("Assign →") }
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).padding(horizontal = 16.dp)) {
            items(ticket.items, key = { it.id }) { item ->
                ItemRow(item = item, onUpdate = { name, qty, unit, total ->
                    vm.updateItem(item.id, name = name, quantity = qty, pricePerUnit = unit, totalPrice = total)
                }, onRemove = { vm.removeItem(item.id) })
            }

            item {
                Spacer(Modifier.height(16.dp))
                Text("Subtotal: ${formatMoney(ticket.subtotal)}", style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(8.dp))

                // Tax
                OutlinedTextField(
                    value = ticket.tax.toString(),
                    onValueChange = { vm.setTax(it.toDoubleOrNull() ?: ticket.tax) },
                    label = { Text("Tax") },
                    modifier = Modifier.fillMaxWidth(),
                )
                if (!showTaxAdder) {
                    TextButton(onClick = { showTaxAdder = true; taxAddend = "" }) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Add tax line")
                    }
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = taxAddend,
                            onValueChange = { taxAddend = it },
                            label = { Text("Additional tax") },
                            modifier = Modifier.weight(1f),
                        )
                        Spacer(Modifier.width(8.dp))
                        Button(
                            onClick = {
                                val amt = taxAddend.toDoubleOrNull() ?: 0.0
                                if (amt > 0) { vm.addTax(amt); showTaxAdder = false }
                            },
                            enabled = (taxAddend.toDoubleOrNull() ?: 0.0) > 0,
                        ) { Text("+") }
                    }
                }

                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = ticket.tip.toString(),
                    onValueChange = { vm.setTip(it.toDoubleOrNull() ?: ticket.tip) },
                    label = { Text("Tip") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                Text("Grand total: ${formatMoney(ticket.grandTotal)}", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(80.dp)) // bottom bar clearance
            }
        }
    }
}

@Composable
private fun ItemRow(
    item: TicketItem,
    onUpdate: (name: String?, qty: Int?, unit: Double?, total: Double?) -> Unit,
    onRemove: () -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(modifier = Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = item.name,
                onValueChange = { onUpdate(it, null, null, null) },
                label = { Text("Name") },
                modifier = Modifier.weight(2f),
                singleLine = true,
            )
            Spacer(Modifier.width(4.dp))
            OutlinedTextField(
                value = item.quantity.toString(),
                onValueChange = { onUpdate(null, it.toIntOrNull()?.coerceAtLeast(1), null, null) },
                label = { Text("Qty") },
                modifier = Modifier.weight(0.8f),
                singleLine = true,
            )
            Spacer(Modifier.width(4.dp))
            OutlinedTextField(
                value = item.pricePerUnit.toString(),
                onValueChange = { onUpdate(null, null, it.toDoubleOrNull(), null) },
                label = { Text("Unit") },
                modifier = Modifier.weight(1f),
                singleLine = true,
            )
            Spacer(Modifier.width(4.dp))
            OutlinedTextField(
                value = item.totalPrice.toString(),
                onValueChange = { onUpdate(null, null, null, it.toDoubleOrNull()) },
                label = { Text("Total") },
                modifier = Modifier.weight(1f),
                singleLine = true,
            )
            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Delete, contentDescription = "Remove", tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
./gradlew :app:test --tests "com.halfsies.app.review.ReviewViewModelTest"
```

Expected: `BUILD SUCCESSFUL`, 3 tests passed.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/com/halfsies/app/ui/review/ \
        app/src/test/java/com/halfsies/app/review/
git commit -m "feat: add ReviewScreen with editable items, tax adder, and total back-calculation"
git push
```

---

### Task 13: AssignScreen + AssignViewModel

**Files:**
- Create: `app/src/main/java/com/halfsies/app/ui/assign/AssignViewModel.kt`
- Create: `app/src/main/java/com/halfsies/app/ui/assign/AssignScreen.kt`

- [ ] **Step 1: Create `AssignViewModel.kt`**

```kotlin
package com.halfsies.app.ui.assign

import androidx.lifecycle.ViewModel
import com.halfsies.app.calculator.SplitCalculator
import com.halfsies.app.data.ReceiptRepository
import kotlinx.coroutines.flow.map

private val PARTICIPANT_COLORS = listOf(
    "#EF4444", "#F97316", "#EAB308", "#22C55E",
    "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
)

class AssignViewModel(private val repository: ReceiptRepository) : ViewModel() {

    val ticket = repository.ticket

    val splitResult = ticket.map { SplitCalculator.calculateSplit(it) }

    fun addParticipant(name: String) {
        val colorIndex = ticket.value.participants.size % PARTICIPANT_COLORS.size
        repository.addParticipant(name, PARTICIPANT_COLORS[colorIndex])
    }

    fun removeParticipant(participantId: String) = repository.removeParticipant(participantId)

    fun toggleAssignment(itemId: String, participantId: String) =
        repository.toggleAssignment(itemId, participantId)
}
```

- [ ] **Step 2: Create `AssignScreen.kt`**

```kotlin
package com.halfsies.app.ui.assign

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.halfsies.app.calculator.SplitCalculator.formatMoney
import com.halfsies.app.data.ReceiptRepository
import com.halfsies.app.model.Participant
import com.halfsies.app.model.TicketItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssignScreen(
    repository: ReceiptRepository,
    onNext: () -> Unit,
    onBack: () -> Unit,
) {
    val vm: AssignViewModel = viewModel(factory = object : androidx.lifecycle.ViewModelProvider.Factory {
        override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
            @Suppress("UNCHECKED_CAST")
            return AssignViewModel(repository) as T
        }
    })

    val ticket by vm.ticket.collectAsStateWithLifecycle()
    val split by vm.splitResult.collectAsStateWithLifecycle(null)
    var showAddPerson by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }

    if (showAddPerson) {
        AlertDialog(
            onDismissRequest = { showAddPerson = false },
            title = { Text("Add person") },
            text = {
                OutlinedTextField(
                    value = newName,
                    onValueChange = { newName = it },
                    label = { Text("Name") },
                    singleLine = true,
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    if (newName.isNotBlank()) { vm.addParticipant(newName.trim()); newName = "" }
                    showAddPerson = false
                }) { Text("Add") }
            },
            dismissButton = { TextButton(onClick = { showAddPerson = false }) { Text("Cancel") } }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Assign items") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } },
            )
        },
        bottomBar = {
            Button(
                onClick = onNext,
                enabled = ticket.participants.isNotEmpty(),
                modifier = Modifier.fillMaxWidth().padding(16.dp),
            ) { Text("Summary →") }
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).padding(horizontal = 16.dp)) {
            // Participant chips
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 8.dp)) {
                    items(ticket.participants) { p ->
                        val myTotal = split?.participants?.firstOrNull { it.participantId == p.id }?.total ?: 0.0
                        AssistChip(
                            onClick = { vm.removeParticipant(p.id) },
                            label = { Text("${p.name}  ${formatMoney(myTotal)}") },
                            leadingIcon = {
                                Box(
                                    Modifier.size(12.dp).background(
                                        Color(android.graphics.Color.parseColor(p.color)), CircleShape
                                    )
                                )
                            },
                        )
                    }
                    item {
                        IconButton(onClick = { showAddPerson = true }) {
                            Icon(Icons.Default.Add, contentDescription = "Add person")
                        }
                    }
                }
            }

            // Item rows
            items(ticket.items, key = { it.id }) { item ->
                ItemAssignRow(item = item, participants = ticket.participants,
                    onToggle = { pId -> vm.toggleAssignment(item.id, pId) })
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun ItemAssignRow(
    item: TicketItem,
    participants: List<Participant>,
    onToggle: (String) -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(item.name, style = MaterialTheme.typography.bodyLarge)
                Text(formatMoney(item.totalPrice), style = MaterialTheme.typography.bodyLarge)
            }
            Spacer(Modifier.height(8.dp))
            participants.forEach { p ->
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { onToggle(p.id) }.padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Checkbox(
                        checked = p.id in item.assignedParticipantIds,
                        onCheckedChange = { onToggle(p.id) },
                    )
                    Box(
                        Modifier.size(10.dp).background(
                            Color(android.graphics.Color.parseColor(p.color)), CircleShape
                        )
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(p.name, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}
```

- [ ] **Step 3: Build to verify**

```bash
./gradlew :app:compileDebugKotlin
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add app/src/main/java/com/halfsies/app/ui/assign/
git commit -m "feat: add AssignScreen with participant chips and per-item assignment"
git push
```

---

### Task 14: SummaryScreen + SummaryViewModel + Donation button

**Files:**
- Create: `app/src/main/java/com/halfsies/app/ui/summary/SummaryViewModel.kt`
- Create: `app/src/main/java/com/halfsies/app/ui/summary/SummaryScreen.kt`

- [ ] **Step 1: Create `SummaryViewModel.kt`**

```kotlin
package com.halfsies.app.ui.summary

import androidx.lifecycle.ViewModel
import com.halfsies.app.calculator.SplitCalculator
import com.halfsies.app.calculator.SplitCalculator.formatMoney
import com.halfsies.app.data.ReceiptRepository
import com.halfsies.app.model.PaymentStatus
import kotlinx.coroutines.flow.map

class SummaryViewModel(private val repository: ReceiptRepository) : ViewModel() {

    val splitResult = repository.ticket.map { SplitCalculator.calculateSplit(it) }

    fun buildShareText(): String {
        val split = SplitCalculator.calculateSplit(repository.ticket.value)
        val lines = buildList {
            add("Halfsies breakdown")
            add("")
            split.participants.forEach { add("- ${it.participantName}: ${formatMoney(it.total)}") }
            add("")
            add("Grand total: ${formatMoney(split.grandTotal)}")
        }
        return lines.joinToString("\n")
    }

    fun markPaid(participantId: String, paid: Boolean) = repository.markPaid(participantId, paid)
}
```

- [ ] **Step 2: Create `SummaryScreen.kt`**

```kotlin
package com.halfsies.app.ui.summary

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.halfsies.app.calculator.SplitCalculator.formatMoney
import com.halfsies.app.data.ReceiptRepository
import com.halfsies.app.model.ParticipantShare
import com.halfsies.app.model.PaymentStatus

private const val DONATE_URL = "https://buymeacoffee.com/halfsies" // replace with your URL

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SummaryScreen(
    repository: ReceiptRepository,
    onBack: () -> Unit,
) {
    val vm: SummaryViewModel = viewModel(factory = object : androidx.lifecycle.ViewModelProvider.Factory {
        override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
            @Suppress("UNCHECKED_CAST")
            return SummaryViewModel(repository) as T
        }
    })

    val split by vm.splitResult.collectAsStateWithLifecycle(null)
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Summary") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } },
            )
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).padding(horizontal = 16.dp)) {
            split?.let { result ->
                items(result.participants, key = { it.participantId }) { share ->
                    ParticipantCard(share = share, onTogglePaid = { vm.markPaid(share.participantId, it) })
                }

                if (result.unassignedSubtotal > 0) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                        ) {
                            Text(
                                "Unassigned: ${formatMoney(result.unassignedSubtotal)}",
                                modifier = Modifier.padding(12.dp),
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                        }
                    }
                }

                item {
                    Spacer(Modifier.height(16.dp))
                    Text("Grand total: ${formatMoney(result.grandTotal)}", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(16.dp))

                    // Share button
                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, vm.buildShareText())
                            }
                            context.startActivity(Intent.createChooser(intent, "Share breakdown"))
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Share results")
                    }

                    Spacer(Modifier.height(8.dp))

                    // Donation link
                    TextButton(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(DONATE_URL))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("☕ Support Halfsies")
                    }

                    Spacer(Modifier.height(80.dp))
                }
            }
        }
    }
}

@Composable
private fun ParticipantCard(share: ParticipantShare, onTogglePaid: (Boolean) -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(12.dp).background(Color(android.graphics.Color.parseColor(share.color)), CircleShape))
                    Spacer(Modifier.width(8.dp))
                    Text(share.participantName, style = MaterialTheme.typography.titleMedium)
                }
                Text(formatMoney(share.total), style = MaterialTheme.typography.titleLarge)
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SummaryChip("Food", formatMoney(share.subtotal))
                SummaryChip("Tax/tip", formatMoney(share.taxAndTipShare))
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = share.paymentStatus == PaymentStatus.PAID,
                    onCheckedChange = { onTogglePaid(it) },
                )
                Text(if (share.paymentStatus == PaymentStatus.PAID) "Paid" else "Mark as paid")
            }
        }
    }
}

@Composable
private fun SummaryChip(label: String, value: String) {
    Surface(shape = MaterialTheme.shapes.small, color = MaterialTheme.colorScheme.surfaceVariant) {
        Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall)
            Text(value, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
```

- [ ] **Step 3: Build to verify**

```bash
./gradlew :app:compileDebugKotlin
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add app/src/main/java/com/halfsies/app/ui/summary/
git commit -m "feat: add SummaryScreen with share sheet and Buy Me a Coffee donation link"
git push
```

---

### Task 15: AndroidManifest permissions + smoke test

**Files:**
- Modify: `app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Add permissions to `AndroidManifest.xml`**

Inside the `<manifest>` block, before `<application>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />

<uses-feature android:name="android.hardware.camera" android:required="false" />
```

- [ ] **Step 2: Request CAMERA permission at runtime in `CaptureScreen.kt`**

Add at the top of `CaptureScreen` composable, before the `LaunchedEffect`:

```kotlin
val cameraPermission = rememberLauncherForActivityResult(
    ActivityResultContracts.RequestPermission()
) { granted ->
    // Camera permission result handled — CameraX will fail gracefully if denied
}
LaunchedEffect(Unit) { cameraPermission.launch(android.Manifest.permission.CAMERA) }
```

- [ ] **Step 3: Run all unit tests**

```bash
./gradlew :app:test
```

Expected: `BUILD SUCCESSFUL`, all tests pass.

- [ ] **Step 4: Build the debug APK**

```bash
./gradlew :app:assembleDebug
```

APK at: `app/build/outputs/apk/debug/app-debug.apk`

- [ ] **Step 5: Install on device and smoke test**

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

Smoke test checklist:
- [ ] App launches to camera viewfinder
- [ ] Camera permission dialog appears on first launch
- [ ] Shutter button captures a photo and advances to OCR loading screen
- [ ] OCR completes and items appear in Review screen
- [ ] Qty is integer-only, editing total back-calculates unit
- [ ] "Add tax" button appends to existing tax
- [ ] Assign screen shows participant chips with running totals
- [ ] Summary screen shows per-person breakdown
- [ ] Share button opens the Android share sheet with plain text
- [ ] "☕ Support Halfsies" opens the browser

- [ ] **Step 6: Replace donation URL**

In `SummaryScreen.kt`, replace:
```kotlin
private const val DONATE_URL = "https://buymeacoffee.com/halfsies"
```
with your actual Buy Me a Coffee URL after creating the account.

- [ ] **Step 7: Final commit**

```bash
git add app/src/main/AndroidManifest.xml \
        app/src/main/java/com/halfsies/app/ui/capture/CaptureScreen.kt
git commit -m "feat: add runtime camera permission request and smoke test verified"
git push
```

---

## Donation Button Setup (user action — do this before Task 15 Step 6)

1. Go to **buymeacoffee.com** → sign up with Google.
2. Set your page name (e.g. `buymeacoffee.com/halfsies`).
3. Optionally set a goal description: "Keep Halfsies free and ad-free."
4. Copy your page URL.
5. In `SummaryScreen.kt` replace the placeholder `DONATE_URL` constant with your URL.
6. Rebuild the APK.

That's it. No approval process, no fees, no Play Store compliance issues. The link simply opens the browser.
