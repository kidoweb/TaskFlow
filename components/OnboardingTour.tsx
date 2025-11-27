import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface TourStep {
  id: string;
  target: string; // CSS selector или 'center'
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  steps: TourStep[];
  onComplete?: () => void;
  storageKey?: string;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  steps,
  onComplete,
  storageKey = 'taskflow-onboarding-completed'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Проверяем, был ли тур уже пройден
    const completed = localStorage.getItem(storageKey);
    if (!completed && steps.length > 0) {
      setIsVisible(true);
      updateOverlay();
    }
  }, [storageKey, steps.length]);

  useEffect(() => {
    if (isVisible) {
      updateOverlay();
      window.addEventListener('scroll', updateOverlay);
      window.addEventListener('resize', updateOverlay);
      return () => {
        window.removeEventListener('scroll', updateOverlay);
        window.removeEventListener('resize', updateOverlay);
      };
    }
  }, [isVisible, currentStep]);

  const updateOverlay = () => {
    if (!isVisible || currentStep >= steps.length) return;

    const step = steps[currentStep];
    
    if (step.target === 'center') {
      setOverlayStyle({});
      return;
    }

    const element = document.querySelector(step.target);
    if (!element) {
      // Если элемент не найден, показываем в центре
      setOverlayStyle({});
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = 8;

    setOverlayStyle({
      clipPath: `polygon(
        0% 0%,
        0% 100%,
        ${rect.left - padding}px 100%,
        ${rect.left - padding}px ${rect.top - padding}px,
        ${rect.right + padding}px ${rect.top - padding}px,
        ${rect.right + padding}px ${rect.bottom + padding}px,
        ${rect.left - padding}px ${rect.bottom + padding}px,
        ${rect.left - padding}px 100%,
        100% 100%,
        100% 0%
      )`
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
    if (onComplete) {
      onComplete();
    }
  };

  if (!isVisible || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const element = step.target !== 'center' ? document.querySelector(step.target) : null;
  const rect = element?.getBoundingClientRect();

  let tooltipStyle: React.CSSProperties = {};
  let position = step.position || 'bottom';

  if (element && rect) {
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const padding = 16;

    switch (position) {
      case 'top':
        tooltipStyle = {
          top: `${rect.top + window.scrollY - tooltipHeight - padding}px`,
          left: `${rect.left + window.scrollX + (rect.width - tooltipWidth) / 2}px`,
        };
        break;
      case 'bottom':
        tooltipStyle = {
          top: `${rect.bottom + window.scrollY + padding}px`,
          left: `${rect.left + window.scrollX + (rect.width - tooltipWidth) / 2}px`,
        };
        break;
      case 'left':
        tooltipStyle = {
          top: `${rect.top + window.scrollY + (rect.height - tooltipHeight) / 2}px`,
          left: `${rect.left + window.scrollX - tooltipWidth - padding}px`,
        };
        break;
      case 'right':
        tooltipStyle = {
          top: `${rect.top + window.scrollY + (rect.height - tooltipHeight) / 2}px`,
          left: `${rect.right + window.scrollX + padding}px`,
        };
        break;
    }

    // Проверка границ экрана
    if (tooltipStyle.left !== undefined && tooltipStyle.left < padding) {
      tooltipStyle.left = padding;
    }
    if (tooltipStyle.top !== undefined && tooltipStyle.top < padding) {
      tooltipStyle.top = rect.bottom + window.scrollY + padding;
      position = 'bottom';
    }
  } else {
    // Центрируем, если элемент не найден
    tooltipStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        style={overlayStyle}
        onClick={handleNext}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          "fixed z-50 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in",
          position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={tooltipStyle}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Шаг {currentStep + 1} из {steps.length}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {step.content}
          </p>

          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                currentStep === 0
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
              type="button"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад
            </button>

            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index === currentStep
                      ? "bg-blue-600 dark:bg-blue-400"
                      : "bg-slate-300 dark:bg-slate-600"
                  )}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              type="button"
            >
              {currentStep === steps.length - 1 ? 'Завершить' : 'Далее'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

