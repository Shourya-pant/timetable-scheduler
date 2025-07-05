import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, handleApiError } from '../utils/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ScheduledSlot {
  id: number;
  dept_timetable_id: number;
  assignment_id: number;
  classroom_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  department: string;
  is_global_slot: boolean;
  created_at: string;
  course_name?: string;
  section_code?: string;
  teacher_name?: string;
  room_id?: string;
}

interface DeptTimetable {
  id: number;
  name: string;
  department: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  generation_log?: string;
  solver_stats?: string;
  created_at: string;
  updated_at: string;
}

interface TimetableResults {
  timetable: DeptTimetable;
  scheduled_slots: ScheduledSlot[];
}

const Results: React.FC = () => {
  const { timetableId } = useParams<{ timetableId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [results, setResults] = useState<TimetableResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'sections' | 'teachers' | 'classrooms' | 'calendar'>('calendar');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Time slots configuration (8:00 AM to 6:00 PM in 55-minute slots)
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 8 + Math.floor((i * 55) / 60);
    const minute = (i * 55) % 60;
    return {
      index: i,
      time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      label: `${hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
    };
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Load timetable results
  useEffect(() => {
    if (timetableId) {
      loadTimetableResults();
    }
  }, [timetableId]);

  const loadTimetableResults = async () => {
    if (!timetableId) return;

    try {
      setIsLoading(true);
      setError('');

      const response = await api.dept.getTimetableResults(parseInt(timetableId));
      if (response.data.success) {
        setResults(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load timetable results');
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const getDayName = (dayIndex: number): string => {
    return days[dayIndex] || 'Unknown';
  };

  const getTimeSlot = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = 8 * 60; // 8:00 AM
    return Math.floor((totalMinutes - startMinutes) / 55);
  };

  const getFilteredSlots = () => {
    if (!results) return [];
    
    if (selectedFilter === 'all') {
      return results.scheduled_slots;
    }

    return results.scheduled_slots.filter(slot => {
      switch (activeTab) {
        case 'sections':
          return slot.section_code === selectedFilter;
        case 'teachers':
          return slot.teacher_name === selectedFilter;
        case 'classrooms':
          return slot.room_id === selectedFilter;
        default:
          return true;
      }
    });
  };

  const getUniqueValues = (key: keyof ScheduledSlot) => {
    if (!results) return [];
    
    const values = new Set<string>();
    results.scheduled_slots.forEach(slot => {
      const value = slot[key];
      if (value && typeof value === 'string') {
        values.add(value);
      }
    });
    
    return Array.from(values).sort();
  };

  const renderSectionView = () => {
    const sectionSlots = {};
    getFilteredSlots().forEach(slot => {
      if (!slot.section_code) return;
      
      if (!sectionSlots[slot.section_code]) {
        sectionSlots[slot.section_code] = [];
      }
      sectionSlots[slot.section_code].push(slot);
    });

    return (
      <div className="space-y-6">
        {Object.entries(sectionSlots).map(([sectionCode, slots]) => (
          <div key={sectionCode} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Section {sectionCode}</h3>
              <p className="text-sm text-gray-600">{(slots as ScheduledSlot[]).length} scheduled sessions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(slots as ScheduledSlot[]).map((slot, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {slot.course_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.teacher_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getDayName(slot.day_of_week)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.start_time} - {slot.end_time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.room_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTeacherView = () => {
    const teacherSlots = {};
    getFilteredSlots().forEach(slot => {
      if (!slot.teacher_name) return;
      
      if (!teacherSlots[slot.teacher_name]) {
        teacherSlots[slot.teacher_name] = [];
      }
      teacherSlots[slot.teacher_name].push(slot);
    });

    return (
      <div className="space-y-6">
        {Object.entries(teacherSlots).map(([teacherName, slots]) => (
          <div key={teacherName} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{teacherName}</h3>
              <p className="text-sm text-gray-600">{(slots as ScheduledSlot[]).length} scheduled sessions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(slots as ScheduledSlot[]).map((slot, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {slot.course_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.section_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getDayName(slot.day_of_week)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.start_time} - {slot.end_time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.room_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderClassroomView = () => {
    const roomSlots = {};
    getFilteredSlots().forEach(slot => {
      if (!slot.room_id) return;
      
      if (!roomSlots[slot.room_id]) {
        roomSlots[slot.room_id] = [];
      }
      roomSlots[slot.room_id].push(slot);
    });

    return (
      <div className="space-y-6">
        {Object.entries(roomSlots).map(([roomId, slots]) => (
          <div key={roomId} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Room {roomId}</h3>
              <p className="text-sm text-gray-600">{(slots as ScheduledSlot[]).length} scheduled sessions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(slots as ScheduledSlot[]).map((slot, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {slot.course_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.section_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.teacher_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getDayName(slot.day_of_week)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.start_time} - {slot.end_time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCalendarGrid = () => {
    const filteredSlots = getFilteredSlots();
    
    // Create a grid mapping for slots
    const slotGrid = {};
    filteredSlots.forEach(slot => {
      const timeSlot = getTimeSlot(slot.start_time);
      const key = `${slot.day_of_week}-${timeSlot}`;
      if (!slotGrid[key]) {
        slotGrid[key] = [];
      }
      slotGrid[key].push(slot);
    });

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden" id="calendar-grid">
        <div className="calendar-grid" style={{ gridTemplateColumns: '120px repeat(5, 1fr)' }}>
          {/* Header row */}
          <div className="calendar-header sticky top-0 z-10">Time</div>
          {days.map((day, index) => (
            <div key={index} className="calendar-header sticky top-0 z-10">
              {day}
            </div>
          ))}

          {/* Time slots */}
          {timeSlots.map((timeSlot, slotIndex) => (
            <React.Fragment key={slotIndex}>
              {/* Time label */}
              <div className="calendar-header border-r border-gray-200 text-xs font-medium text-gray-700 p-2">
                {timeSlot.label}
              </div>
              
              {/* Day cells */}
              {days.map((_, dayIndex) => {
                const key = `${dayIndex}-${slotIndex}`;
                const slotsInCell = slotGrid[key] || [];
                
                return (
                  <div
                    key={dayIndex}
                    className={`calendar-cell min-h-16 p-1 border-r border-b border-gray-200 ${
                      slotsInCell.length > 0 ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {slotsInCell.map((slot, index) => (
                      <div
                        key={index}
                        className="text-xs bg-primary-100 text-primary-800 rounded p-1 mb-1 cursor-pointer hover:bg-primary-200 transition-colors"
                        title={`${slot.course_name} - ${slot.section_code} - ${slot.teacher_name} - Room ${slot.room_id}`}
                      >
                        <div className="font-semibold truncate">{slot.course_name}</div>
                        <div className="truncate">{slot.section_code}</div>
                        <div className="truncate text-primary-600">{slot.room_id}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const exportToPDF = async () => {
    if (!results) return;

    setIsExporting(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      // Add title
      pdf.setFontSize(20);
      pdf.text(results.timetable.name, 20, 20);
      
      pdf.setFontSize(12);
      pdf.text(`Department: ${results.timetable.department}`, 20, 30);
      pdf.text(`Generated: ${new Date(results.timetable.created_at).toLocaleDateString()}`, 20, 40);
      pdf.text(`Total Sessions: ${results.scheduled_slots.length}`, 20, 50);

      // Export calendar view
      if (activeTab === 'calendar') {
        const calendarElement = document.getElementById('calendar-grid');
        if (calendarElement) {
          try {
            const canvas = await html2canvas(calendarElement, {
              scale: 2,
              useCORS: true,
              allowTaint: true
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 250;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addPage();
            pdf.text('Calendar View', 20, 20);
            pdf.addImage(imgData, 'PNG', 20, 30, imgWidth, imgHeight);
          } catch (error) {
            console.error('Error capturing calendar:', error);
          }
        }
      }

      // Add tabular data
      pdf.addPage();
      pdf.text('Schedule Details', 20, 20);
      
      let yPosition = 40;
      const lineHeight = 6;
      
      // Add table headers
      pdf.setFontSize(10);
      pdf.text('Course', 20, yPosition);
      pdf.text('Section', 70, yPosition);
      pdf.text('Teacher', 100, yPosition);
      pdf.text('Day', 150, yPosition);
      pdf.text('Time', 180, yPosition);
      pdf.text('Room', 220, yPosition);
      
      yPosition += lineHeight;
      
      // Add line under headers
      pdf.line(20, yPosition, 250, yPosition);
      yPosition += lineHeight;
      
      // Add data rows
      getFilteredSlots().forEach((slot, index) => {
        if (yPosition > 280) { // Start new page if near bottom
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(slot.course_name || '', 20, yPosition);
        pdf.text(slot.section_code || '', 70, yPosition);
        pdf.text(slot.teacher_name || '', 100, yPosition);
        pdf.text(getDayName(slot.day_of_week), 150, yPosition);
        pdf.text(`${slot.start_time}-${slot.end_time}`, 180, yPosition);
        pdf.text(slot.room_id || '', 220, yPosition);
        
        yPosition += lineHeight;
      });

      // Save the PDF
      const fileName = `${results.timetable.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_timetable.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner h-12 w-12 text-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timetable results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Results</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={loadTimetableResults}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Try Again
            </button>
            <Link
              to={user?.role === 'admin' ? '/admin/dashboard' : '/dept/dashboard'}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-600 mb-6">The requested timetable could not be found.</p>
          <Link
            to={user?.role === 'admin' ? '/admin/dashboard' : '/dept/dashboard'}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{results.timetable.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {results.timetable.department} Department | {results.scheduled_slots.length} scheduled sessions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportToPDF}
                disabled={isExporting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isExporting ? (
                  <>
                    <div className="spinner h-4 w-4 mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
              <Link
                to={user?.role === 'admin' ? '/admin/dashboard' : '/dept/dashboard'}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Link>
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
        {/* Status and Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  results.timetable.status === 'completed' ? 'bg-green-100' : 
                  results.timetable.status === 'generating' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <svg className={`w-5 h-5 ${
                    results.timetable.status === 'completed' ? 'text-green-600' : 
                    results.timetable.status === 'generating' ? 'text-yellow-600' : 'text-red-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{results.timetable.status}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-lg font-semibold text-gray-900">{results.scheduled_slots.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unique Teachers</p>
                <p className="text-lg font-semibold text-gray-900">{getUniqueValues('teacher_name').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unique Rooms</p>
                <p className="text-lg font-semibold text-gray-900">{getUniqueValues('room_id').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="calendar">Calendar View</option>
              <option value="sections">By Sections</option>
              <option value="teachers">By Teachers</option>
              <option value="classrooms">By Classrooms</option>
            </select>
          </div>
          <div className="hidden sm:block">
            <nav className="flex space-x-8">
              {[
                { key: 'calendar', label: 'Calendar View', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { key: 'sections', label: 'By Sections', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                { key: 'teachers', label: 'By Teachers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
                { key: 'classrooms', label: 'By Classrooms', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-all`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Filters */}
        {activeTab !== 'calendar' && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 text-sm"
              >
                <option value="all">All {activeTab}</option>
                {getUniqueValues(
                  activeTab === 'sections' ? 'section_code' :
                  activeTab === 'teachers' ? 'teacher_name' : 'room_id'
                ).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mb-8">
          {activeTab === 'calendar' && renderCalendarGrid()}
          {activeTab === 'sections' && renderSectionView()}
          {activeTab === 'teachers' && renderTeacherView()}
          {activeTab === 'classrooms' && renderClassroomView()}
        </div>
      </div>
    </div>
  );
};

export default Results;