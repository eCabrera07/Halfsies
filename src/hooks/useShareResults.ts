import { useMemo, useState } from 'react'
import type { Ticket } from '../types'
import { calculateSplit } from '../utils/splitCalculator'
import { buildMarkdownBreakdown, buildShareUrl, createSharePayload } from '../utils/shareSummary'

export function useShareResults(ticket: Ticket) {
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'copied' | 'failed'>('idle')
  const split = useMemo(() => calculateSplit(ticket), [ticket])
  const payload = useMemo(() => createSharePayload(split), [split])
  const shareUrl = useMemo(() => buildShareUrl(payload), [payload])
  const shareText = useMemo(() => buildMarkdownBreakdown(split), [split])

  async function shareResults() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Halfsies breakdown',
          text: shareText,
        })
        setShareStatus('shared')
        return
      }

      await navigator.clipboard.writeText(shareText)
      setShareStatus('copied')
    } catch {
      setShareStatus('failed')
    }
  }

  return {
    split,
    shareUrl,
    shareText,
    shareStatus,
    shareResults,
  }
}
