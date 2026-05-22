import type { AppStep } from '../types'

const steps: Array<{ id: AppStep; label: string }> = [
  { id: 'upload', label: 'Upload' },
  { id: 'review', label: 'Review' },
  { id: 'assign', label: 'Assign' },
  { id: 'summary', label: 'Summary' },
]

interface ProgressStepsProps {
  currentStep: AppStep
}

export function ProgressSteps({ currentStep }: ProgressStepsProps) {
  const activeIndex = steps.findIndex((step) => step.id === currentStep)

  return (
    <nav aria-label="Receipt workflow" className="grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep
        const isComplete = index < activeIndex

        return (
          <div
            className={`h-2 rounded-full ${isActive || isComplete ? 'bg-slate-950' : 'bg-slate-200'}`}
            key={step.id}
            title={step.label}
          />
        )
      })}
    </nav>
  )
}
