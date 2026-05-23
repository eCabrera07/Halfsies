import { Camera, ImageUp, ScanLine, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createEnvironmentCameraConstraints, isCameraCaptureSupported, stopMediaStream } from '../services/cameraCapture'
import { BrowserReceiptImagePreprocessor } from '../services/imagePreprocessor'
import { TesseractOcrService } from '../services/ocrService'
import { useTicketStore } from '../store/useTicketStore'

const ocrService = new TesseractOcrService(new BrowserReceiptImagePreprocessor())
const receiptActionBaseClassName =
  'flex min-h-14 w-full items-center justify-center gap-3 rounded-lg border px-5 py-4 text-base font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60'

export function CameraUploadView() {
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isProcessingReceipt = useTicketStore((state) => state.isProcessingReceipt)
  const receiptPreviewUrl = useTicketStore((state) => state.receiptPreviewUrl)
  const applyOcrResult = useTicketStore((state) => state.applyOcrResult)
  const setIsProcessingReceipt = useTicketStore((state) => state.setIsProcessingReceipt)
  const setReceiptPreviewUrl = useTicketStore((state) => state.setReceiptPreviewUrl)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !cameraStream) {
      return
    }

    video.srcObject = cameraStream
    const playResult = video.play?.()
    if (playResult && typeof playResult.catch === 'function') {
      void playResult.catch(() => {
        setCameraError('Camera preview is available, but autoplay was blocked. Tap Capture photo after the preview appears.')
      })
    }
  }, [cameraStream])

  useEffect(() => () => stopMediaStream(cameraStream), [cameraStream])

  async function startCamera() {
    setCameraError(null)

    if (!isCameraCaptureSupported()) {
      setCameraError('Camera access is not available in this browser. Use Upload image instead.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(createEnvironmentCameraConstraints())
      setCameraStream(stream)
    } catch {
      setCameraError('Camera permission was denied or no camera was found. Use Upload image instead.')
    }
  }

  function stopCamera() {
    stopMediaStream(cameraStream)
    setCameraStream(null)
  }

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

  async function processReceiptImage(image: File | Blob) {
    setIsProcessingReceipt(true)

    try {
      const ocrResult = await ocrService.processImage(image)
      applyOcrResult(ocrResult)
    } finally {
      setIsProcessingReceipt(false)
    }
  }

  async function captureCameraPhoto() {
    const video = videoRef.current
    if (!video) {
      return
    }

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      setCameraError('Unable to capture a camera frame. Use Upload image instead.')
      return
    }

    context.drawImage(video, 0, 0, width, height)
    const blob = await canvasToBlob(canvas)
    setReceiptPreviewUrl(URL.createObjectURL(blob))
    stopCamera()
    await processReceiptImage(blob)
  }

  return (
    <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-500">Halfsies</p>
          <h1 className="mt-2 text-4xl font-semibold text-text-main sm:text-5xl">Split the receipt while it is still warm</h1>
        </div>

        <button
          className={`${receiptActionBaseClassName} border-transparent bg-slate-950 text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500`}
          disabled={isProcessingReceipt}
          onClick={startCamera}
          type="button"
        >
          <Camera aria-hidden="true" className="h-5 w-5" />
          <span>{cameraStream ? 'Camera active' : 'Capture receipt'}</span>
        </button>

        <label
          className={`${receiptActionBaseClassName} cursor-pointer border-border-muted bg-surface-muted text-text-main hover:border-slate-400 dark:hover:border-slate-500`}
        >
          <ImageUp aria-hidden="true" className="h-5 w-5" />
          <span>Upload image</span>
          <input accept="image/*" className="sr-only" disabled={isProcessingReceipt} onChange={handleFileChange} type="file" />
        </label>
        {cameraError && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{cameraError}</p>}
      </div>

      <div className="aspect-[4/5] overflow-hidden rounded-lg border border-border-muted bg-surface-muted shadow-sm">
        {cameraStream ? (
          <div className="relative h-full w-full bg-black">
            <video aria-label="Camera preview" className="h-full w-full object-cover" playsInline ref={videoRef} />
            <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-black/60 p-3">
              <button
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border-muted bg-surface-muted px-3 py-3 text-sm font-semibold text-text-main shadow-sm transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isProcessingReceipt}
                onClick={captureCameraPhoto}
                type="button"
              >
                <ScanLine aria-hidden="true" className="h-4 w-4" />
                Capture photo
              </button>
              <button
                className="inline-flex min-h-12 w-12 items-center justify-center rounded-lg border border-white/40 bg-black/30 px-3 py-3 text-white transition hover:bg-black/50"
                onClick={stopCamera}
                title="Stop camera"
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : receiptPreviewUrl ? (
          <img alt="Receipt preview" className="h-full w-full object-cover" src={receiptPreviewUrl} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,var(--surface),var(--surface-muted))] p-6 text-center text-text-muted">
            <Camera aria-hidden="true" className="h-10 w-10 opacity-50" />
            <span className="text-sm font-medium">Receipt preview</span>
          </div>
        )}
      </div>
    </section>
  )
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to capture receipt photo.'))
        return
      }

      resolve(blob)
    }, 'image/png')
  })
}
