import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const STEPS = [
  { id: 1, label: 'Upload', desc: 'Arquivo e dados' },
  { id: 2, label: 'Revisão', desc: 'Layout detectado' },
  { id: 3, label: 'Contas', desc: 'Regras de conta' },
  { id: 4, label: 'Preview', desc: 'Validar resultado' },
];

export const WizardStepper = ({ currentStep }) => (
  <nav className="flex items-center justify-center gap-1 sm:gap-2 mb-8" data-testid="wizard-stepper">
    {STEPS.map((step, idx) => {
      const isCompleted = currentStep > step.id;
      const isCurrent = currentStep === step.id;
      return (
        <React.Fragment key={step.id}>
          {idx > 0 && (
            <div className={cn(
              'h-px w-6 sm:w-12 transition-colors',
              isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
            )} />
          )}
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all',
              isCompleted && 'bg-emerald-500 text-white',
              isCurrent && 'bg-slate-900 text-white ring-2 ring-slate-900/20',
              !isCompleted && !isCurrent && 'bg-slate-100 text-slate-400'
            )}>
              {isCompleted ? <Check className="w-4 h-4" /> : step.id}
            </div>
            <div className="hidden sm:block">
              <p className={cn(
                'text-sm font-semibold leading-tight',
                isCurrent ? 'text-slate-900' : 'text-slate-400'
              )}>{step.label}</p>
              <p className="text-xs text-slate-400">{step.desc}</p>
            </div>
          </div>
        </React.Fragment>
      );
    })}
  </nav>
);

export default WizardStepper;
