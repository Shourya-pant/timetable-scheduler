import React, { useState, useEffect } from 'react';

interface ClassroomData {
  room_id: string;
  room_type: 'lecture' | 'lab' | 'computer_lab' | 'conference';
  capacity: number;
}

interface Step4ClassroomsProps {
  data: {
    classrooms: ClassroomData[];
  };
  onSubmit: (classrooms: ClassroomData[]) => void;
  onDataChange: (data: { classrooms: ClassroomData[] }) => void;
  isLoading: boolean;
}

const Step4Classrooms: React.FC<Step4ClassroomsProps> = ({
  data,
  onSubmit,
  onDataChange,
  isLoading
}) => {
  const [classrooms, setClassrooms] = useState<ClassroomData[]>(
    data.classrooms.length > 0 ? data.classrooms : [{
      room_id: '',
      room_type: 'lecture',
      capacity: 50
    }]
  );
  const [errors, setErrors] = useState<{ [key: number]: { [field: string]: string } }>({});

  // Room type options with descriptions
  const roomTypeOptions = [
    { value: 'lecture', label: 'Lecture Hall', description: 'Traditional classroom for lectures' },
    { value: 'lab', label: 'Laboratory', description: 'General purpose laboratory' },
    { value: 'computer_lab', label: 'Computer Lab', description: 'Lab with computer workstations' },
    { value: 'conference', label: 'Conference Room', description: 'Meeting or seminar room' }
  ];

  // Update parent component when classrooms change
  useEffect(() => {
    const validClassrooms = classrooms.filter(classroom => 
      classroom.room_id.trim() !== '' && classroom.capacity > 0
    );
    onDataChange({ classrooms: validClassrooms });
  }, [classrooms, onDataChange]);

  const addClassroom = () => {
    const newClassroom: ClassroomData = {
      room_id: '',
      room_type: 'lecture',
      capacity: 50
    };
    setClassrooms([...classrooms, newClassroom]);
  };

  const removeClassroom = (index: number) => {
    if (classrooms.length > 1) {
      const newClassrooms = classrooms.filter((_, i) => i !== index);
      setClassrooms(newClassrooms);
      
      // Clear error for this index
      const newErrors = { ...errors };
      delete newErrors[index];
      // Adjust error indices for remaining classrooms
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

  const updateClassroom = (index: number, field: keyof ClassroomData, value: any) => {
    const newClassrooms = [...classrooms];
    newClassrooms[index] = { ...newClassrooms[index], [field]: value };
    setClassrooms(newClassrooms);

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

  const validateClassrooms = (): boolean => {
    const newErrors: { [key: number]: { [field: string]: string } } = {};
    const usedRoomIds = new Set<string>();

    classrooms.forEach((classroom, index) => {
      const classroomErrors: { [field: string]: string } = {};

      // Validate room ID
      if (!classroom.room_id.trim()) {
        classroomErrors.room_id = 'Room ID is required';
      } else {
        const roomId = classroom.room_id.trim().toUpperCase();
        if (!/^[A-Za-z0-9\-_]+$/.test(roomId)) {
          classroomErrors.room_id = 'Room ID should contain only letters, numbers, hyphens, and underscores';
        } else if (usedRoomIds.has(roomId)) {
          classroomErrors.room_id = 'Room ID must be unique';
        } else {
          usedRoomIds.add(roomId);
        }
      }

      // Validate capacity
      if (classroom.capacity < 1 || classroom.capacity > 500) {
        classroomErrors.capacity = 'Capacity must be between 1 and 500';
      }

      if (Object.keys(classroomErrors).length > 0) {
        newErrors[index] = classroomErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateClassrooms()) {
      const validClassrooms = classrooms
        .filter(classroom => classroom.room_id.trim() !== '' && classroom.capacity > 0)
        .map(classroom => ({
          ...classroom,
          room_id: classroom.room_id.trim().toUpperCase()
        }));
      
      if (validClassrooms.length === 0) {
        setErrors({ 0: { room_id: 'At least one classroom is required' } });
        return;
      }

      onSubmit(validClassrooms);
    }
  };

  const duplicateClassroom = (index: number) => {
    const classroomToClone = { ...classrooms[index] };
    classroomToClone.room_id = `${classroomToClone.room_id}-COPY`;
    setClassrooms([...classrooms, classroomToClone]);
  };

  const getCapacityLabel = (capacity: number) => {
    if (capacity <= 20) return 'Small';
    if (capacity <= 50) return 'Medium';
    if (capacity <= 100) return 'Large';
    return 'Very Large';
  };

  const getRoomTypeIcon = (roomType: string) => {
    switch (roomType) {
      case 'lecture':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'lab':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      case 'computer_lab':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'conference':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const hasValidClassrooms = classrooms.some(classroom => 
    classroom.room_id.trim() !== '' && classroom.capacity > 0
  );

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
            <h3 className="text-sm font-medium text-blue-800">Classroom Configuration</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Define your available classrooms and their specifications:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><strong>Room ID:</strong> Unique identifier (e.g., A101, LAB-CS-1, CONF-201)</li>
                <li><strong>Room Type:</strong> Determines which courses can use this room</li>
                <li><strong>Capacity:</strong> Maximum number of students the room can accommodate</li>
                <li>Room types must match course requirements for proper assignment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Classroom Input Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Classrooms</h3>
          <button
            type="button"
            onClick={addClassroom}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Classroom
          </button>
        </div>

        <div className="space-y-6">
          {classrooms.map((classroom, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  {getRoomTypeIcon(classroom.room_type)}
                  <span className="ml-2">
                    Room {index + 1}
                    {classroom.room_id && (
                      <span className="ml-2 text-sm text-gray-500">- {classroom.room_id}</span>
                    )}
                  </span>
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => duplicateClassroom(index)}
                    className="inline-flex items-center p-1.5 border border-gray-300 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                    title="Duplicate classroom"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {classrooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeClassroom(index)}
                      className="inline-flex items-center p-1.5 border border-transparent rounded text-red-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Room ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room ID *
                  </label>
                  <input
                    type="text"
                    value={classroom.room_id}
                    onChange={(e) => updateClassroom(index, 'room_id', e.target.value)}
                    placeholder="e.g., A101, LAB-CS-1"
                    className={`block w-full px-3 py-2 border ${
                      errors[index]?.room_id ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all`}
                  />
                  {errors[index]?.room_id && (
                    <p className="mt-1 text-sm text-red-600">{errors[index].room_id}</p>
                  )}
                </div>

                {/* Room Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Type *
                  </label>
                  <select
                    value={classroom.room_type}
                    onChange={(e) => updateClassroom(index, 'room_type', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
                  >
                    {roomTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {roomTypeOptions.find(opt => opt.value === classroom.room_type)?.description}
                  </p>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={classroom.capacity}
                    onChange={(e) => updateClassroom(index, 'capacity', parseInt(e.target.value) || 0)}
                    className={`block w-full px-3 py-2 border ${
                      errors[index]?.capacity ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all`}
                  />
                  {errors[index]?.capacity && (
                    <p className="mt-1 text-sm text-red-600">{errors[index].capacity}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {getCapacityLabel(classroom.capacity)} room ({classroom.capacity} students)
                  </p>
                </div>
              </div>

              {/* Room Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Summary:</span>{' '}
                  {roomTypeOptions.find(opt => opt.value === classroom.room_type)?.label} with{' '}
                  capacity for {classroom.capacity} students
                  {classroom.room_type === 'computer_lab' && (
                    <span> (equipped with computer workstations)</span>
                  )}
                  {classroom.room_type === 'lab' && (
                    <span> (general laboratory equipment)</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {classrooms.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-2">No classrooms added yet</p>
            <button
              type="button"
              onClick={addClassroom}
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
            >
              Add Your First Classroom
            </button>
          </div>
        )}
      </div>

      {/* Statistics */}
      {hasValidClassrooms && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Classroom Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {roomTypeOptions.map(option => {
              const count = classrooms.filter(c => 
                c.room_id.trim() !== '' && c.room_type === option.value
              ).length;
              const totalCapacity = classrooms
                .filter(c => c.room_id.trim() !== '' && c.room_type === option.value)
                .reduce((sum, c) => sum + c.capacity, 0);
              
              return (
                <div key={option.value} className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">{option.label}s</div>
                  {count > 0 && (
                    <div className="text-xs text-gray-400">{totalCapacity} total seats</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {hasValidClassrooms && (
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
                    {classrooms.filter(c => c.room_id.trim() !== '' && c.capacity > 0).length} classroom{classrooms.filter(c => c.room_id.trim() !== '' && c.capacity > 0).length !== 1 ? 's' : ''}
                  </strong>
                </p>
                <div className="mt-2 space-y-1">
                  {classrooms
                    .filter(c => c.room_id.trim() !== '' && c.capacity > 0)
                    .map((classroom, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{classroom.room_id}</span>
                        <span className="text-green-600">
                          {roomTypeOptions.find(opt => opt.value === classroom.room_type)?.label} • {classroom.capacity} seats
                        </span>
                      </div>
                    ))}
                </div>
                <div className="mt-3 pt-2 border-t border-green-200">
                  <div className="text-xs">
                    <span className="font-medium">Total capacity:</span>{' '}
                    {classrooms
                      .filter(c => c.room_id.trim() !== '' && c.capacity > 0)
                      .reduce((sum, c) => sum + c.capacity, 0)} students
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
          disabled={!hasValidClassrooms || isLoading}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading && (
            <div className="spinner h-5 w-5 mr-2"></div>
          )}
          {isLoading ? 'Saving Classrooms...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
};

export default Step4Classrooms;
