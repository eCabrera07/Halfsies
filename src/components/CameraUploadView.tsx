import { Camera, ImageUp } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { MockOcrService } from '../services/ocrService'
import { useTicketStore } from '../store/useTicketStore'

const ocrService = new MockOcrService()

export function CameraUploadView() {
  const isProcessingReceipt = useTicketStore((state) => state.isProcessingReceipt)
  const receiptPreviewUrl = useTicketStore((state) => state.receiptPreviewUrl)
  const applyOcrResult = useTicketStore((state) => state.applyOcrResult)
  const setIsProcessingReceipt = useTicketStore((state) => state.setIsProcessingReceipt)
  const setReceiptPreviewUrl = useTicketStore((state) => state.setReceiptPreviewUrl)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setIsProcessingReceipt(true)
    setReceiptPreviewUrl(URL.createObjectURL(file))

    try {
      const ocrResult = await ocrService.processImage(file)
      applyOcrResult(ocrResult)
    } finally {
      setIsProcessingReceipt(false)
    }
  }

  return (
    <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Halfsies</p>
          <h1 className="mt-2 text-4xl font-semibold text-slate-950 sm:text-5xl">Split the receipt while it is still warm</h1>
        </div>

        <label className="flex cursor-pointer items-center justify-center gap-3 rounded-lg bg-slate-950 px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800">
          <Camera aria-hidden="true" className="h-5 w-5" />
          <span>{isProcessingReceipt ? 'Reading receipt...' : 'Capture receipt'}</span>
          <input
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={isProcessingReceipt}
            onChange={handleFileChange}
            type="file"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-5 py-4 text-base font-semibold text-slate-950 transition hover:border-slate-500">
          <ImageUp aria-hidden="true" className="h-5 w-5" />
          <span>Upload image</span>
          <input accept="image/*" className="sr-only" disabled={isProcessingReceipt} onChange={handleFileChange} type="file" />
        </label>
      </div>

      <div className="aspect-[4/5] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {receiptPreviewUrl ? (
          <img alt="Receipt preview" className="h-full w-full object-cover" src={receiptPreviewUrl} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#f8fafc,#ecfeff)] p-6 text-center text-slate-500">
            <Camera aria-hidden="true" className="h-10 w-10 text-slate-400" />
            <span className="text-sm font-medium">Receipt preview</span>
          </div>
        )}
      </div>
    </section>
  )
}
