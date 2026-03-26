'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Upload, Stethoscope, HelpCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';
import { Role } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'onboarding_completed';
const TOTAL_STEPS = 3;

// ─── Step content helpers ────────────────────────────────────────────────────

function getStepContent(step: number, role: Role | undefined) {
  const isRadiologist = role === Role.Radiologist;
  const isDoctor = role === Role.Doctor;

  if (step === 1) {
    return {
      icon: <HelpCircle className="h-10 w-10 text-blue-500" aria-hidden="true" />,
      title: 'Welcome to LungDetect AI',
      body: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            LungDetect AI is an AI-powered clinical decision-support system designed to assist
            medical professionals in detecting lung diseases from chest X-ray images.
          </p>
          {role && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 px-4 py-3">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {isRadiologist && 'You are signed in as a Radiologist.'}
                {isDoctor && 'You are signed in as a Doctor.'}
                {role === Role.Admin && 'You are signed in as an Administrator.'}
                {role === Role.Lab_Technician && 'You are signed in as a Lab Technician.'}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                {isRadiologist &&
                  'Your role focuses on uploading X-rays and reviewing AI-generated findings.'}
                {isDoctor &&
                  'Your role focuses on diagnosing cases forwarded by radiologists and generating reports.'}
                {role === Role.Admin &&
                  'You have access to user management, audit logs, and system configuration.'}
                {role === Role.Lab_Technician &&
                  'You can view assigned cases and upload supporting lab data.'}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed">
            The platform uses a deep learning model to analyse chest X-rays and detect Pneumonia,
            Tuberculosis, and Lung Tumors — always as a decision-support aid, not a replacement for
            clinical judgement.
          </p>
        </div>
      ),
    };
  }

  if (step === 2) {
    if (isDoctor) {
      return {
        icon: <Stethoscope className="h-10 w-10 text-purple-500" aria-hidden="true" />,
        title: 'Your Diagnosis Workflow',
        body: (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              As a doctor, your workflow focuses on reviewing cases prepared by radiologists and
              producing official clinical diagnoses.
            </p>
            <ol className="space-y-3" aria-label="Doctor workflow steps">
              {[
                {
                  num: 1,
                  title: 'Check Your Queue',
                  desc: 'Your dashboard lists all cases that have been reviewed and forwarded by a radiologist, ready for your diagnosis.',
                },
                {
                  num: 2,
                  title: 'Review AI Findings',
                  desc: 'Each case shows the original X-ray, the AI prediction, confidence score, and the radiologist\'s observations. Use these to support your clinical assessment.',
                },
                {
                  num: 3,
                  title: 'Submit Diagnosis',
                  desc: 'Record your official diagnosis, severity, and any clinical notes. The case is then marked as diagnosed.',
                },
                {
                  num: 4,
                  title: 'Generate Report',
                  desc: 'Generate a structured PDF report to attach to the patient record or share with relevant stakeholders.',
                },
              ].map((item) => (
                <li key={item.num} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold text-xs">
                    {item.num}
                  </span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{item.title}: </span>
                    <span className="text-muted-foreground">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ),
      };
    }

    // Default to Radiologist workflow for all other roles
    return {
      icon: <Upload className="h-10 w-10 text-blue-500" aria-hidden="true" />,
      title: 'Your Radiologist Workflow',
      body: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            As a radiologist, your workflow starts with uploading X-rays and reviewing the AI output
            before forwarding cases to doctors.
          </p>
          <ol className="space-y-3" aria-label="Radiologist workflow steps">
            {[
              {
                num: 1,
                title: 'Upload X-ray',
                desc: 'Use the Upload page to select a patient and upload a chest X-ray image (DICOM, JPEG, or PNG).',
              },
              {
                num: 2,
                title: 'AI Analysis',
                desc: 'The AI automatically analyses the image. Within seconds you see a prediction with a confidence score and a Grad-CAM heatmap.',
              },
              {
                num: 3,
                title: 'Review Findings',
                desc: 'Open the case detail page to review the AI output. Adjust the confidence threshold, add your clinical observations, and mark the review complete.',
              },
              {
                num: 4,
                title: 'Forward to Doctor',
                desc: 'When satisfied, forward the case. It immediately appears in the doctor\'s diagnosis queue.',
              },
            ].map((item) => (
              <li key={item.num} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs">
                  {item.num}
                </span>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{item.title}: </span>
                  <span className="text-muted-foreground">{item.desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ),
    };
  }

  // Step 3 — You're all set
  return {
    icon: <CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden="true" />,
    title: "You're all set!",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          You know the basics — now you can start using LungDetect AI. Here are a few tips to help
          you get the most out of the platform:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside leading-relaxed">
          <li>Use the sidebar to navigate between your dashboard, cases, and patient records.</li>
          <li>Refer to the Help page any time you have a question about how things work.</li>
          <li>The AI confidence score is a guide — always apply your clinical expertise.</li>
        </ul>
        <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 px-4 py-3 mt-2">
          <p className="text-sm text-green-800 dark:text-green-300">
            Visit the{' '}
            <Link
              href="/help"
              className="font-semibold underline hover:text-green-600 dark:hover:text-green-200 transition-colors"
              aria-label="Visit the Help and Support page"
            >
              Help &amp; Support page
            </Link>{' '}
            for detailed guides, FAQs, and keyboard shortcuts whenever you need them.
          </p>
        </div>
      </div>
    ),
  };
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="tablist"
      aria-label={`Tour progress: step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          role="tab"
          aria-selected={n === current}
          aria-label={`Step ${n} of ${total}`}
          className={`h-2 rounded-full transition-all duration-200 ${
            n === current
              ? 'w-6 bg-blue-600 dark:bg-blue-400'
              : 'w-2 bg-gray-300 dark:bg-zinc-600'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OnboardingTour() {
  const { user } = useAuthStore();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(1);

  // Only attempt to read localStorage on the client
  React.useEffect(() => {
    if (!user) return;
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setStep(1);
      setOpen(true);
    }
  }, [user]);

  const handleComplete = React.useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  }, []);

  const handleSkip = React.useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  }, []);

  const handleNext = React.useCallback(() => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      handleComplete();
    }
  }, [step, handleComplete]);

  const handlePrev = React.useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  }, [step]);

  // Do not render anything if there is no logged-in user
  if (!user) return null;

  const { icon, title, body } = getStepContent(step, user.role);
  const isLastStep = step === TOTAL_STEPS;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Treat dialog close (via the X button) the same as skip
        if (!isOpen) handleSkip();
      }}
    >
      <DialogContent
        className="sm:max-w-md bg-white"
        aria-label="Onboarding tour"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex justify-center mb-4" aria-hidden="true">
            {icon}
          </div>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Onboarding tour, step {step} of {TOTAL_STEPS}: {title}
          </DialogDescription>
        </DialogHeader>

        {/* Step body */}
        <div className="py-2">{body}</div>

        {/* Step dots */}
        <div className="py-1">
          <StepDots current={step} total={TOTAL_STEPS} />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2 transition-colors self-center sm:self-auto"
            aria-label="Skip the onboarding tour"
          >
            Skip tour
          </button>

          <div className="flex gap-2 justify-end">
            {step > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                aria-label="Go to previous tour step"
              >
                Previous
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              aria-label={isLastStep ? 'Finish onboarding tour' : 'Go to next tour step'}
            >
              {isLastStep ? 'Finish' : 'Next'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
