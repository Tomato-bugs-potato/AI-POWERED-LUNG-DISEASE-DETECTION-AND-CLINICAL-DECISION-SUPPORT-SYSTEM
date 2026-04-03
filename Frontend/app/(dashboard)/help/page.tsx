'use client';

import * as React from 'react';
import Link from 'next/link';
import { HelpCircle, BookOpen, Keyboard, Upload, Stethoscope, ClipboardList, ArrowRight } from 'lucide-react';

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store';
import { Role } from '@/types';

// ─── Data ────────────────────────────────────────────────────────────────────

const radiologistSteps = [
  {
    step: 1,
    icon: <Upload className="h-5 w-5 text-blue-500" />,
    title: 'Upload X-ray',
    description:
      'Navigate to the Upload page. Select a patient record and upload a DICOM or JPEG/PNG chest X-ray image. The system validates the file and creates a new case.',
  },
  {
    step: 2,
    icon: <HelpCircle className="h-5 w-5 text-purple-500" />,
    title: 'AI Analysis',
    description:
      'Once uploaded, the AI model automatically analyses the image. Within seconds you will see a prediction (Pneumonia, TB, Lung Tumor, or Normal) along with a confidence score and a Grad-CAM heatmap highlighting the regions of interest.',
  },
  {
    step: 3,
    icon: <ClipboardList className="h-5 w-5 text-orange-500" />,
    title: 'Review Findings',
    description:
      'Open the case detail page to review the AI output alongside the original image. Adjust the confidence threshold slider if needed, add clinical observations, and mark the review as complete.',
  },
  {
    step: 4,
    icon: <ArrowRight className="h-5 w-5 text-green-500" />,
    title: 'Forward to Doctor',
    description:
      'When satisfied with the review, forward the case to a doctor. The case status changes to "Ready for Diagnosis" and it appears in the doctor\'s queue automatically.',
  },
];

const doctorSteps = [
  {
    step: 1,
    icon: <ClipboardList className="h-5 w-5 text-blue-500" />,
    title: 'Review Case',
    description:
      'Cases forwarded by radiologists appear in your dashboard under "Needs Diagnosis". Open a case to view the X-ray image, AI prediction, confidence score, and the radiologist\'s clinical notes.',
  },
  {
    step: 2,
    icon: <Stethoscope className="h-5 w-5 text-purple-500" />,
    title: 'Perform Diagnosis',
    description:
      'Using the AI findings as a decision-support tool, enter your official diagnosis, select the diagnosis type and severity, and record any additional clinical observations in the free-text field.',
  },
  {
    step: 3,
    icon: <BookOpen className="h-5 w-5 text-green-500" />,
    title: 'Generate Report',
    description:
      'Click "Generate Report" to create a structured PDF report. The report includes the image, AI analysis, your diagnosis, and treatment recommendations. It can be downloaded or shared with the patient record.',
  },
];

const faqs = [
  {
    id: 'faq-upload',
    question: 'How do I upload an X-ray image?',
    answer:
      'Go to the Upload page from the sidebar. Select or create a patient record, then drag-and-drop or browse for a DICOM (.dcm), JPEG, or PNG file. The file must be a chest X-ray and under 50 MB. After uploading, the system creates a case and the AI analysis begins automatically — you will see results within a few seconds.',
  },
  {
    id: 'faq-ai-detects',
    question: 'What conditions can the AI detect?',
    answer:
      'LungDetect AI is trained to identify three primary lung conditions: Pneumonia (including bacterial and viral variants), Tuberculosis (TB), and Lung Tumors (both benign and potentially malignant masses). It also outputs a "Normal" classification when no significant abnormality is detected. The AI provides a probability score for each class and a Grad-CAM heatmap showing which areas of the lung influenced the prediction.',
  },
  {
    id: 'faq-confidence',
    question: 'How do confidence scores work?',
    answer:
      'The confidence score (0–100%) represents the model\'s certainty for its top prediction. A score above 85% is generally considered high confidence. You can use the confidence threshold slider on the case detail page to filter or flag predictions that fall below a threshold you set. Scores between 50–85% should be reviewed with extra clinical scrutiny. The AI is a decision-support tool — always apply clinical judgement alongside the score.',
  },
  {
    id: 'faq-after-diagnosis',
    question: 'What happens after a diagnosis is submitted?',
    answer:
      'Once a doctor submits a diagnosis, the case status changes to "Diagnosed". A structured report is generated and attached to the case. The patient record is updated automatically. Reports can be downloaded as PDF from the case detail page. Completed cases remain searchable in the case history for audit and follow-up purposes.',
  },
  {
    id: 'faq-export',
    question: 'How do I export data and reports?',
    answer:
      'Individual case reports can be downloaded as PDF from the case detail page using the "Export Report" button. Radiologists and doctors can also export a CSV summary of all cases from the Cases list page by clicking the export icon in the table toolbar. Admin users have access to bulk data export and audit logs from the Admin panel.',
  },
  {
    id: 'faq-roles',
    question: 'What is the difference between a Radiologist and a Doctor in this system?',
    answer:
      'Radiologists are responsible for uploading X-ray images, reviewing AI output, and forwarding cases to doctors. Doctors receive cases that have been reviewed and use the AI findings as a decision-support aid to produce an official diagnosis and generate clinical reports. Each role has a separate dashboard tailored to their workflow.',
  },
];

const shortcuts = [
  { keys: 'Tab', action: 'Move to next field or interactive element' },
  { keys: 'Shift + Tab', action: 'Move to previous field or interactive element' },
  { keys: 'Enter / Space', action: 'Activate focused button, link, or accordion item' },
  { keys: 'Esc', action: 'Close an open dialog or dropdown' },
  { keys: 'Arrow Keys', action: 'Navigate within radio groups, select menus, and tab lists' },
  { keys: '/ (Slash)', action: 'Focus the search input (where available)' },
  { keys: 'Ctrl + S', action: 'Save form progress where auto-save is not active' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-8">
      <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function WorkflowStep({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-sm flex-shrink-0">
          {step}
        </div>
        <div className="w-px flex-1 bg-gray-200 dark:bg-zinc-700 mt-2 mb-0" />
      </div>
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="font-bold text-gray-900 dark:text-white text-[15px]">{title}</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const { user } = useAuthStore();
   const isDoctor = user?.role === Role.Doctor;

  // Determine which workflow section appears first based on role
  const radiologistSection = (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
        Radiologist Workflow
      </h3>
      <div>
        {radiologistSteps.map((s, i) => (
          <WorkflowStep
            key={s.step}
            step={s.step}
            icon={s.icon}
            title={s.title}
            description={s.description}
          />
        ))}
      </div>
    </div>
  );

  const doctorSection = (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
        Doctor Workflow
      </h3>
      <div>
        {doctorSteps.map((s) => (
          <WorkflowStep
            key={s.step}
            step={s.step}
            icon={s.icon}
            title={s.title}
            description={s.description}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Help &amp; Support
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Guides, frequently asked questions, and keyboard shortcuts for LungDetect AI.
        </p>
      </div>

      {/* ── Section 1: Getting Started ── */}
      <Card aria-labelledby="getting-started-title" className='bg-white'>
        <CardHeader>
          <CardTitle id="getting-started-title" className="sr-only">
            Getting Started
          </CardTitle>
          <SectionHeader
            icon={<BookOpen className="h-5 w-5 text-blue-600" aria-hidden="true" />}
            title="Getting Started"
            description="Step-by-step guides for each clinical role."
          />
        </CardHeader>
        <CardContent className="pt-0 p-8 sm:p-10">
          <div className="space-y-8">
            {/* Show role-specific workflow first */}
            {isDoctor ? (
              <>
                {doctorSection}
                <div className="border-t border-border pt-6">{radiologistSection}</div>
              </>
            ) : (
              <>
                {radiologistSection}
                <div className="border-t border-border pt-6">{doctorSection}</div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: FAQ ── */}
      <Card aria-labelledby="faq-title" className='bg-white'>
        <CardHeader>
          <CardTitle id="faq-title" className="sr-only">
            Frequently Asked Questions
          </CardTitle>
          <SectionHeader
            icon={<HelpCircle className="h-5 w-5 text-blue-600" aria-hidden="true" />}
            title="Frequently Asked Questions"
            description="Answers to the most common questions about the platform."
          />
        </CardHeader>
        <CardContent className="pt-0 p-8 sm:p-10">
          <Accordion type="multiple" aria-label="Frequently asked questions">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger
                  aria-label={`Expand answer: ${faq.question}`}
                  className="text-left text-sm font-medium text-gray-900 dark:text-white"
                >
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* ── Section 3: Keyboard Shortcuts ── */}
      <Card aria-labelledby="shortcuts-title" className='bg-white'>
        <CardHeader>
          <CardTitle id="shortcuts-title" className="sr-only">
            Keyboard Shortcuts
          </CardTitle>
          <SectionHeader
            icon={<Keyboard className="h-5 w-5 text-blue-600" aria-hidden="true" />}
            title="Keyboard Shortcuts"
            description="Speed up common actions without leaving the keyboard."
          />
        </CardHeader>
        <CardContent className="pt-0 p-8 sm:p-10">
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              aria-label="Keyboard shortcuts reference table"
            >
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="text-left py-2 pr-6 font-semibold text-gray-700 dark:text-gray-300 w-48"
                  >
                    Shortcut
                  </th>
                  <th
                    scope="col"
                    className="text-left py-2 font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shortcuts.map((s) => (
                  <tr key={s.keys} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-4 pr-6">
                      <kbd
                        className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-zinc-600 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 font-mono text-xs text-gray-700 dark:text-gray-300"
                        aria-label={`Keyboard shortcut: ${s.keys}`}
                      >
                        {s.keys}
                      </kbd>
                    </td>
                    <td className="py-4 text-slate-600 dark:text-gray-400 font-medium">{s.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-4">
        Still need help?{' '}
        <Link
          href="mailto:support@lungdetect.ai"
          className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label="Email support team"
        >
          Contact our support team
        </Link>
        .
      </p>
    </div>
  );
}
