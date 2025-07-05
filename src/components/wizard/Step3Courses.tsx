import React, { useState, useEffect } from 'react';

interface CourseData {
  name: string;
  course_type: 'lecture' | 'lab';
  duration_minutes: number;
  sessions_per_week: number;
  room_type: 'lecture' | 'lab' | 'computer_lab' | 'conference';
}

interface Step3CoursesProps {
  data: {
    courses: CourseData[];
  };
  onSubmit: (courses: CourseData[]) => void;
  onDataChange: (data: { courses: CourseData[] }) => void;
  isLoading: boolean;
}

const Step3Courses: React.FC<Step3CoursesProps> = ({
  data,
  onSubmit,
  onDataChange,
  isLoading
}) => {
  const [courses, setCourses] = useState<CourseData[]>(
    data.courses.length > 0 ? data.courses : [{
      name: '',
      course_type: 'lecture',
      duration_minutes: 55,
      sessions_per_week: 1,
      room_type: 'lecture'
    }]
  );
  const [errors, setErrors] = useState<{ [key: number]: { [field: string]: string } }>({});

  // Room type options based on course type
  const getRoomTypeOptions = (courseType: 'lecture' | 'lab') => {
    if (courseType === 'lecture') {
      return [
        { value: 'lecture', label: 'Lecture Hall' },
        { value: 'conference', label: 'Conference Room' }
      ];
    } else {
      return [
        { value: 'lab', label: 'Laboratory' },
        { value: 'computer_lab', label: 'Computer Lab' }
      ];
    }
  };

  // Update parent component when courses change
  useEffect(() => {
    const validCourses = courses.filter(course => course.name.trim() !== '');
    onDataChange({ courses: validCourses });
  }, [courses, onDataChange]);

  const addCourse = () => {
    const newCourse: CourseData = {
      name: '',
      course_type: 'lecture',
      duration_minutes: 55,
      sessions_per_week: 1,
      room_type: 'lecture'
    };
    setCourses([...courses, newCourse]);
  };

  const removeCourse = (index: number) => {
    if (courses.length > 1) {
      const newCourses = courses.filter((_, i) => i !== index);
      setCourses(newCourses);
      
      // Clear error for this index
      const newErrors = { ...errors };
      delete newErrors[index];
      // Adjust error indices for remaining courses
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

  const updateCourse = (index: number, field: keyof CourseData, value: any) => {
    const newCourses = [...courses];
    newCourses[index] = { ...newCourses[index], [field]: value };
    
    // Auto-adjust room type when course type changes
    if (field === 'course_type') {
      const roomTypeOptions = getRoomTypeOptions(value);
      newCourses[index].room_type = roomTypeOptions[0].value as CourseData['room_type'];
    }
    
    setCourses(newCourses);

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

  const validateCourses = (): boolean => {
    const newErrors: { [key: number]: { [field: string]: string } } = {};
    const usedNames = new Set<string>();

    courses.forEach((course, index) => {
      const courseErrors: { [field: string]: string } = {};

      // Validate course name
      if (!course.name.trim()) {
        courseErrors.name = 'Course name is required';
      } else {
        const name = course.name.trim().toLowerCase();
        if (usedNames.has(name)) {
          courseErrors.name = 'Course name must be unique';
        } else {
          usedNames.add(name);
        }
      }

      // Validate duration
      if (course.duration_minutes < 30 || course.duration_minutes > 180) {
        courseErrors.duration_minutes = 'Duration must be between 30 and 180 minutes';
      }

      // Validate sessions per week
      if (course.sessions_per_week < 1 || course.sessions_per_week > 7) {
        courseErrors.sessions_per_week = 'Sessions per week must be between 1 and 7';
      }

      if (Object.keys(courseErrors).length > 0) {
        newErrors[index] = courseErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateCourses()) {
      const validCourses = courses
        .filter(course => course.name.trim() !== '')
        .map(course => ({
          ...course,
          name: course.name.trim()
        }));
      
      if (validCourses.length === 0) {
        setErrors({ 0: { name: 'At least one course is required' } });
        return;
      }

      onSubmit(validCourses);
    }
  };

  const duplicateCourse = (index: number) => {
    const courseToClone = { ...courses[index] };
    courseToClone.name = `${courseToClone.name} (Copy)`;
    setCourses([...courses, courseToClone]);
  };

  const hasValidCourses = courses.some(course => course.name.trim() !== '');

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
            <h3 className="text-sm font-medium text-blue-800">Courses & Labs Configuration</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Define your courses and laboratory sessions:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><strong>Lectures:</strong> Theoretical classes requiring lecture halls or conference rooms</li>
                <li><strong>Labs:</strong> Practical sessions requiring laboratories or computer labs</li>
                <li><strong>Duration:</strong> Time per session (typically 55 minutes for lectures, 110+ for labs)</li>
                <li><strong>Sessions per week:</strong> How many times the course meets weekly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Course Input Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Courses & Labs</h3>
          <button
            type="button"
            onClick={addCourse}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Course
          </button>
        </div>

        <div className="space-y-6">
          {courses.map((course, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">
                  Course {index + 1}
                  {course.name && (
                    <span className="ml-2 text-sm text-gray-500">- {course.name}</span>
                  )}
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => duplicateCourse(index)}
                    className="inline-flex items-center p-1.5 border border-gray-300 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                    title="Duplicate course"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {courses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCourse(index)}
                      className="inline-flex items-center p-1.5 border border-transparent rounded text-red-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Course Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    value={course.name}
                    onChange={(e) => updateCourse(index, 'name', e.target.value)}
                    placeholder="e.g., Data Structures, Operating Systems Lab"
                    className={`block w-full px-3 py-2 border ${
                      errors[index]?.name ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all`}
                  />
                  {errors[index]?.name && (
                    <p className="mt-1 text-sm text-red-600">{errors[index].name}</p>
                  )}
                </div>

                {/* Course Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Type *
                  </label>
                  <select
                    value={course.course_type}
                    onChange={(e) => updateCourse(index, 'course_type', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="lab">Laboratory</option>
                  </select>
                </div>

                {/* Room Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Type Required *
                  </label>
                  <select
                    value={course.room_type}
                    onChange={(e) => updateCourse(index, 'room_type', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
                  >
                    {getRoomTypeOptions(course.course_type).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes) *
                  </label>
                  <select
                    value={course.duration_minutes}
                    onChange={(e) => updateCourse(index, 'duration_minutes', parseInt(e.target.value))}
                    className={`block w-full px-3 py-2 border ${
                      errors[index]?.duration_minutes ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all`}
                  >
                    <option value={55}>55 minutes (1 slot)</option>
                    <option value={110}>110 minutes (2 slots)</option>
                    <option value={165}>165 minutes (3 slots)</option>
                    <option value={220}>220 minutes (4 slots)</option>
                  </select>
                  {errors[index]?.duration_minutes && (
                    <p className="mt-1 text-sm text-red-600">{errors[index].duration_minutes}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Each slot is 55 minutes. Labs typically need 2-3 slots.
                  </p>
                </div>

                {/* Sessions per Week */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sessions per Week *
                  </label>
                  <select
                    value={course.sessions_per_week}
                    onChange={(e) => updateCourse(index, 'sessions_per_week', parseInt(e.target.value))}
                    className={`block w-full px-3 py-2 border ${
                      errors[index]?.sessions_per_week ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all`}
                  >
                    <option value={1}>1 session</option>
                    <option value={2}>2 sessions</option>
                    <option value={3}>3 sessions</option>
                    <option value={4}>4 sessions</option>
                    <option value={5}>5 sessions</option>
                  </select>
                  {errors[index]?.sessions_per_week && (
                    <p className="mt-1 text-sm text-red-600">{errors[index].sessions_per_week}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    How many times this course meets per week.
                  </p>
                </div>
              </div>

              {/* Course Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Summary:</span>{' '}
                  {course.course_type === 'lecture' ? 'Lecture' : 'Laboratory'} course requiring{' '}
                  {getRoomTypeOptions(course.course_type).find(opt => opt.value === course.room_type)?.label.toLowerCase()},{' '}
                  {course.duration_minutes} minutes per session,{' '}
                  {course.sessions_per_week} session{course.sessions_per_week !== 1 ? 's' : ''} per week
                  {course.sessions_per_week > 1 && (
                    <span> ({course.duration_minutes * course.sessions_per_week} minutes total weekly)</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-2">No courses added yet</p>
            <button
              type="button"
              onClick={addCourse}
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
            >
              Add Your First Course
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      {hasValidCourses && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Summary</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Ready to proceed with{' '}
                  <strong>
                    {courses.filter(c => c.name.trim() !== '').length} course{courses.filter(c => c.name.trim() !== '').length !== 1 ? 's' : ''}
                  </strong>
                </p>
                <div className="mt-2 space-y-1">
                  {courses
                    .filter(c => c.name.trim() !== '')
                    .map((course, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{course.name}</span>
                        <span className="text-green-600">
                          {course.course_type} • {course.duration_minutes}min • {course.sessions_per_week}x/week
                        </span>
                      </div>
                    ))}
                </div>
                <div className="mt-3 pt-2 border-t border-green-200">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium">Lectures:</span>{' '}
                      {courses.filter(c => c.name.trim() !== '' && c.course_type === 'lecture').length}
                    </div>
                    <div>
                      <span className="font-medium">Labs:</span>{' '}
                      {courses.filter(c => c.name.trim() !== '' && c.course_type === 'lab').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasValidCourses || isLoading}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading && (
            <div className="spinner h-5 w-5 mr-2"></div>
          )}
          {isLoading ? 'Saving Courses...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
};

export default Step3Courses;
