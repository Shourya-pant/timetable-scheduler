import React, { useState, useEffect } from 'react';

interface TeacherData {
  name: string;
  max_hours_per_day: number;
  availability: boolean[][];
  days_off: number[];
}

interface Step2TeachersProps {
  data: {
    teachers: TeacherData[];
  };
  onSubmit: (teachers: TeacherData[]) => void;
  onDataChange: (data: { teachers: TeacherData[] }) => void;
  isLoading: boolean;
}

const Step2Teachers: React.FC<Step2TeachersProps> = ({
  data,
  onSubmit,
  onDataChange,
  isLoading
}) => {
  const [teachers, setTeachers] = useState<TeacherData[]>(
    data.teachers.length > 0 ? data.teachers : [{
      name: '',
      max_hours_per_day: 8,
      availability: Array(5).fill(null).map(() => Array(10).fill(true)),
      days_off: []
    }]
  );
  const [errors, setErrors] = useState<{ [key: number]: { [field: string]: string } }>({});
  const [selectedTeacher, setSelectedTeacher] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');

  // Time slots configuration
  const timeSlots = [
    '8:00 AM', '8:55 AM', '9:50 AM', '10:45 AM', '11:40 AM',
    '12:35 PM', '1:30 PM', '2:25 PM', '3:20 PM', '4:15 PM'
  ];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Update parent component when teachers change
  useEffect(() => {
    const validTeachers = teachers.filter(teacher => teacher.name.trim() !== '');
    onDataChange({ teachers: validTeachers });
  }, [teachers, onDataChange]);

  const addTeacher = () => {
    const newTeacher: TeacherData = {
      name: '',
      max_hours_per_day: 8,
      availability: Array(5).fill(null).map(() => Array(10).fill(true)),
      days_off: []
    };
    setTeachers([...teachers, newTeacher]);
    setSelectedTeacher(teachers.length);
  };

  const removeTeacher = (index: number) => {
    if (teachers.length > 1) {
      const newTeachers = teachers.filter((_, i) => i !== index);
      setTeachers(newTeachers);
      
      // Adjust selected teacher index
      if (selectedTeacher >= newTeachers.length) {
        setSelectedTeacher(Math.max(0, newTeachers.length - 1));
      }
      
      // Clear errors for this teacher
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const updateTeacher = (index: number, field: keyof TeacherData, value: any) => {
    const newTeachers = [...teachers];
    newTeachers[index] = { ...newTeachers[index], [field]: value };
    setTeachers(newTeachers);

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

  const updateAvailability = (teacherIndex: number, day: number, slot: number, available: boolean) => {
    const newTeachers = [...teachers];
    newTeachers[teacherIndex].availability[day][slot] = available;
    setTeachers(newTeachers);
  };

  const toggleDayOff = (teacherIndex: number, day: number) => {
    const newTeachers = [...teachers];
    const daysOff = [...newTeachers[teacherIndex].days_off];
    
    if (daysOff.includes(day)) {
      // Remove day from days off and make all slots available
      newTeachers[teacherIndex].days_off = daysOff.filter(d => d !== day);
      newTeachers[teacherIndex].availability[day] = Array(10).fill(true);
    } else {
      // Add day to days off and make all slots unavailable
      newTeachers[teacherIndex].days_off = [...daysOff, day];
      newTeachers[teacherIndex].availability[day] = Array(10).fill(false);
    }
    
    setTeachers(newTeachers);
  };

  const handleMouseDown = (day: number, slot: number) => {
    const teacher = teachers[selectedTeacher];
    const currentState = teacher.availability[day][slot];
    setDragMode(currentState ? 'deselect' : 'select');
    setIsDragging(true);
    updateAvailability(selectedTeacher, day, slot, !currentState);
  };

  const handleMouseEnter = (day: number, slot: number) => {
    if (isDragging) {
      const newState = dragMode === 'select';
      updateAvailability(selectedTeacher, day, slot, newState);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const selectAllSlots = (teacherIndex: number) => {
    const newTeachers = [...teachers];
    newTeachers[teacherIndex].availability = Array(5).fill(null).map(() => Array(10).fill(true));
    newTeachers[teacherIndex].days_off = [];
    setTeachers(newTeachers);
  };

  const clearAllSlots = (teacherIndex: number) => {
    const newTeachers = [...teachers];
    newTeachers[teacherIndex].availability = Array(5).fill(null).map(() => Array(10).fill(false));
    newTeachers[teacherIndex].days_off = [0, 1, 2, 3, 4];
    setTeachers(newTeachers);
  };

  const validateTeachers = (): boolean => {
    const newErrors: { [key: number]: { [field: string]: string } } = {};
    const usedNames = new Set<string>();

    teachers.forEach((teacher, index) => {
      const teacherErrors: { [field: string]: string } = {};

      // Validate name
      if (!teacher.name.trim()) {
        teacherErrors.name = 'Teacher name is required';
      } else {
        const name = teacher.name.trim().toLowerCase();
        if (usedNames.has(name)) {
          teacherErrors.name = 'Teacher name must be unique';
        } else {
          usedNames.add(name);
        }
      }

      // Validate max hours per day
      if (teacher.max_hours_per_day < 1 || teacher.max_hours_per_day > 12) {
        teacherErrors.max_hours_per_day = 'Max hours per day must be between 1 and 12';
      }

      // Validate availability (check if teacher has at least some availability)
      const hasAvailability = teacher.availability.some(day => 
        day.some(slot => slot === true)
      );
      if (!hasAvailability) {
        teacherErrors.availability = 'Teacher must have at least some available time slots';
      }

      if (Object.keys(teacherErrors).length > 0) {
        newErrors[index] = teacherErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateTeachers()) {
      const validTeachers = teachers
        .filter(teacher => teacher.name.trim() !== '')
        .map(teacher => ({
          ...teacher,
          name: teacher.name.trim()
        }));
      
      if (validTeachers.length === 0) {
        setErrors({ 0: { name: 'At least one teacher is required' } });
        return;
      }

      onSubmit(validTeachers);
    }
  };

  const hasValidTeachers = teachers.some(teacher => teacher.name.trim() !== '');
  const currentTeacher = teachers[selectedTeacher];

  return (
    <div className="space-y-6" onMouseUp={handleMouseUp}>
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Teacher Configuration</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Configure your teachers' details and availability:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Enter teacher names and maximum teaching hours per day</li>
                <li>Set availability by clicking and dragging on the time grid</li>
                <li>Mark full days off by clicking the day name</li>
                <li>Green slots = available, Gray slots = unavailable</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher List and Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Teachers</h3>
          <button
            type="button"
            onClick={addTeacher}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Teacher
          </button>
        </div>

        {/* Teacher Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {teachers.map((teacher, index) => (
              <button
                key={index}
                onClick={() => setSelectedTeacher(index)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-all ${
                  selectedTeacher === index
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {teacher.name.trim() || `Teacher ${index + 1}`}
                {errors[index] && (
                  <span className="ml-1 inline-block w-2 h-2 bg-red-400 rounded-full"></span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Current Teacher Configuration */}
        {currentTeacher && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teacher Name *
                  </label>
                  <input
                    type="text"
                    value={currentTeacher.name}
                    onChange={(e) => updateTeacher(selectedTeacher, 'name', e.target.value)}
                    placeholder="Enter teacher name"
                    className={`block w-full px-3 py-2 border ${
                      errors[selectedTeacher]?.name ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all`}
                  />
                  {errors[selectedTeacher]?.name && (
                    <p className="mt-1 text-sm text-red-600">{errors[selectedTeacher].name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Hours Per Day *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={currentTeacher.max_hours_per_day}
                    onChange={(e) => updateTeacher(selectedTeacher, 'max_hours_per_day', parseInt(e.target.value) || 8)}
                    className={`block w-full px-3 py-2 border ${
                      errors[selectedTeacher]?.max_hours_per_day ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all`}
                  />
                  {errors[selectedTeacher]?.max_hours_per_day && (
                    <p className="mt-1 text-sm text-red-600">{errors[selectedTeacher].max_hours_per_day}</p>
                  )}
                </div>
              </div>

              {/* Availability Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-700">Weekly Availability</h4>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => selectAllSlots(selectedTeacher)}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-all"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => clearAllSlots(selectedTeacher)}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-6 gap-0">
                    {/* Header with time slots */}
                    <div className="bg-gray-50 p-2 text-xs font-medium text-gray-700 text-center border-b border-r border-gray-200">
                      Time / Day
                    </div>
                    {timeSlots.map((time, index) => (
                      <div key={index} className="bg-gray-50 p-2 text-xs font-medium text-gray-700 text-center border-b border-r border-gray-200 last:border-r-0">
                        {time}
                      </div>
                    ))}

                    {/* Availability grid */}
                    {days.map((day, dayIndex) => (
                      <React.Fragment key={dayIndex}>
                        <button
                          type="button"
                          onClick={() => toggleDayOff(selectedTeacher, dayIndex)}
                          className={`p-2 text-xs font-medium text-left border-b border-r border-gray-200 transition-all ${
                            currentTeacher.days_off.includes(dayIndex)
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {day}
                          {currentTeacher.days_off.includes(dayIndex) && (
                            <div className="text-xs text-red-500 mt-1">Day Off</div>
                          )}
                        </button>
                        {timeSlots.map((_, slotIndex) => (
                          <button
                            key={slotIndex}
                            type="button"
                            onMouseDown={() => handleMouseDown(dayIndex, slotIndex)}
                            onMouseEnter={() => handleMouseEnter(dayIndex, slotIndex)}
                            className={`h-12 border-b border-r border-gray-200 last:border-r-0 transition-all ${
                              currentTeacher.availability[dayIndex][slotIndex]
                                ? 'bg-green-100 hover:bg-green-200'
                                : 'bg-gray-100 hover:bg-gray-200'
                            } ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
                          >
                            <div className={`w-full h-full flex items-center justify-center ${
                              currentTeacher.availability[dayIndex][slotIndex]
                                ? 'text-green-600'
                                : 'text-gray-400'
                            }`}>
                              {currentTeacher.availability[dayIndex][slotIndex] ? '✓' : '✗'}
                            </div>
                          </button>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {errors[selectedTeacher]?.availability && (
                  <p className="mt-2 text-sm text-red-600">{errors[selectedTeacher].availability}</p>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  <p>Click and drag to select/deselect time slots. Click day names to toggle full day availability.</p>
                </div>
              </div>

              {/* Remove Teacher Button */}
              {teachers.length > 1 && (
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => removeTeacher(selectedTeacher)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove Teacher
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {hasValidTeachers && (
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
                    {teachers.filter(t => t.name.trim() !== '').length} teacher{teachers.filter(t => t.name.trim() !== '').length !== 1 ? 's' : ''}
                  </strong>
                </p>
                <div className="mt-2 space-y-1">
                  {teachers
                    .filter(t => t.name.trim() !== '')
                    .map((teacher, index) => {
                      const availableSlots = teacher.availability.flat().filter(slot => slot).length;
                      const totalSlots = 50; // 5 days * 10 slots
                      const availabilityPercent = Math.round((availableSlots / totalSlots) * 100);
                      
                      return (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{teacher.name}</span>
                          <span>
                            {teacher.max_hours_per_day}h/day, {availabilityPercent}% available
                          </span>
                        </div>
                      );
                    })}
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
          disabled={!hasValidTeachers || isLoading}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading && (
            <div className="spinner h-5 w-5 mr-2"></div>
          )}
          {isLoading ? 'Saving Teachers...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
};

export default Step2Teachers;
