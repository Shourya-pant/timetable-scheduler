import React, { useState, useCallback, useRef, useEffect } from 'react';

interface AvailabilitySelectorProps {
  availability: boolean[][];
  onAvailabilityChange: (availability: boolean[][]) => void;
  daysOff: number[];
  onDaysOffChange: (daysOff: number[]) => void;
  className?: string;
  disabled?: boolean;
}

const AvailabilitySelector: React.FC<AvailabilitySelectorProps> = ({
  availability,
  onAvailabilityChange,
  daysOff,
  onDaysOffChange,
  className = '',
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');
  const [dragStartSlot, setDragStartSlot] = useState<{ day: number; slot: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Time slots configuration (8:00 AM to 6:00 PM in 55-minute slots)
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 8 + Math.floor((i * 55) / 60);
    const minute = (i * 55) % 60;
    return {
      index: i,
      time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      label: `${hour > 12 ? hour - 12 : hour === 12 ? 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
    };
  });

  const days = [
    { index: 0, name: 'Monday', short: 'Mon' },
    { index: 1, name: 'Tuesday', short: 'Tue' },
    { index: 2, name: 'Wednesday', short: 'Wed' },
    { index: 3, name: 'Thursday', short: 'Thu' },
    { index: 4, name: 'Friday', short: 'Fri' }
  ];

  // Initialize availability matrix if empty
  useEffect(() => {
    if (!availability || availability.length === 0) {
      const initialAvailability = Array(5).fill(null).map(() => Array(10).fill(true));
      onAvailabilityChange(initialAvailability);
    }
  }, [availability, onAvailabilityChange]);

  // Update availability for a specific slot
  const updateSlot = useCallback((day: number, slot: number, available: boolean) => {
    if (disabled || daysOff.includes(day)) return;

    const newAvailability = availability.map((daySlots, dayIndex) => {
      if (dayIndex === day) {
        return daySlots.map((slotAvailable, slotIndex) => {
          return slotIndex === slot ? available : slotAvailable;
        });
      }
      return daySlots;
    });

    onAvailabilityChange(newAvailability);
  }, [availability, onAvailabilityChange, disabled, daysOff]);

  // Handle mouse down - start drag operation
  const handleMouseDown = useCallback((day: number, slot: number, e: React.MouseEvent) => {
    if (disabled || daysOff.includes(day)) return;
    
    e.preventDefault();
    
    const currentState = availability[day]?.[slot] ?? true;
    const newState = !currentState;
    
    setDragMode(newState ? 'select' : 'deselect');
    setIsDragging(true);
    setDragStartSlot({ day, slot });
    
    updateSlot(day, slot, newState);
  }, [availability, disabled, daysOff, updateSlot]);

  // Handle mouse enter during drag
  const handleMouseEnter = useCallback((day: number, slot: number) => {
    if (!isDragging || disabled || daysOff.includes(day)) return;
    
    const newState = dragMode === 'select';
    updateSlot(day, slot, newState);
  }, [isDragging, dragMode, disabled, daysOff, updateSlot]);

  // Handle mouse up - end drag operation
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStartSlot(null);
  }, []);

  // Handle day off toggle
  const toggleDayOff = useCallback((day: number) => {
    if (disabled) return;

    const newDaysOff = daysOff.includes(day)
      ? daysOff.filter(d => d !== day)
      : [...daysOff, day];
    
    onDaysOffChange(newDaysOff);

    // Update availability for the entire day
    const newAvailability = availability.map((daySlots, dayIndex) => {
      if (dayIndex === day) {
        return daySlots.map(() => !newDaysOff.includes(day));
      }
      return daySlots;
    });

    onAvailabilityChange(newAvailability);
  }, [availability, daysOff, onAvailabilityChange, onDaysOffChange, disabled]);

  // Select all slots
  const selectAll = useCallback(() => {
    if (disabled) return;

    const newAvailability = Array(5).fill(null).map((_, dayIndex) => 
      Array(10).fill(!daysOff.includes(dayIndex))
    );
    onAvailabilityChange(newAvailability);
  }, [disabled, daysOff, onAvailabilityChange]);

  // Clear all slots
  const clearAll = useCallback(() => {
    if (disabled) return;

    const newAvailability = Array(5).fill(null).map(() => Array(10).fill(false));
    onAvailabilityChange(newAvailability);
    onDaysOffChange([0, 1, 2, 3, 4]);
  }, [disabled, onAvailabilityChange, onDaysOffChange]);

  // Set typical business hours (9 AM - 5 PM)
  const setBusinessHours = useCallback(() => {
    if (disabled) return;

    const newAvailability = Array(5).fill(null).map((_, dayIndex) => {
      if (daysOff.includes(dayIndex)) {
        return Array(10).fill(false);
      }
      return Array(10).fill(null).map((_, slotIndex) => {
        // Business hours: slots 1-8 (9 AM - 5 PM approximately)
        return slotIndex >= 1 && slotIndex <= 8;
      });
    });

    onAvailabilityChange(newAvailability);
  }, [disabled, daysOff, onAvailabilityChange]);

  // Get slot classes for styling
  const getSlotClasses = useCallback((day: number, slot: number) => {
    const isAvailable = availability[day]?.[slot] ?? true;
    const isDayOff = daysOff.includes(day);
    const isDisabled = disabled || isDayOff;
    
    let classes = 'w-full h-12 border border-gray-200 transition-all duration-150 cursor-pointer relative ';
    
    if (isDisabled) {
      classes += 'bg-gray-100 cursor-not-allowed opacity-50 ';
    } else if (isAvailable) {
      classes += 'bg-green-100 hover:bg-green-200 border-green-300 ';
    } else {
      classes += 'bg-red-100 hover:bg-red-200 border-red-300 ';
    }
    
    if (isDragging && !isDisabled) {
      classes += 'select-none ';
    }
    
    return classes.trim();
  }, [availability, daysOff, disabled, isDragging]);

  // Get day header classes
  const getDayHeaderClasses = useCallback((day: number) => {
    const isDayOff = daysOff.includes(day);
    
    let classes = 'p-3 text-center font-medium cursor-pointer transition-all duration-150 ';
    
    if (disabled) {
      classes += 'bg-gray-100 text-gray-400 cursor-not-allowed ';
    } else if (isDayOff) {
      classes += 'bg-red-100 text-red-700 hover:bg-red-200 border-red-300 ';
    } else {
      classes += 'bg-gray-50 text-gray-700 hover:bg-gray-100 ';
    }
    
    return classes.trim();
  }, [daysOff, disabled]);

  // Global mouse up handler to end drag operations anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, handleMouseUp]);

  // Prevent context menu during drag
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [isDragging]);

  if (!availability || availability.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <div className="spinner h-6 w-6 mr-2"></div>
        Loading availability selector...
      </div>
    );
  }

  return (
    <div className={`availability-selector ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">Weekly Availability</h4>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled}
            className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={setBusinessHours}
            disabled={disabled}
            className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Business Hours
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Availability Grid */}
      <div 
        ref={gridRef}
        className="border border-gray-200 rounded-lg overflow-hidden bg-white"
        style={{
          display: 'grid',
          gridTemplateColumns: '100px repeat(5, 1fr)',
          gap: '1px',
          backgroundColor: '#e5e7eb'
        }}
      >
        {/* Header row */}
        <div className="bg-gray-50 p-3 text-center font-medium text-gray-700 text-sm">
          Time
        </div>
        {days.map((day) => (
          <button
            key={day.index}
            type="button"
            onClick={() => toggleDayOff(day.index)}
            disabled={disabled}
            className={getDayHeaderClasses(day.index)}
            title={daysOff.includes(day.index) ? `${day.name} - Day Off (click to enable)` : `${day.name} - Available (click for day off)`}
          >
            <div className="font-semibold">{day.name}</div>
            {daysOff.includes(day.index) && (
              <div className="text-xs text-red-600 mt-1">Day Off</div>
            )}
          </button>
        ))}

        {/* Time slots and availability cells */}
        {timeSlots.map((timeSlot) => (
          <React.Fragment key={timeSlot.index}>
            {/* Time label */}
            <div className="bg-gray-50 p-2 text-center font-medium text-gray-700 text-xs border-r border-gray-200">
              <div>{timeSlot.label}</div>
            </div>
            
            {/* Availability cells */}
            {days.map((day) => {
              const isAvailable = availability[day.index]?.[timeSlot.index] ?? true;
              const isDayOff = daysOff.includes(day.index);
              
              return (
                <button
                  key={`${day.index}-${timeSlot.index}`}
                  type="button"
                  className={getSlotClasses(day.index, timeSlot.index)}
                  onMouseDown={(e) => handleMouseDown(day.index, timeSlot.index, e)}
                  onMouseEnter={() => handleMouseEnter(day.index, timeSlot.index)}
                  disabled={disabled || isDayOff}
                  title={
                    isDayOff 
                      ? `${day.name} ${timeSlot.label} - Day Off` 
                      : `${day.name} ${timeSlot.label} - ${isAvailable ? 'Available' : 'Unavailable'} (click to toggle)`
                  }
                >
                  <div className="flex items-center justify-center h-full text-lg font-bold">
                    {isDayOff ? (
                      <span className="text-gray-400">✗</span>
                    ) : isAvailable ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </div>
                  
                  {/* Hover indicator */}
                  <div className="absolute inset-0 bg-black opacity-0 hover:opacity-5 transition-opacity pointer-events-none"></div>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Instructions and Legend */}
      <div className="mt-4 space-y-3">
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-2">How to use:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Click and drag to select/deselect multiple time slots</li>
            <li>Click day names to toggle full day availability</li>
            <li>Use preset buttons for quick selection</li>
            <li>Green slots = available, Red slots = unavailable</li>
          </ul>
        </div>
        
        <div className="flex items-center space-x-6 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2 flex items-center justify-center">
              <span className="text-green-600 text-xs">✓</span>
            </div>
            <span>Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2 flex items-center justify-center">
              <span className="text-red-600 text-xs">✗</span>
            </div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded mr-2 flex items-center justify-center">
              <span className="text-gray-400 text-xs">✗</span>
            </div>
            <span>Day Off</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilitySelector;
