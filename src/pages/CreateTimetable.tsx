import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, handleApiError } from '../utils/api';

// Step components (will be created separately)
const Step1Sections = React.lazy(() => import('../components/wizard/Step1Sections'));
const Step2Teachers = React.lazy(() => import('../components/wizard/Step2Teachers'));
const Step3Courses = React.lazy(() => import('../components/wizard/Step3Courses'));
const Step4Classrooms = React.lazy(() => import('../components/wizard/Step4Classrooms'));
const Step5Assignments = React.lazy(() => import('../components/wizard/Step5Assignments'));
const Step6Rules = React.lazy(() => import('../components/wizard/Step6Rules'));
const Step7Review = React.lazy(() => import('../components/wizard/Step7Review'));

interface WizardData {
  sections: any[];
  teachers: any[];
  courses: any[];
  classrooms: any[];
  assignments: any[];
  rules: any[];
  timetableName: string;
}

interface StepInfo {
  id: number;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  completed: boolean;
  canProceed: boolean;
}

const CreateTimetable: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    sections: [],
    teachers: [],
    courses: [],
    classrooms: [],
    assignments: [],
    rules: [],
    timetableName: ''
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Step definitions
  const steps: StepInfo[] = [
    {
      id: 1,
      title: 'Sections',
      description: 'Add class sections',
      component: Step1Sections,
      completed: wizardData.sections.length > 0,
      canProceed: wizardData.sections.length > 0
    },
    {
      id: 2,
      title: 'Teachers',
      description: 'Configure teachers and availability',
      component: Step2Teachers,
      completed: wizardData.teachers.length > 0,
      canProceed: wizardData.teachers.length > 0
    },
    {
      id: 3,
      title: 'Courses',
      description: 'Define courses and labs',
      component: Step3Courses,
      completed: wizardData.courses.length > 0,
      canProceed: wizardData.courses.length > 0
    },
    {
      id: 4,
      title: 'Classrooms',
      description: 'Set up classroom details',
      component: Step4Classrooms,
      completed: wizardData.classrooms.length > 0,
      canProceed: wizardData.classrooms.length > 0
    },
    {
      id: 5,
      title: 'Assignments',
      description: 'Create course assignments',
      component: Step5Assignments,
      completed: wizardData.assignments.length > 0,
      canProceed: wizardData.assignments.length > 0
    },
    {
      id: 6,
      title: 'Rules',
      description: 'Configure scheduling rules',
      component: Step6Rules,
      completed: wizardData.rules.length > 0,
      canProceed: true // Rules are optional
    },
    {
      id: 7,
      title: 'Review',
      description: 'Review and generate timetable',
      component: Step7Review,
      completed: wizardData.timetableName.length > 0,
      canProceed: wizardData.timetableName.length > 0
    }
  ];

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges) {
      const autoSaveTimer = setTimeout(() => {
        autoSave();
      }, 5000); // Auto-save after 5 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [wizardData, hasUnsavedChanges, autoSave]);

  const loadSavedData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(`timetable_wizard_${user?.id}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setWizardData(parsed.data || wizardData);
        setCurrentStep(parsed.currentStep || 1);
      }
    } catch (error) {
      console.error('Failed to load saved wizard data:', error);
    }
  }, [user?.id, wizardData]);

  // Load saved data on component mount
  useEffect(() => {
    loadSavedData();
  }, [loadSavedData]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      const saveData = {
        data: wizardData,
        currentStep,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`timetable_wizard_${user?.id}`, JSON.stringify(saveData));
      setHasUnsavedChanges(false);
      
      // Show brief success message
      setSuccessMessage('Progress saved');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [wizardData, currentStep, hasUnsavedChanges, user?.id]);

  const updateWizardData = (stepData: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
    setHasUnsavedChanges(true);
    setError('');
  };

  const handleStepSubmit = async (stepData: any) => {
    setIsLoading(true);
    setError('');

    try {
      let apiCall;
      let dataUpdate: Partial<WizardData> = {};

      switch (currentStep) {
        case 1:
          apiCall = api.dept.createSections({ sections: stepData });
          dataUpdate = { sections: stepData };
          break;
        case 2:
          apiCall = api.dept.createTeachers({ teachers: stepData });
          dataUpdate = { teachers: stepData };
          break;
        case 3:
          apiCall = api.dept.createCourses({ courses: stepData });
          dataUpdate = { courses: stepData };
          break;
        case 4:
          apiCall = api.dept.createClassrooms({ classrooms: stepData });
          dataUpdate = { classrooms: stepData };
          break;
        case 5:
          apiCall = api.dept.createAssignments({ assignments: stepData });
          dataUpdate = { assignments: stepData };
          break;
        case 6:
          apiCall = api.dept.createRules({ rules: stepData });
          dataUpdate = { rules: stepData };
          break;
        case 7:
          apiCall = api.dept.createTimetable({ timetable_name: stepData.timetableName });
          dataUpdate = { timetableName: stepData.timetableName };
          break;
        default:
          throw new Error('Invalid step');
      }

      const response = await apiCall;

      if (response.data.success) {
        updateWizardData(dataUpdate);
        
        if (currentStep === 7) {
          // Timetable generation started, redirect to results
          const timetableId = response.data.data?.timetable_id;
          if (timetableId) {
            // Clear saved wizard data
            localStorage.removeItem(`timetable_wizard_${user?.id}`);
            navigate(`/dept/results/${timetableId}`);
            return;
          }
        }

        // Move to next step
        if (currentStep < steps.length) {
          setCurrentStep(prev => prev + 1);
        }
      } else {
        setError(response.data.message || 'Failed to save step data');
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const goToStep = (stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > steps.length) return;
    
    // Check if we can navigate to this step
    const targetStep = steps.find(s => s.id === stepNumber);
    if (!targetStep) return;

    // For forward navigation, ensure previous steps are completed
    if (stepNumber > currentStep) {
      for (let i = 1; i < stepNumber; i++) {
        const step = steps.find(s => s.id === i);
        if (step && !step.canProceed) {
          setError(`Please complete step ${i}: ${step.title} before proceeding`);
          return;
        }
      }
    }

    setCurrentStep(stepNumber);
    setError('');
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError('');
    }
  };

  const goToNextStep = () => {
    const currentStepInfo = steps.find(s => s.id === currentStep);
    if (currentStepInfo && currentStepInfo.canProceed && currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
      setError('');
    }
  };

  const handleExit = () => {
    if (hasUnsavedChanges) {
      const confirmExit = window.confirm(
        'You have unsaved changes. Are you sure you want to exit? Your progress will be saved automatically.'
      );
      if (!confirmExit) return;
      
      autoSave();
    }
    navigate('/dept/dashboard');
  };

  const clearWizardData = () => {
    const confirmClear = window.confirm(
      'Are you sure you want to clear all wizard data? This action cannot be undone.'
    );
    
    if (confirmClear) {
      setWizardData({
        sections: [],
        teachers: [],
        courses: [],
        classrooms: [],
        assignments: [],
        rules: [],
        timetableName: ''
      });
      setCurrentStep(1);
      setHasUnsavedChanges(false);
      localStorage.removeItem(`timetable_wizard_${user?.id}`);
      setSuccessMessage('Wizard data cleared');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const getStepProgress = () => {
    const completedSteps = steps.filter(step => step.completed).length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  const currentStepInfo = steps.find(s => s.id === currentStep);
  const CurrentStepComponent = currentStepInfo?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Timetable</h1>
              <p className="text-sm text-gray-500 mt-1">
                {user?.department} Department | Step {currentStep} of {steps.length}: {currentStepInfo?.title}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Auto-save indicator */}
              {isSaving && (
                <div className="flex items-center text-sm text-gray-500">
                  <div className="spinner h-4 w-4 mr-2"></div>
                  Saving...
                </div>
              )}
              
              {/* Exit button */}
              <button
                onClick={handleExit}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Logout button */}
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-700">
              Progress: {getStepProgress()}% Complete
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {hasUnsavedChanges && (
                <span className="text-yellow-600">• Unsaved changes</span>
              )}
              <button
                onClick={clearWizardData}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Clear All Data
              </button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="progress-bar bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getStepProgress()}%` }}
            ></div>
          </div>

          {/* Step indicators */}
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                <button
                  onClick={() => goToStep(step.id)}
                  disabled={step.id > currentStep && !step.canProceed}
                  className={`step-indicator w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step.id === currentStep
                      ? 'bg-primary-600 text-white active'
                      : step.completed
                      ? 'bg-green-500 text-white completed'
                      : step.id < currentStep
                      ? 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                      : 'bg-gray-200 text-gray-400'
                  } ${
                    step.id <= currentStep || step.canProceed
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed'
                  }`}
                >
                  {step.completed ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </button>
                <div className="mt-2 text-center">
                  <div className="text-xs font-medium text-gray-900">{step.title}</div>
                  <div className="text-xs text-gray-500 max-w-20 truncate">{step.description}</div>
                </div>
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute mt-5 h-0.5 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    style={{
                      left: `${((index + 1) / steps.length) * 100}%`,
                      width: `${(1 / steps.length) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-slide-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 animate-slide-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Step {currentStep}: {currentStepInfo?.title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {currentStepInfo?.description}
            </p>
          </div>

          <div className="p-6">
            {/* Step Component */}
            {CurrentStepComponent && (
              <React.Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="spinner h-8 w-8 text-primary-600"></div>
                  <span className="ml-3 text-gray-600">Loading step...</span>
                </div>
              }>
                <CurrentStepComponent
                  data={wizardData}
                  onSubmit={handleStepSubmit}
                  onDataChange={updateWizardData}
                  isLoading={isLoading}
                />
              </React.Suspense>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={goToPreviousStep}
              disabled={currentStep === 1}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Step {currentStep} of {steps.length}
              </span>
              
              {currentStep < steps.length && (
                <button
                  onClick={goToNextStep}
                  disabled={!currentStepInfo?.canProceed}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Step-by-Step Guide</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p className="mb-2">Follow these steps to create your optimized timetable:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Sections:</strong> Add all class sections for your department</li>
                  <li><strong>Teachers:</strong> Configure teacher details and availability constraints</li>
                  <li><strong>Courses:</strong> Define courses, labs, and their requirements</li>
                  <li><strong>Classrooms:</strong> Set up available rooms with capacity and type</li>
                  <li><strong>Assignments:</strong> Link courses with teachers and sections</li>
                  <li><strong>Rules:</b> Add scheduling constraints and preferences (optional)</li>
                  <li><strong>Review:</strong> Review all data and generate your timetable</li>
                </ul>
                <p className="mt-2 text-xs">
                  💡 Your progress is automatically saved every 5 seconds. You can exit and return anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTimetable;