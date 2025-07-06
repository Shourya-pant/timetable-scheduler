import React, { useState, useEffect } from 'react';

interface ReviewData {
  timetableName: string;
}

interface WizardData {
  sections: any[];
  teachers: any[];
  courses: any[];
  classrooms: any[];
  assignments: any[];
  rules: any[];
  timetableName: string;
}

interface Step7ReviewProps {
  data: WizardData;
  onSubmit: (data: ReviewData) => void;
  onDataChange: (data: Partial<WizardData>) => void;
  isLoading: boolean;
}

const Step7Review: React.FC<Step7ReviewProps> = ({
  data,
  onSubmit,
  onDataChange,
  isLoading
}) => {
  const [timetableName, setTimetableName] = useState(data.timetableName || '');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');

  // Update parent component when timetable name changes
  useEffect(() => {
    onDataChange({ timetableName });
  }, [timetableName, onDataChange]);

  const validateTimetableName = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!timetableName.trim()) {
      newErrors.timetableName = 'Timetable name is required';
    } else if (timetableName.trim().length < 3) {
      newErrors.timetableName = 'Timetable name must be at least 3 characters';
    } else if (timetableName.trim().length > 100) {
      newErrors.timetableName = 'Timetable name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateTimetableName()) {
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Preparing timetable generation...');

    try {
      await onSubmit({ timetableName: timetableName.trim() });
    } catch (error) {
      setGenerationStatus('Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getTotalWeeklyHours = () => {
    return data.courses.reduce((total, course) => {
      const courseAssignments = data.assignments.filter(a => a.course_id === course.id);
      return total + (course.duration_minutes * course.sessions_per_week * courseAssignments.length / 60);
    }, 0);
  };

  const getDataSummary = () => {
    return {
      sections: data.sections.length,
      teachers: data.teachers.length,
      courses: data.courses.length,
      classrooms: data.classrooms.length,
      assignments: data.assignments.length,
      rules: data.rules.length,
      totalWeeklyHours: Math.round(getTotalWeeklyHours() * 10) / 10
    };
  };

  const getValidationSummary = () => {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for potential scheduling conflicts
    const teacherWorkload: { [key: number]: number } = {};
    data.assignments.forEach(assignment => {
      const course = data.courses.find(c => c.id === assignment.course_id);
      if (course) {
        const teacherId = assignment.teacher_id;
        if (!teacherWorkload[teacherId]) {
          teacherWorkload[teacherId] = 0;
        }
        teacherWorkload[teacherId] += course.duration_minutes * course.sessions_per_week / 60;
      }
    });

    // Check teacher overload
    Object.entries(teacherWorkload).forEach(([teacherId, hours]) => {
      const teacher = data.teachers.find(t => t.id === parseInt(teacherId));
      if (teacher && (hours as number) > teacher.max_hours_per_day * 5) {
        warnings.push(`${teacher.name} may be overloaded (${Math.round(hours as number)} hours/week)`);
      }
    });

    // Check room capacity vs demand
    const roomTypeNeeds: { [key: string]: number } = {};
    data.courses.forEach(course => {
      if (!roomTypeNeeds[course.room_type]) {
        roomTypeNeeds[course.room_type] = 0;
      }
      const courseAssignments = data.assignments.filter(a => a.course_id === course.id);
      roomTypeNeeds[course.room_type] += courseAssignments.length * course.sessions_per_week;
    });

    const roomTypeSupply: { [key: string]: number } = {};
    data.classrooms.forEach(classroom => {
      if (!roomTypeSupply[classroom.room_type]) {
        roomTypeSupply[classroom.room_type] = 0;
      }
      roomTypeSupply[classroom.room_type] += 50; // Assume 50 time slots per week per room
    });

    Object.entries(roomTypeNeeds).forEach(([roomType, need]) => {
      const supply = roomTypeSupply[roomType] || 0;
      if ((need as number) > supply * 0.8) { // Warning at 80% capacity
        warnings.push(`${roomType} rooms may be in high demand (${need} sessions needed)`);
      }
    });

    return { issues, warnings };
  };

  const summary = getDataSummary();
  const validation = getValidationSummary();

  return (
    <div className="space-y-6">
      {/* Data Check Notice */}
      {summary.sections === 0 || summary.teachers === 0 || summary.courses === 0 || summary.classrooms === 0 || summary.assignments === 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Missing Required Data</h3>
              <p className="text-sm text-red-700 mt-1">
                To generate a timetable, you need data in all steps. Please go back to the previous steps and add some data, or use the "Load Sample Data" button in the top toolbar to get started quickly.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">Ready for Timetable Generation</h3>
              <p className="text-sm text-green-700 mt-1">
                All required data is present. Enter a timetable name below and click "Generate Timetable" to proceed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Review & Generate</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Review your timetable configuration and generate the optimized schedule:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Verify all data is correct before generation</li>
                <li>Generation may take 1-5 minutes depending on complexity</li>
                <li>You'll be redirected to results once complete</li>
                <li>The system will automatically handle conflicts and constraints</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Timetable Name */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Timetable Name</h3>
        <div className="max-w-md">
          <input
            type="text"
            value={timetableName}
            onChange={(e) => {
              setTimetableName(e.target.value);
              if (errors.timetableName) {
                setErrors({ ...errors, timetableName: '' });
              }
            }}
            placeholder="Enter a name for your timetable"
            className={`block w-full px-3 py-2 border ${
              errors.timetableName ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all`}
          />
          {errors.timetableName && (
            <p className="mt-1 text-sm text-red-600">{errors.timetableName}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            e.g., "Fall 2024 Schedule", "Spring Semester Timetable"
          </p>
        </div>
      </div>

      {/* Data Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{summary.sections}</div>
            <div className="text-sm text-gray-600">Sections</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{summary.teachers}</div>
            <div className="text-sm text-gray-600">Teachers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{summary.courses}</div>
            <div className="text-sm text-gray-600">Courses</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{summary.classrooms}</div>
            <div className="text-sm text-gray-600">Classrooms</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{summary.assignments}</div>
            <div className="text-sm text-gray-600">Assignments</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{summary.rules}</div>
            <div className="text-sm text-gray-600">Rules</div>
          </div>
          <div className="text-center md:col-span-2">
            <div className="text-3xl font-bold text-indigo-600">{summary.totalWeeklyHours}h</div>
            <div className="text-sm text-gray-600">Total Weekly Hours</div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Course Breakdown</h4>
          <div className="space-y-2">
            {data.courses.map((course, index) => {
              const assignmentCount = data.assignments.filter(a => a.course_id === course.id).length;
              const weeklyHours = (course.duration_minutes * course.sessions_per_week * assignmentCount) / 60;
              
              return (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">{course.name}</span>
                  <span className="text-gray-500">
                    {assignmentCount} section{assignmentCount !== 1 ? 's' : ''} • {Math.round(weeklyHours * 10) / 10}h/week
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Teacher Workload */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Teacher Workload</h4>
          <div className="space-y-2">
            {data.teachers.map((teacher, index) => {
              const teacherAssignments = data.assignments.filter(a => a.teacher_id === teacher.id);
              const weeklyHours = teacherAssignments.reduce((total, assignment) => {
                const course = data.courses.find(c => c.id === assignment.course_id);
                return total + (course ? (course.duration_minutes * course.sessions_per_week) / 60 : 0);
              }, 0);
              
              return (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">{teacher.name}</span>
                  <span className={`${
                    weeklyHours > teacher.max_hours_per_day * 5 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {Math.round(weeklyHours * 10) / 10}h/week
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {(validation.issues.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-4">
          {validation.issues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Issues Found</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc list-inside space-y-1">
                      {validation.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Warnings</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      {validation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rules Summary */}
      {data.rules.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Active Rules</h4>
          <div className="space-y-2">
            {data.rules.map((rule, index) => (
              <div key={index} className="flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mr-3">
                  {rule.rule_type.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-sm text-gray-700">{rule.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generation Status */}
      {isGenerating && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="spinner h-5 w-5 text-yellow-600"></div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Generating Timetable</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {generationStatus || 'Processing your timetable... This may take a few minutes.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generation Controls */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Ready to Generate</h3>
            <p className="text-sm text-gray-600 mt-1">
              Click below to start the timetable optimization process. This uses advanced algorithms to create the best possible schedule.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              !timetableName.trim() || 
              isLoading || 
              isGenerating || 
              validation.issues.length > 0 ||
              summary.sections === 0 || 
              summary.teachers === 0 || 
              summary.courses === 0 || 
              summary.classrooms === 0 || 
              summary.assignments === 0
            }
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading || isGenerating ? (
              <>
                <div className="spinner h-5 w-5 mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Timetable
              </>
            )}
          </button>
        </div>

        {validation.issues.length > 0 && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-sm text-red-700">
              Please resolve the issues above before generating the timetable.
            </p>
          </div>
        )}
      </div>

      {/* Expected Generation Time */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Expected Generation Time</h4>
            <div className="mt-1 text-sm text-blue-700">
              <p>
                Based on your configuration ({summary.assignments} assignments, {summary.teachers} teachers, {summary.classrooms} classrooms):
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><strong>Simple timetables:</strong> 30 seconds - 1 minute</li>
                <li><strong>Complex timetables:</strong> 2-5 minutes</li>
                <li><strong>Very complex:</strong> Up to 10 minutes</li>
              </ul>
              <p className="mt-2">
                The system will find the optimal solution within the time limit. You'll be automatically redirected to the results page when complete.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step7Review;
