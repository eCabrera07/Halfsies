# Halfsies

Halfsies is a mobile-first receipt splitting web app built with Vite, React, TypeScript, Tailwind CSS, and Zustand. The UI is web-first, while the data models, split math, OCR contract, sharing utilities, and store actions are written as portable modules that can move into React Native or another mobile shell later.

## Architecture

- `src/types` contains persistence-friendly TypeScript models for participants, ticket items, tickets, split results, and shared summary payloads.
- `src/utils/splitCalculator.ts` is the pure calculation engine. It handles shared items and proportional tax/tip allocation from each participant's food subtotal.
- `src/services/ocrService.ts` defines the mockable OCR boundary. `MockOcrService` currently returns parsed sample receipt text, while `parseReceiptText` provides receipt-line parsing placeholders for a real provider.
- `src/store/useTicketStore.ts` owns workflow state and ticket mutations through Zustand.
- `src/hooks/useShareResults.ts` derives split results, compressed URL payloads, markdown text, and Web Share API behavior.
- `src/components` contains the mobile-friendly workflow screens: upload, review/edit, assign, summary/share, and read-only shared summary.

## Workflow

1. Capture or upload a receipt image from a mobile browser.
2. The OCR service returns normalized ticket items.
3. The host reviews OCR output, edits item values, and enters tax/tip.
4. Participants are added, color-coded, and assigned to items.
5. Halfsies calculates proportional totals and creates a compressed share URL.

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## OCR Integration Point

Replace `MockOcrService` with a concrete implementation of the `OcrService` interface:

```ts
export interface OcrService {
  processImage(image: File | string): Promise<TicketItem[]>
}
```

That boundary can wrap Google Cloud Vision, Tesseract.js, a custom layout parser, or a server-side image pipeline without changing the React workflow.
