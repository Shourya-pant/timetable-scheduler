import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, handleApiError } from '../utils/api';
import Header from '../components/Header';

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
  const [isNavigating, setIsNavigating] = useState(false);
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
          // Before generating timetable, ensure all data is saved
          await saveAllStepsData();
          apiCall = api.dept.createTimetable({ timetable_name: stepData.timetableName });
          dataUpdate = { timetableName: stepData.timetableName };
          break;
        default:
          throw new Error('Invalid step');
      }

      const response = await apiCall;

      if (response.data.success) {
        // Update wizard data with both the submitted data AND any returned data with IDs
        const responseData = response.data.data;
        let finalUpdate = dataUpdate;
        
        // If the API returned data with IDs, use that instead
        if (responseData) {
          switch (currentStep) {
            case 1:
              if (responseData.sections) finalUpdate = { sections: responseData.sections };
              break;
            case 2:
              if (responseData.teachers) finalUpdate = { teachers: responseData.teachers };
              break;
            case 3:
              if (responseData.courses) finalUpdate = { courses: responseData.courses };
              break;
            case 4:
              if (responseData.classrooms) finalUpdate = { classrooms: responseData.classrooms };
              break;
            case 5:
              if (responseData.assignments) finalUpdate = { assignments: responseData.assignments };
              break;
            case 6:
              if (responseData.rules) finalUpdate = { rules: responseData.rules };
              break;
          }
        }
        
        updateWizardData(finalUpdate);
        
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

    // Allow free navigation between all steps
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
    if (currentStep < steps.length) {
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

  const saveAllStepsData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Save all step data in sequence to ensure database has complete data
      
      // Step 1: Sections
      if (wizardData.sections.length > 0) {
        const sectionsResponse = await api.dept.createSections({ sections: wizardData.sections });
        if (!sectionsResponse.data.success) {
          throw new Error(`Failed to save sections: ${sectionsResponse.data.message}`);
        }
      }

      // Step 2: Teachers
      if (wizardData.teachers.length > 0) {
        const teachersResponse = await api.dept.createTeachers({ teachers: wizardData.teachers });
        if (!teachersResponse.data.success) {
          throw new Error(`Failed to save teachers: ${teachersResponse.data.message}`);
        }
      }

      // Step 3: Courses
      if (wizardData.courses.length > 0) {
        const coursesResponse = await api.dept.createCourses({ courses: wizardData.courses });
        if (!coursesResponse.data.success) {
          throw new Error(`Failed to save courses: ${coursesResponse.data.message}`);
        }
      }

      // Step 4: Classrooms
      if (wizardData.classrooms.length > 0) {
        const classroomsResponse = await api.dept.createClassrooms({ classrooms: wizardData.classrooms });
        if (!classroomsResponse.data.success) {
          throw new Error(`Failed to save classrooms: ${classroomsResponse.data.message}`);
        }
      }

      // Step 5: Assignments
      if (wizardData.assignments.length > 0) {
        const assignmentsResponse = await api.dept.createAssignments({ assignments: wizardData.assignments });
        if (!assignmentsResponse.data.success) {
          throw new Error(`Failed to save assignments: ${assignmentsResponse.data.message}`);
        }
      }

      // Step 6: Rules (optional)
      if (wizardData.rules.length > 0) {
        const rulesResponse = await api.dept.createRules({ rules: wizardData.rules });
        if (!rulesResponse.data.success) {
          throw new Error(`Failed to save rules: ${rulesResponse.data.message}`);
        }
      }

      console.log('All wizard data saved successfully');
      
    } catch (error) {
      console.error('Error saving wizard data:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const populateWithSampleData = () => {
    const sampleData: WizardData = {
      sections: [
        { code: "CS-A", department: user?.department || "Computer Science" },
        { code: "CS-B", department: user?.department || "Computer Science" },
        { code: "CS-C", department: user?.department || "Computer Science" }
      ],
      teachers: [
        { 
          name: "Dr. John Smith", 
          department: user?.department || "Computer Science",
          max_hours_per_day: 8,
          availability: "MTWRF",
          days_off: ""
        },
        { 
          name: "Prof. Jane Doe", 
          department: user?.department || "Computer Science",
          max_hours_per_day: 6,
          availability: "MTWRF", 
          days_off: "F"
        },
        { 
          name: "Dr. Alice Johnson", 
          department: user?.department || "Computer Science",
          max_hours_per_day: 7,
          availability: "MTWRF",
          days_off: ""
        }
      ],
      courses: [
        {
          name: "Data Structures",
          course_type: "lecture",
          duration_minutes: 90,
          sessions_per_week: 3,
          room_type: "lecture",
          department: user?.department || "Computer Science"
        },
        {
          name: "Programming Lab",
          course_type: "lab",
          duration_minutes: 120,
          sessions_per_week: 2,
          room_type: "computer_lab",
          department: user?.department || "Computer Science"
        },
        {
          name: "Database Systems",
          course_type: "lecture",
          duration_minutes: 90,
          sessions_per_week: 2,
          room_type: "lecture",
          department: user?.department || "Computer Science"
        }
      ],
      classrooms: [
        {
          room_id: "LH-101",
          room_type: "lecture",
          capacity: 60,
          department: user?.department || "Computer Science"
        },
        {
          room_id: "LAB-201",
          room_type: "computer_lab",
          capacity: 30,
          department: user?.department || "Computer Science"
        },
        {
          room_id: "LH-102",
          room_type: "lecture", 
          capacity: 80,
          department: user?.department || "Computer Science"
        }
      ],
      assignments: [
        { course_id: 1, section_id: 1, teacher_id: 1 },
        { course_id: 2, section_id: 1, teacher_id: 2 },
        { course_id: 3, section_id: 2, teacher_id: 1 },
        { course_id: 1, section_id: 2, teacher_id: 3 },
        { course_id: 2, section_id: 3, teacher_id: 2 }
      ],
      rules: [],
      timetableName: `${user?.department || "CS"} Timetable ${new Date().toLocaleDateString()}`
    };

    setWizardData(sampleData);
    setHasUnsavedChanges(true);
    setSuccessMessage('Sample data loaded! You can now test timetable generation.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const generateTestTimetable = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Create a complete minimal dataset for testing
      const testData = {
        sections: [
          { code: "CS-A", department: user?.department || "Computer Science" },
          { code: "CS-B", department: user?.department || "Computer Science" }
        ],
        teachers: [
          { 
            name: "Dr. Test Teacher", 
            department: user?.department || "Computer Science",
            max_hours_per_day: 8,
            availability: [[true, true, true, true, true, true, true, true, true, true]],
            days_off: []
          }
        ],
        courses: [
          {
            name: "Test Course",
            course_type: "lecture" as const,
            duration_minutes: 90,
            sessions_per_week: 2,
            room_type: "lecture" as const,
            department: user?.department || "Computer Science"
          }
        ],
        classrooms: [
          {
            room_id: "TEST-101",
            room_type: "lecture" as const,
            capacity: 50,
            department: user?.department || "Computer Science"
          }
        ],
        assignments: [
          { course_id: 1, section_id: 1, teacher_id: 1 }
        ],
        rules: [],
        timetableName: `Test Timetable ${new Date().toLocaleTimeString()}`
      };

      // Save all data to backend
      await api.dept.createSections({ sections: testData.sections });
      await api.dept.createTeachers({ teachers: testData.teachers });
      await api.dept.createCourses({ courses: testData.courses });
      await api.dept.createClassrooms({ classrooms: testData.classrooms });
      await api.dept.createAssignments({ assignments: testData.assignments });

      // Generate timetable
      const timetableResponse = await api.dept.createTimetable({ 
        timetable_name: testData.timetableName 
      });

      if (timetableResponse.data.success) {
        const timetableId = timetableResponse.data.data?.timetable_id;
        if (timetableId) {
          navigate(`/dept/results/${timetableId}`);
          return;
        }
      }

      setError(timetableResponse.data.message || 'Failed to generate test timetable');
      
    } catch (error: any) {
      setError(error.message || 'Error generating test timetable');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Modern Header with Logo */}
      <Header 
        title="Create Timetable Wizard"
        subtitle={`${user?.department} Department | Step ${currentStep} of ${steps.length}: ${currentStepInfo?.title}`}
        showBackButton={true}
        backUrl="/dept/dashboard"
      />

      {/* Enhanced controls bar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Auto-save indicator */}
            {isSaving && (
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Auto-saving...
              </div>
            )}
            
            {/* Progress indicator */}
            <div className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
              Progress: {getStepProgress()}% Complete
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {hasUnsavedChanges && (
              <span className="text-amber-600 text-sm font-medium bg-amber-50 px-3 py-1 rounded-full">
                • Unsaved changes
              </span>
            )}
            <button
              onClick={populateWithSampleData}
              className="text-green-600 hover:text-green-700 font-medium bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md transition-colors"
            >
              Load Sample Data
            </button>
            <button
              onClick={generateTestTimetable}
              disabled={isLoading}
              className="text-purple-600 hover:text-purple-700 font-medium bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-md transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Generating...' : 'Quick Test Generate'}
            </button>
            <button
              onClick={clearWizardData}
              className="text-red-600 hover:text-red-700 font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handleExit}
              className="text-gray-600 hover:text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md transition-colors"
            >
              Exit Wizard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Progress Indicator */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Timetable Creation Progress
            </h3>
            
            {/* Enhanced Progress bar */}
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3 mb-6 shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${getStepProgress()}%` }}
                ></div>
              </div>
              <div className="absolute -top-1 left-0 text-xs font-medium text-blue-600" style={{ left: `${getStepProgress()}%`, transform: 'translateX(-50%)' }}>
                {getStepProgress()}%
              </div>
            </div>
          </div>

          {/* Enhanced Step indicators */}
          <div className="relative">
            <div className="flex justify-between items-start">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center relative group">
                  <button
                    onClick={() => goToStep(step.id)}
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 transform hover:scale-110 ${
                      step.id === currentStep
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg ring-4 ring-blue-200'
                        : step.completed
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300 shadow-sm cursor-pointer'
                    }`}
                  >
                    {step.completed ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </button>
                  
                  <div className="mt-3 text-center max-w-20">
                    <div className={`text-xs font-semibold ${
                      step.id === currentStep ? 'text-blue-600' : 
                      step.completed ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 leading-tight">
                      {step.description}
                    </div>
                  </div>
                  
                  {/* Enhanced Connector line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute top-6 left-1/2 h-0.5 transition-all duration-300 ${
                        step.completed ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gray-300'
                      }`}
                      style={{
                        width: `calc(${100 / (steps.length - 1)}vw - 6rem)`,
                        maxWidth: '120px',
                        transform: 'translateX(1.5rem)'
                      }}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Status Messages */}
        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 rounded-xl p-4 shadow-lg animate-slide-in">
            <div className="flex">
              <div className="flex-shrink-0 p-1 bg-white rounded-full">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-red-800">Error Occurred</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-xl p-4 shadow-lg animate-slide-in">
            <div className="flex">
              <div className="flex-shrink-0 p-1 bg-white rounded-full">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-green-800">Success!</h3>
                <p className="text-sm text-green-700 mt-1">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Main Content Area */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    {currentStep}
                  </span>
                  {currentStepInfo?.title}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{currentStepInfo?.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                {currentStep > 1 && (
                  <button
                    onClick={goToPreviousStep}
                    disabled={isNavigating}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                )}
                {currentStep < steps.length && (
                  <button
                    onClick={goToNextStep}
                    disabled={isNavigating}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md"
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

        {/* Enhanced Help Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-8 border border-blue-200 shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0 p-3 bg-white rounded-full shadow-sm">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-6 flex-1">
              <h3 className="text-xl font-bold text-blue-900 mb-3">Step-by-Step Timetable Creation Guide</h3>
              <div className="text-blue-800 mb-4">
                <p className="mb-4">Follow these essential steps to create your optimized academic timetable:</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                      <div>
                        <div className="font-semibold text-blue-900">Sections</div>
                        <div className="text-sm text-blue-700">Add all class sections for your department</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                      <div>
                        <div className="font-semibold text-blue-900">Teachers</div>
                        <div className="text-sm text-blue-700">Configure teacher details and availability</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                      <div>
                        <div className="font-semibold text-blue-900">Courses</div>
                        <div className="text-sm text-blue-700">Define courses, labs, and requirements</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                      <div>
                        <div className="font-semibold text-blue-900">Classrooms</div>
                        <div className="text-sm text-blue-700">Set up rooms with capacity and type</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">5</span>
                      <div>
                        <div className="font-semibold text-blue-900">Assignments</div>
                        <div className="text-sm text-blue-700">Link courses with teachers and sections</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">6</span>
                      <div>
                        <div className="font-semibold text-blue-900">Rules</div>
                        <div className="text-sm text-blue-700">Add constraints and preferences (optional)</div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">7</span>
                      <div>
                        <div className="font-semibold text-blue-900">Review</div>
                        <div className="text-sm text-blue-700">Review data and generate timetable</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 bg-blue-100 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-800">
                      💡 Auto-save is active! Your progress is saved every 5 seconds. You can exit and return anytime.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTimetable;