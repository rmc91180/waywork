"use client";

import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "@/hooks/use-listing-form";

interface WizardStepsProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function WizardSteps({ currentStep, onStepClick }: WizardStepsProps) {
  return (
    <nav className="mb-8">
      <ol className="flex items-center gap-2 overflow-x-auto pb-2">
        {WIZARD_STEPS.map((step, index) => (
          <li key={step.id} className="flex items-center">
            <button
              onClick={() => onStepClick(index)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                index === currentStep
                  ? "bg-blue-600 text-white"
                  : index < currentStep
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  index === currentStep
                    ? "bg-white text-blue-600"
                    : index < currentStep
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-600"
                )}
              >
                {index < currentStep ? "\u2713" : index + 1}
              </span>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
            {index < WIZARD_STEPS.length - 1 && (
              <div className="mx-1 h-px w-4 bg-gray-300" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
