import React, { useState, useEffect } from 'react';

interface AssignmentData {
  id?: string; // Add unique ID for better key management
  course_id: number;
  section_id: number;
  teacher_id: number;
  group_id?: string;
}

interface CourseData {
  id: number;
  name: string;
  course_type: 'lecture' | 'lab';
  duration_minutes: number;
  sessions_per_week: number;
  room_type: 'lecture' | 'lab' | 'computer_lab' | 'conference';
}

interface SectionData {
  id: number;
  code: string;
}

interface TeacherData {
  id: number;
  name: string;
  max_hours_per_day: number;
}

interface Step5AssignmentsProps {
  data: {
    assignments: AssignmentData[];
    courses: CourseData[];
    sections: SectionData[];
    teachers: TeacherData[];
  };
  onSubmit: (assignments: AssignmentData[]) => void;
  onDataChange: (data: { assignments: AssignmentData[] }) => void;
  isLoading: boolean;
}

const Step5Assignments: React.FC<Step5AssignmentsProps> = ({
  data,
  onSubmit,
  onDataChange,
  isLoading
}) => {
  // Debug: Log the data to see what's available
  console.log('Step5Assignments data:', {
    courses: data.courses,
    sections: data.sections,
    teachers: data.teachers,
    assignments: data.assignments
  });
  const [assignments, setAssignments] = useState<AssignmentData[]>(
    data.assignments.length > 0 ? data.assignments.map(assignment => ({
      ...assignment,
      id: assignment.id ?? `assignment-${Date.now()}-${Math.random()}`
    })) : [{
      id: `assignment-${Date.now()}-${Math.random()}`,
      course_id: 0,
      section_id: 0,
      teacher_id: 0
    }]
  );
  const [errors, setErrors] = useState<{ [key: number]: { [field: string]: string } }>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with parent when assignments change
  useEffect(() => {
    // Always update parent with current assignments, even if incomplete
    onDataChange({ assignments });
    setHasChanges(true);
  }, [assignments, onDataChange]);

  const updateAssignment = (index: number, field: keyof AssignmentData, value: any) => {
    console.log('Updating assignment:', { index, field, value }); // Debug log
    
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setAssignments(newAssignments);
    setHasChanges(true);
    
    // Clear error for this field
    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      delete newErrors[index][field];
      if (Object.keys(newErrors[index]).length === 0) {
        delete newErrors[index];
      }
      setErrors(newErrors);
    }
  };

  const addAssignment = () => {
    setAssignments([...assignments, {
      id: `assignment-${Date.now()}-${Math.random()}`,
      course_id: 0,
      section_id: 0,
      teacher_id: 0
    }]);
  };

  const removeAssignment = (index: number) => {
    if (assignments.length > 1) {
      const newAssignments = assignments.filter((_, i) => i !== index);
      setAssignments(newAssignments);
      
      // Remove errors for this index and adjust remaining indices
      const newErrors = { ...errors };
      delete newErrors[index];
      
      // Shift down error indices for remaining assignments
      Object.keys(newErrors).forEach(key => {
        const idx = parseInt(key);
        if (idx > index) {
          newErrors[idx - 1] = newErrors[idx];
          delete newErrors[idx];
        }
      });
      setErrors(newErrors);
    }
  };

  const duplicateAssignment = (index: number) => {
    const assignmentToDuplicate = { 
      ...assignments[index],
      id: `assignment-${Date.now()}-${Math.random()}`
    };
    const newAssignments = [...assignments];
    newAssignments.splice(index + 1, 0, assignmentToDuplicate);
    setAssignments(newAssignments);
  };

  const validateAssignments = (): boolean => {
    const newErrors: { [key: number]: { [field: string]: string } } = {};
    let isValid = true;

    assignments.forEach((assignment, index) => {
      const assignmentErrors: { [field: string]: string } = {};

      // Validate course selection
      if (!assignment.course_id || assignment.course_id === 0) {
        assignmentErrors.course_id = 'Please select a course';
        isValid = false;
      }

      // Validate section selection
      if (!assignment.section_id || assignment.section_id === 0) {
        assignmentErrors.section_id = 'Please select a section';
        isValid = false;
      }

      // Validate teacher selection
      if (!assignment.teacher_id || assignment.teacher_id === 0) {
        assignmentErrors.teacher_id = 'Please select a teacher';
        isValid = false;
      }

      // Check for duplicate assignments (same course-section-teacher combination)
      if (assignment.course_id && assignment.section_id && assignment.teacher_id) {
        const combinationKey = `${assignment.course_id}-${assignment.section_id}-${assignment.teacher_id}`;
        const duplicateExists = assignments.some((otherAssignment, otherIndex) => {
          if (otherIndex === index) return false;
          return `${otherAssignment.course_id}-${otherAssignment.section_id}-${otherAssignment.teacher_id}` === combinationKey;
        });
        
        if (duplicateExists) {
          assignmentErrors.course_id = 'This course-section-teacher combination already exists';
          isValid = false;
        }
      }

      if (Object.keys(assignmentErrors).length > 0) {
        newErrors[index] = assignmentErrors;
      }
    });

    // Check if at least one assignment is properly filled
    const hasValidAssignment = assignments.some(assignment => 
      assignment.course_id > 0 && assignment.section_id > 0 && assignment.teacher_id > 0
    );

    if (!hasValidAssignment) {
      if (!newErrors[0]) newErrors[0] = {};
      newErrors[0].course_id = 'At least one assignment is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    if (validateAssignments()) {
      // Filter out incomplete assignments
      const completeAssignments = assignments.filter(assignment => 
        assignment.course_id > 0 && assignment.section_id > 0 && assignment.teacher_id > 0
      );
      setHasChanges(false);
      onSubmit(completeAssignments);
    }
  };

  const handleSaveChanges = () => {
    // Save current state even if incomplete
    onDataChange({ assignments });
    setHasChanges(false);
  };

  const getCourseName = (courseId: number) => {
    const course = data.courses.find((c, index) => (c.id || (index + 1)) === courseId);
    return course ? course.name : '';
  };

  const getSectionCode = (sectionId: number) => {
    const section = data.sections.find((s, index) => (s.id || (index + 1)) === sectionId);
    return section ? section.code : '';
  };

  const generateSampleAssignments = () => {
    const { courses, sections, teachers } = data;
    
    if (!courses?.length || !sections?.length || !teachers?.length) {
      alert('Please complete the previous steps (Courses, Sections, and Teachers) before generating assignments.');
      return;
    }

    const sampleAssignments: AssignmentData[] = [];
    let assignmentCounter = 1;

    // Generate assignments by pairing courses with sections and teachers
    courses.forEach((course, courseIndex) => {
      sections.forEach((section, sectionIndex) => {
        // Rotate through teachers
        const teacherIndex = (courseIndex + sectionIndex) % teachers.length;
        const teacher = teachers[teacherIndex];
        
        sampleAssignments.push({
          id: `assignment-${assignmentCounter++}`,
          course_id: course.id || (courseIndex + 1),
          section_id: section.id || (sectionIndex + 1),
          teacher_id: teacher.id || (teacherIndex + 1)
        });
      });
    });

    setAssignments(sampleAssignments);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1 md:flex md:justify-between">
            <p className="text-sm text-blue-700">
              Create assignments by linking courses, sections, and teachers. Each assignment represents a specific course being taught to a specific section by a specific teacher.
            </p>
          </div>
        </div>
      </div>

      {/* Assignment Input Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Course Assignments</h3>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={generateSampleAssignments}
              className="inline-flex items-center px-3 py-2 border border-green-300 text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Sample Assignments
            </button>
            <button
              type="button"
              onClick={addAssignment}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Assignment
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {assignments.map((assignment, index) => (
            <div key={assignment.id} className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">
                  Assignment {index + 1}
                  {assignment.course_id > 0 && assignment.section_id > 0 && assignment.teacher_id > 0 && (
                    <span className="ml-2 text-sm text-gray-500">
                      - {getCourseName(assignment.course_id)} for {getSectionCode(assignment.section_id)}
                    </span>
                  )}
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => duplicateAssignment(index)}
                    className="inline-flex items-center p-1.5 border border-gray-300 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                    title="Duplicate assignment"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {assignments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAssignment(index)}
                      className="inline-flex items-center p-1.5 border border-transparent rounded text-red-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Assignment Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor={`course-${assignment.id}`} className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                  <select
                    id={`course-${assignment.id}`}
                    value={assignment.course_id || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      console.log('Course selection changed:', value); // Debug log
                      updateAssignment(index, 'course_id', value);
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value={0}>Select a course</option>
                    {data.courses && data.courses.length > 0 ? (
                      data.courses.map((course, index) => (
                        <option key={course.id || index} value={course.id || (index + 1)}>
                          {course.name} ({course.course_type})
                        </option>
                      ))
                    ) : (
                      <option value={0} disabled>No courses available - Complete step 3 first</option>
                    )}
                  </select>
                  {errors[index]?.course_id && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].course_id}</p>
                  )}
                </div>

                <div>
                  <label htmlFor={`section-${assignment.id}`} className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                  <select
                    id={`section-${assignment.id}`}
                    value={assignment.section_id || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      console.log('Section selection changed:', value); // Debug log
                      updateAssignment(index, 'section_id', value);
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value={0}>Select a section</option>
                    {data.sections && data.sections.length > 0 ? (
                      data.sections.map((section, index) => (
                        <option key={section.id || index} value={section.id || (index + 1)}>
                          {section.code}
                        </option>
                      ))
                    ) : (
                      <option value={0} disabled>No sections available - Complete step 1 first</option>
                    )}
                  </select>
                  {errors[index]?.section_id && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].section_id}</p>
                  )}
                </div>

                <div>
                  <label htmlFor={`teacher-${assignment.id}`} className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
                  <select
                    id={`teacher-${assignment.id}`}
                    value={assignment.teacher_id || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      console.log('Teacher selection changed:', value); // Debug log
                      updateAssignment(index, 'teacher_id', value);
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value={0}>Select a teacher</option>
                    {data.teachers && data.teachers.length > 0 ? (
                      data.teachers.map((teacher, index) => (
                        <option key={teacher.id || index} value={teacher.id || (index + 1)}>
                          {teacher.name}
                        </option>
                      ))
                    ) : (
                      <option value={0} disabled>No teachers available - Complete step 2 first</option>
                    )}
                  </select>
                  {errors[index]?.teacher_id && (
                    <p className="mt-1 text-xs text-red-600">{errors[index].teacher_id}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <div className="flex items-center space-x-4">
            {hasChanges && (
              <button
                type="button"
                onClick={handleSaveChanges}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Save Changes
              </button>
            )}
            {assignments.filter(a => a.course_id > 0 && a.section_id > 0 && a.teacher_id > 0).length > 0 && (
              <span className="text-sm text-green-600 font-medium">
                {assignments.filter(a => a.course_id > 0 && a.section_id > 0 && a.teacher_id > 0).length} assignment(s) ready
              </span>
            )}
          </div>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Continue to Rules'
            )}
          </button>
        </div>

        {/* Sample Data Button */}
        <div className="pt-4">
          <button
            type="button"
            onClick={generateSampleAssignments}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            Generate Sample Assignments
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step5Assignments;