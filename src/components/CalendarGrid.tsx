import React, { useState, useCallback, useRef, useEffect } from 'react';

interface TimeSlot {
  day: number;
  slot: number;
  startTime: string;
  endTime: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  timeSlot: TimeSlot;
  duration: number; // Number of slots
  color?: 'primary' | 'green' | 'blue' | 'purple' | 'orange' | 'red';
  isConflict?: boolean;
  isReadOnly?: boolean;
}

interface CalendarGridProps {
  events: CalendarEvent[];
  onEventMove?: (eventId: string, newTimeSlot: TimeSlot) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (timeSlot: TimeSlot) => void;
  readOnly?: boolean;
  showConflicts?: boolean;
  highlightAvailableSlots?: boolean;
  className?: string;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  events,
  onEventMove,
  onEventClick,
  onSlotClick,
  readOnly = false,
  showConflicts = true,
  highlightAvailableSlots = false,
  className = ''
}) => {
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<TimeSlot | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Time slots configuration (8:00 AM to 6:00 PM in 55-minute slots)
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 8 + Math.floor((i * 55) / 60);
    const minute = (i * 55) % 60;
    return {
      index: i,
      time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      label: `${hour > 12 ? hour - 2 : hour === 12 ? 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
    };
  });

  const days = [
    { index: 0, name: 'Monday', short: 'Mon' },
    { index: 1, name: 'Tuesday', short: 'Tue' },
    { index: 2, name: 'Wednesday', short: 'Wed' },
    { index: 3, name: 'Thursday', short: 'Thu' },
    { index: 4, name: 'Friday', short: 'Fri' }
  ];

  // Get events for a specific slot
  const getEventsForSlot = useCallback((day: number, slot: number) => {
    return events.filter(event => {
      const eventStart = event.timeSlot.slot;
      const eventEnd = eventStart + event.duration;
      return event.timeSlot.day === day && slot >= eventStart && slot < eventEnd;
    });
  }, [events]);

  // Check if a slot has conflicts
  const hasConflict = useCallback((day: number, slot: number) => {
    const slotEvents = getEventsForSlot(day, slot);
    return slotEvents.length > 1 || slotEvents.some(event => event.isConflict);
  }, [getEventsForSlot]);

  // Check if a slot is available for dropping
  const canDropInSlot = useCallback((day: number, slot: number, duration: number = 1) => {
    if (!draggedEvent) return false;
    
    // Check if all required slots are available
    for (let i = 0; i < duration; i++) {
      const checkSlot = slot + i;
      if (checkSlot >= timeSlots.length) return false;
      
      const existingEvents = getEventsForSlot(day, checkSlot);
      // Allow if only the dragged event is in this slot
      const otherEvents = existingEvents.filter(event => event.id !== draggedEvent.id);
      if (otherEvents.length > 0) return false;
    }
    
    return true;
  }, [draggedEvent, getEventsForSlot, timeSlots.length]);

  // Handle drag start
  const handleDragStart = useCallback((event: CalendarEvent, e: React.DragEvent) => {
    if (readOnly || event.isReadOnly) {
      e.preventDefault();
      return;
    }
    
    setDraggedEvent(event);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  }, [readOnly]);

  // Handle drag over
  const handleDragOver = useCallback((day: number, slot: number, e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedEvent) return;
    
    const newSlot: TimeSlot = {
      day,
      slot,
      startTime: timeSlots[slot]?.time || '08:00',
      endTime: timeSlots[Math.min(slot + draggedEvent.duration, timeSlots.length - 1)]?.time || '18:00'
    };
    
    setDragOverSlot(newSlot);
    
    if (canDropInSlot(day, slot, draggedEvent.duration)) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }, [draggedEvent, timeSlots, canDropInSlot]);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback((day: number, slot: number, e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedEvent || !canDropInSlot(day, slot, draggedEvent.duration)) {
      setDraggedEvent(null);
      setDragOverSlot(null);
      setIsDragging(false);
      return;
    }
    
    const newTimeSlot: TimeSlot = {
      day,
      slot,
      startTime: timeSlots[slot]?.time || '08:00',
      endTime: timeSlots[Math.min(slot + draggedEvent.duration, timeSlots.length - 1)]?.time || '18:00'
    };
    
    onEventMove?.(draggedEvent.id, newTimeSlot);
    
    setDraggedEvent(null);
    setDragOverSlot(null);
    setIsDragging(false);
  }, [draggedEvent, canDropInSlot, timeSlots, onEventMove]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null);
    setDragOverSlot(null);
    setIsDragging(false);
  }, []);

  // Handle slot click
  const handleSlotClick = useCallback((day: number, slot: number) => {
    if (isDragging) return;
    
    const timeSlot: TimeSlot = {
      day,
      slot,
      startTime: timeSlots[slot]?.time || '08:00',
      endTime: timeSlots[slot + 1]?.time || '18:00'
    };
    
    onSlotClick?.(timeSlot);
  }, [isDragging, timeSlots, onSlotClick]);

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    if (isDragging) return;
    e.stopPropagation();
    onEventClick?.(event);
  }, [isDragging, onEventClick]);

  // Get color classes for events
  const getEventColorClasses = useCallback((event: CalendarEvent) => {
    if (event.isConflict && showConflicts) {
      return 'bg-red-100 border-red-300 text-red-800';
    }
    
    switch (event.color) {
      case 'green':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'blue':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'purple':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'orange':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'red':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-primary-100 border-primary-300 text-primary-800';
    }
  }, [showConflicts]);

  // Get slot classes
  const getSlotClasses = useCallback((day: number, slot: number) => {
    const baseClasses = 'calendar-cell relative border-r border-b border-gray-200 min-h-16 p-1 transition-colors duration-150';
    
    const isOccupied = getEventsForSlot(day, slot).length > 0;
    const isConflicted = hasConflict(day, slot);
    const isDragTarget = dragOverSlot?.day === day && dragOverSlot?.slot === slot;
    const canDrop = draggedEvent && canDropInSlot(day, slot, draggedEvent.duration);
    
    let classes = baseClasses;
    
    if (isDragTarget) {
      classes += canDrop ? ' bg-green-100 border-green-300' : ' bg-red-100 border-red-300';
    } else if (isConflicted && showConflicts) {
      classes += ' bg-red-50';
    } else if (isOccupied) {
      classes += ' bg-gray-50';
    } else if (highlightAvailableSlots && !isOccupied) {
      classes += ' hover:bg-blue-50 cursor-pointer';
    } else {
      classes += ' hover:bg-gray-50';
    }
    
    return classes;
  }, [getEventsForSlot, hasConflict, dragOverSlot, draggedEvent, canDropInSlot, showConflicts, highlightAvailableSlots]);

  // Responsive grid columns
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`calendar-grid-container ${className}`} ref={gridRef}>
      <div 
        className="calendar-grid overflow-x-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '80px repeat(5, minmax(120px, 1fr))' : '120px repeat(5, 1fr)',
          gap: '1px',
          backgroundColor: '#e5e7eb'
        }}
      >
        {/* Header row */}
        <div className="calendar-header bg-gray-50 font-semibold text-gray-700 p-3 text-center border-r border-gray-200 sticky top-0 z-20">
          {isMobile ? 'Time' : 'Time'}
        </div>
        {days.map((day) => (
          <div
            key={day.index}
            className="calendar-header bg-gray-50 font-semibold text-gray-700 p-3 text-center sticky top-0 z-20"
          >
            {isMobile ? day.short : day.name}
          </div>
        ))}

        {/* Time slots and cells */}
        {timeSlots.map((timeSlot) => (
          <React.Fragment key={timeSlot.index}>
            {/* Time label */}
            <div className="calendar-header bg-gray-50 text-gray-700 p-2 text-center border-r border-gray-200 font-medium text-xs">
              <div>{isMobile ? timeSlot.time : timeSlot.label}</div>
            </div>
            
            {/* Day cells */}
            {days.map((day) => {
              const slotEvents = getEventsForSlot(day.index, timeSlot.index);
              const isFirstSlotOfEvent = (event: CalendarEvent) => 
                event.timeSlot.day === day.index && event.timeSlot.slot === timeSlot.index;
              
              return (
                <div
                  key={`${day.index}-${timeSlot.index}`}
                  className={getSlotClasses(day.index, timeSlot.index)}
                  onClick={() => handleSlotClick(day.index, timeSlot.index)}
                  onDragOver={(e) => handleDragOver(day.index, timeSlot.index, e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(day.index, timeSlot.index, e)}
                >
                  {/* Render events that start in this slot */}
                  {slotEvents
                    .filter(event => isFirstSlotOfEvent(event))
                    .map((event) => (
                      <div
                        key={event.id}
                        className={`absolute inset-x-1 rounded border-2 shadow-sm cursor-pointer transition-all duration-150 ${getEventColorClasses(event)} ${
                          draggedEvent?.id === event.id ? 'opacity-50 z-30' : 'hover:shadow-md z-10'
                        }`}
                        style={{
                          height: `${event.duration * 64 - 4}px`, // 64px per slot minus padding
                          zIndex: draggedEvent?.id === event.id ? 30 : 10
                        }}
                        draggable={!readOnly && !event.isReadOnly}
                        onDragStart={(e) => handleDragStart(event, e)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => handleEventClick(event, e)}
                        title={`${event.title}${event.subtitle ? ` - ${event.subtitle}` : ''}${event.description ? `\n${event.description}` : ''}`}
                      >
                        <div className="p-2 h-full overflow-hidden">
                          <div className="text-xs font-semibold truncate leading-tight">
                            {event.title}
                          </div>
                          {event.subtitle && (
                            <div className="text-xs truncate leading-tight mt-1 opacity-90">
                              {event.subtitle}
                            </div>
                          )}
                          {event.duration > 1 && event.description && (
                            <div className="text-xs truncate leading-tight mt-1 opacity-75">
                              {event.description}
                            </div>
                          )}
                          {/* Duration indicator for mobile */}
                          {isMobile && event.duration > 1 && (
                            <div className="text-xs opacity-75 mt-1">
                              {event.duration}h
                            </div>
                          )}
                        </div>
                        
                        {/* Drag handle */}
                        {!readOnly && !event.isReadOnly && (
                          <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity">
                            <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Conflict indicator */}
                        {event.isConflict && showConflicts && (
                          <div className="absolute top-1 left-1">
                            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  
                  {/* Drop zone indicator */}
                  {dragOverSlot?.day === day.index && dragOverSlot?.slot === timeSlot.index && draggedEvent && (
                    <div className={`absolute inset-1 border-2 border-dashed rounded ${
                      canDropInSlot(day.index, timeSlot.index, draggedEvent.duration) 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-red-400 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-center h-full text-xs font-medium opacity-75">
                        {canDropInSlot(day.index, timeSlot.index, draggedEvent.duration) ? 'Drop here' : 'Cannot drop'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      
      {/* Legend */}
      {(showConflicts || highlightAvailableSlots) && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
          {showConflicts && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded mr-2"></div>
              <span>Conflicts</span>
            </div>
          )}
          {highlightAvailableSlots && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded mr-2"></div>
              <span>Available slots</span>
            </div>
          )}
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded mr-2"></div>
            <span>Occupied</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarGrid;
