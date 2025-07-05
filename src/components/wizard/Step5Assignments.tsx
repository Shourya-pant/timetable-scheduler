import React, { useState, useEffect } from 'react';

interface AssignmentData {
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
  const [assignments, setAssignments] = useState<AssignmentData[]>(
    data.assignments.length > 0 ? data.assignments : [{
      course_id: 0,
      section_id: 0,
      teacher_id: 0,
      group_id: ''
    }]
  );
  const [errors, setErrors] = useState<{ [key: number]: { [field: string]: string } }>({});
  const [groupMode, setGroupMode] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);

  // Update parent component when assignments change
  useEffect(() => {
    const validAssignments = assignments.filter(assignment => 
      assignment.course_id > 0 && assignment.section_id > 0 && assignment.teacher_id > 0
    );
    onDataChange({ assignments: validAssignments });
  }, [assignments, onDataChange]);

  // Update available groups when assignments change
  useEffect(() => {
    const groups = new Set<string>();
    assignments.forEach(assignment => {
      if (assignment.group_id && assignment.group_id.trim()) {
        groups.add(assignment.group_id.trim());
      }
    });
    setAvailableGroups(Array.from(groups).sort());
  }, [assignments]);

  const addAssignment = () => {
    const newAssignment: AssignmentData = {
      course_id: 0,
      section_id: 0,
      teacher_id: 0,
      group_id: ''
    };
    setAssignments([...assignments, newAssignment]);
  };

  const removeAssignment = (index: number) => {
    if (assignments.length > 1) {
      const newAssignments = assignments.filter((_, i) => i !== index);
      setAssignments(newAssignments);
      
      // Clear error for this index
      const newErrors = { ...errors };
      delete newErrors[index];
      // Adjust error indices for remaining assignments
      const adjustedErrors: { [key: number]: { [field: string]: string } } = {};
      Object.keys(newErrors).forEach(key => {
        const keyNum = parseInt(key);
        if (keyNum > index) {
          adjustedErrors[keyNum - 1] = newErrors[keyNum];
        } else if (keyNum < index) {
          adjustedErrors[keyNum] = newErrors[keyNum];
        }
      });
      setErrors(adjustedErrors);
    }
  };

  const updateAssignment = (index: number, field: keyof AssignmentData, value: any) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setAssignments(newAssignments);

    // Clear error for this field
    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      if (newErrors[index]) {
        delete newErrors[index][field];
        if (Object.keys(newErrors[index]).length === 0) {
          delete newErrors[index];
        }
      }
      setErrors(newErrors);
    }
  };

  const validateAssignments = (): boolean => {
    const newErrors: { [key: number]: { [field: string]: string } } = {};
    const usedCombinations = new Set<string>();

    assignments.forEach((assignment, index) => {
      const assignmentErrors: { [field: string]: string } = {};

      // Validate course selection
      if (!assignment.course_id || assignment.course_id === 0) {
        assignmentErrors.course_id = 'Please select a course';
      }

      // Validate section selection
      if (!assignment.section_id || assignment.section_id === 0) {
        assignmentErrors.section_id = 'Please select a section';
      }

      // Validate teacher selection
      if (!assignment.teacher_id || assignment.teacher_id === 0) {
        assignmentErrors.teacher_id = 'Please select a teacher';
      }

      // Check for duplicate assignments (same course-section-teacher combination)
      if (assignment.course_id && assignment.section_id && assignment.teacher_id) {
        const combinationKey = `${assignment.course_id}-${assignment.section_id}-${assignment.teacher_id}`;
        if (usedCombinations.has(combinationKey)) {
          assignmentErrors.course_id = 'This course-section-teacher combination already exists';
        } else {
          usedCombinations.add(combinationKey);
        }
      }

      if (Object.keys(assignmentErrors).length > 0) {
        newErrors[index] = assignmentErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateAssignments()) {
      const validAssignments = assignments
        .filter(assignment => 
          assignment.course_id > 0 && assignment.section_id > 0 && assignment.teacher_id > 0
        )
        .map(assignment => ({
          ...assignment,
          group_id: assignment.group_id && assignment.group_id.trim() ? assignment.group_id.trim() : undefined
        }));
      
      if (validAssignments.length === 0) {
        setErrors({ 0: { course_id: 'At least one assignment is required' } });
        return;
      }

      onSubmit(validAssignments);
    }
  };

  const duplicateAssignment = (index: number) => {
    const assignmentToClone = { ...assignments[index] };
    // Clear the section to avoid duplicate combinations
    assignmentToClone.section_id = 0;
    setAssignments([...assignments, assignmentToClone]);
  };

  const createGroup = () => {
    const groupName = prompt('Enter group name (e.g., "Group A", "Combined Sections"):');
    if (groupName && groupName.trim()) {
      const trimmedName = groupName.trim();
      if (!availableGroups.includes(trimmedName)) {
        setAvailableGroups([...availableGroups, trimmedName].sort());
      }
    }
  };

  const assignToGroup = (groupId: string, assignmentIndices: number[]) => {
    const newAssignments = [...assignments];
    assignmentIndices.forEach(index => {
      if (index < newAssignments.length) {
        newAssignments[index].group_id = groupId;
      }
    });
    setAssignments(newAssignments);
  };

  const clearGroup = (index: number) => {
    updateAssignment(index, 'group_id', '');
  };

  const getCourseName = (courseId: number) => {
    const course = data.courses.find(c => c.id === courseId);
    return course ? course.name : 'Unknown Course';
  };

  const getSectionCode = (sectionId: number) => {
    const section = data.sections.find(s => s.id === sectionId);
    return section ? section.code : 'Unknown Section';
  };

  const getTeacherName = (teacherId: number) => {
    const teacher = data.teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Unknown Teacher';
  };

  const getAssignmentsByGroup = () => {
    const grouped: { [key: string]: number[] } = {};
    const ungrouped: number[] = [];

    assignments.forEach((assignment, index) => {
      if (assignment.group_id && assignment.group_id.trim()) {
        const groupId = assignment.group_id.trim();
        if (!grouped[groupId]) {
          grouped[groupId] = [];
        }
        grouped[groupId].push(index);
      } else {
        ungrouped.push(index);
      }
    });

    return { grouped, ungrouped };
  };

  const hasValidAssignments = assignments.some(assignment => 
    assignment.course_id > 0 && assignment.section_id > 0 && assignment.teacher_id > 0
  );

  const { grouped, ungrouped } = getAssignmentsByGroup();

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Course Assignments</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Create assignments linking courses, sections, and teachers:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><strong>Course:</strong> The subject to be taught</li>
                <li><strong>Section:</strong> The class/group of students</li>
                <li><strong>Teacher:</strong> The instructor for this assignment</li>
                <li><strong>Groups:</strong> Multiple sections that share the same schedule (optional)</li>
                <li>Each assignment creates scheduled sessions based on the course's sessions per week</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Group Management */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Group Management</h4>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setGroupMode(!groupMode)}
              className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-all ${
                groupMode
                  ? 'text-primary-700 bg-primary-100 hover:bg-primary-200'
                  : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {groupMode ? 'Hide Groups' : 'Show Groups'}
            </button>
            <button
              type="button"
              onClick={createGroup}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-all"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Group
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-600">
          <p><strong>Groups</strong> allow multiple sections to share the same schedule. For example, if "CS-A" and "CS-B" attend the same Data Structures lecture, assign them to the same group.</p>
          {availableGroups.length > 0 && (
            <p className="mt-1">
              <strong>Available groups:</strong> {availableGroups.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Assignment Input Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Course Assignments</h3>
          <button
            type="button"
            onClick={addAssignment}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Assignment
          </button>
        </div>

        {/* Group View */}
        {groupMode && (
          <div className="space-y-4">
            {/* Grouped Assignments */}
            {Object.keys(grouped).map(groupId => (
              <div key={groupId} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-blue-900 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Group: {groupId}
                  </h4>
                  <span className="text-sm text-blue-600">
                    {grouped[groupId].length} assignment{grouped[groupId].length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {grouped[groupId].map(index => (
                    <div key={index} className="bg-white border border-blue-200 rounded-lg p-4">
                      {/* Assignment form for grouped item */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                          <select
                            value={assignments[index].course_id}
                            onChange={(e) => updateAssignment(index, 'course_id', parseInt(e.target.value))}
                            className={`block w-full px-3 py-2 border ${
                              errors[index]?.course_id ? 'border-red-300' : 'border-gray-300'
                            } rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-all`}
                          >
                            <option value={0}>Select course...</option>
                            {data.courses.map(course => (
                              <option key={course.id} value={course.id}>
                                {course.name} ({course.course_type})
                              </option>
                            ))}
                          </select>
                          {errors[index]?.course_id && (
                            <p className="mt-1 text-xs text-red-600">{errors[index].course_id}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                          <select
                            value={assignments[index].section_id}
                            onChange={(e) => updateAssignment(index, 'section_id', parseInt(e.target.value))}
                            className={`block w-full px-3 py-2 border ${
                              errors[index]?.section_id ? 'border-red-300' : 'border-gray-300'
                            } rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-all`}
                          >
                            <option value={0}>Select section...</option>
                            {data.sections.map(section => (
                              <option key={section.id} value={section.id}>
                                {section.code}
                              </option>
                            ))}
                          </select>
                          {errors[index]?.section_id && (
                            <p className="mt-1 text-xs text-red-600">{errors[index].section_id}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
                          <select
                            value={assignments[index].teacher_id}
                            onChange={(e) => updateAssignment(index, 'teacher_id', parseInt(e.target.value))}
                            className={`block w-full px-3 py-2 border ${
                              errors[index]?.teacher_id ? 'border-red-300' : 'border-gray-300'
                            } rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-all`}
                          >
                            <option value={0}>Select teacher...</option>
                            {data.teachers.map(teacher => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.name}
                              </option>
                            ))}
                          </select>
                          {errors[index]?.teacher_id && (
                            <p className="mt-1 text-xs text-red-600">{errors[index].teacher_id}</p>
                          )}
                        </div>

                        <div className="flex items-end space-x-2">
                          <button
                            type="button"
                            onClick={() => clearGroup(index)}
                            className="inline-flex items-center px-2 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-all"
                            title="Remove from group"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAssignment(index)}
                            className="inline-flex items-center px-2 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-all"
                            title="Delete assignment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Ungrouped Assignments */}
            {ungrouped.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Individual Assignments</h4>
                <div className="space-y-4">
                  {ungrouped.map(index => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                          <select
                            value={assignments[index].course_id}
                            onChange={(e) => updateAssignment(index, 'course_id', parseInt(e.target.value))}
                            className={`block w-full px-3 py-2 border ${
                              errors[index]?.course_id ? 'border-red-300' : 'border-gray-300'
                            } rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-all`}
                          >
                            <option value={0}>Select course...</option>
                            {data.courses.map(course => (
                              <option key={course.id} value={course.id}>
                                {course.name} ({course.course_type})
                              </option>
                            ))}
                          </select>
                          {errors[index]?.course_id && (
                            <p className="mt-1 text-xs text-red-600">{errors[index].course_id}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                          <select
                            value={assignments[index].section_id}
                            onChange={(e) => updateAssignment(index, 'section_id', parseInt(e.target.value))}
                            className={`block w-full px-3 py-2 border ${
                              errors[index]?.section_id ? 'border-red-300' : 'border-gray-300'
                            } rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-all`}
                          >
                            <option value={0}>Select section...</option>
                            {data.sections.map(section => (
                              <option key={section.id} value={section.id}>
                                {section.code}
                              </option>
                            ))}
                          </select>
                          {errors[index]?.section_id && (
                            <p className="mt-1 text-xs text-red-600">{errors[index].section_id}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
                          <select
                            value={assignments[index].teacher_id}
                            onChange={(e) => updateAssignment(index, 'teacher_id', parseInt(e.target.value))}
                            className={`block w-full px-3 py-2 border ${
                              errors[index]?.teacher_id ? 'border-red-300' : 'border-gray-300'
                            } rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-all`}
                          >
                            <option value={0}>Select teacher...</option>
                            {data.teachers.map(teacher => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.name}
                              </option>
                            ))}
                          </select>
                          {errors[index]?.teacher_id && (
                            <p className="mt-1 text-xs text-red-600">{errors[index].teacher_id}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Group (Optional)</label>
                          <select
                            value={assignments[index].group_id || ''}
                            onChange={(e) => updateAssignment(index, 'group_id', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-all"
                          >
                            <option value="">No group</option>
                            {availableGroups.map(group => (
                              <option key={group} value={group}>
                                {group}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-end space-x-2">
                          <button
                            type="button"
                            onClick={() => duplicateAssignment(index)}
                            className="inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-600 bg-white hover:bg-gray-50 transition-all"
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
                              className="inline-flex items-center px-2 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Simple List View */}
        {!groupMode && (
          <div className="space-y-4">
            {assignments.map((assignment, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white">
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
                        className="inline-flex items-center p-1.5 border border-transparent rounded text-red-400 hover:text-
