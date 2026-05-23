import { useEffect, useMemo } from 'react'
import { AssigneeView } from './components/AssigneeView'
import { CameraUploadView } from './components/CameraUploadView'
import { ProgressSteps } from './components/ProgressSteps'
import { ReviewEditView } from './components/ReviewEditView'
import { SharedSummaryView } from './components/SharedSummaryView'
import { SummaryShareView } from './components/SummaryShareView'
import { ThemeToggle } from './components/ThemeToggle'
import { useTicketStore } from './store/useTicketStore'
import { resolveTheme, useThemeStore } from './store/useThemeStore'
import { decodeSharePayload } from './utils/shareSummary'

function App() {
  const currentStep = useTicketStore((state) => state.currentStep)
  const themeMode = useThemeStore((state) => state.mode)

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved = resolveTheme(themeMode, isDark)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [themeMode])

  const sharedPayload = useMemo(() => {
    const summary = new URLSearchParams(window.location.search).get('summary')
    return summary ? decodeSharePayload(summary) : null
  }, [])

  if (sharedPayload) {
    return (
      <main className="min-h-svh bg-surface px-4 py-6 sm:px-6 lg:px-8">
        <SharedSummaryView payload={sharedPayload} />
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <ProgressSteps currentStep={currentStep} />
        {currentStep === 'upload' && <CameraUploadView />}
        {currentStep === 'review' && <ReviewEditView />}
        {currentStep === 'assign' && <AssigneeView />}
        {currentStep === 'summary' && <SummaryShareView />}
      </div>
    </main>
  )
}

export default App
