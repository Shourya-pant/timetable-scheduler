import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, handleApiError } from '../utils/api';
import Header from '../components/Header';

interface DashboardStats {
  overview: Record<string, number>;
  department_statistics: Record<string, any>;
  global_scheduler: Record<string, any>;
}

interface Department {
  department: string;
  dept_head: {
    id: number;
    name: string;
    email: string;
  };
  timetables: Array<{
    id: number;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
}

interface Conflict {
  slot_id: number;
  classroom_id: number;
  room_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  requesting_department: string;
  occupying_department: string;
  course_name: string;
  section_code: string;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingConflicts, setIsLoadingConflicts] = useState(false);
  const [isInitializingScheduler, setIsInitializingScheduler] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
    loadDepartments();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await api.admin.getDashboard();
      if (response.data.success && response.data.data) {
        setDashboardStats(response.data.data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.admin.getDepartments();
      if (response.data.success && response.data.data) {
        setDepartments(response.data.data);
      } else {
        setError('Failed to load departments');
      }
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const initializeGlobalScheduler = async () => {
    setIsInitializingScheduler(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.admin.initializeScheduler();
      if (response.data.success) {
        setSuccessMessage('Global scheduler initialized successfully');
        // Reload dashboard data
        await loadDashboardData();
      } else {
        setError('Failed to initialize scheduler');
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsInitializingScheduler(false);
    }
  };

  const detectConflicts = async () => {
    setIsLoadingConflicts(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.admin.detectConflicts();
      if (response.data.success && response.data.data) {
        setConflicts(response.data.data.conflicts);
        setSuccessMessage(
          response.data.data.conflicts.length === 0
            ? 'No conflicts detected across all departments'
            : `Detected ${response.data.data.conflicts.length} conflicts`
        );
      } else {
        setError('Failed to detect conflicts');
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoadingConflicts(false);
    }
  };

  const getDayName = (dayIndex: number): string => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days[dayIndex] || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner h-12 w-12 text-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo */}
      <Header 
        title="Admin Dashboard"
        subtitle={`Welcome back, ${user?.name} | System Administrator`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Statistics */}
        {dashboardStats && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6 hover-shadow transition-all">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Departments</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{dashboardStats.overview.total_departments}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 hover-shadow transition-all">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Timetables</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{dashboardStats.overview.active_timetables}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 hover-shadow transition-all">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Teachers</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{dashboardStats.overview.total_teachers}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 hover-shadow transition-all">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Courses</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{dashboardStats.overview.total_courses}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Scheduling Controls */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Global Scheduling Controls</h2>
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Scheduler Management</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Initialize the global scheduler and detect cross-department conflicts
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={initializeGlobalScheduler}
                    disabled={isInitializingScheduler}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isInitializingScheduler && (
                      <div className="spinner h-4 w-4 mr-2"></div>
                    )}
                    {isInitializingScheduler ? 'Initializing...' : 'Initialize Scheduler'}
                  </button>
                  <button
                    onClick={detectConflicts}
                    disabled={isLoadingConflicts}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoadingConflicts && (
                      <div className="spinner h-4 w-4 mr-2"></div>
                    )}
                    {isLoadingConflicts ? 'Detecting...' : 'Detect Conflicts'}
                  </button>
                </div>
              </div>

              {/* Global Scheduler Stats */}
              {dashboardStats?.global_scheduler && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500">Global Slots</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {dashboardStats.global_scheduler.total_global_slots}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500">Shared Resources</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {dashboardStats.global_scheduler.shared_resources}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500">Departments with Timetables</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {dashboardStats.global_scheduler.departments_with_timetables}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conflicts Display */}
        {conflicts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detected Conflicts</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Room
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conflicting Departments
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {conflicts.map((conflict, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {conflict.room_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getDayName(conflict.day_of_week)} {conflict.start_time} - {conflict.end_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {conflict.course_name} ({conflict.section_code})
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="text-red-600 font-medium">{conflict.requesting_department}</span>
                          {' vs '}
                          <span className="text-blue-600 font-medium">{conflict.occupying_department}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Department Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <div key={dept.department} className="bg-white rounded-lg shadow hover-shadow transition-all">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{dept.department}</h3>
                    <div className="flex items-center space-x-2">
                      {dept.timetables.length > 0 && (
                        <div className="w-3 h-3 bg-green-400 rounded-full" title="Has timetables"></div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Department Head:</span>
                      <span className="font-medium">{dept.dept_head.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span>{dept.dept_head.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timetables:</span>
                      <span className="font-medium">{dept.timetables.length}</span>
                    </div>
                  </div>

                  {dept.timetables.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Timetables</h4>
                      <div className="space-y-2">
                        {dept.timetables.slice(0, 3).map((timetable) => (
                          <div key={timetable.id} className="flex items-center justify-between text-xs">
                            <span className="truncate">{timetable.name}</span>
                            <span className={`px-2 py-1 rounded-full font-medium ${
                              timetable.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : timetable.status === 'generating'
                                ? 'bg-yellow-100 text-yellow-800'
                                : timetable.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {timetable.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      to={`/admin/results/${dept.timetables[0]?.id || 0}`}
                      className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                    >
                      View Department Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/reports/utilization"
              className="dashboard-card bg-white rounded-lg shadow p-6 hover-shadow transition-all block"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Utilization Report</p>
                  <p className="text-sm text-gray-500">View resource usage</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/reports/conflicts"
              className="dashboard-card bg-white rounded-lg shadow p-6 hover-shadow transition-all block"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Conflicts Report</p>
                  <p className="text-sm text-gray-500">Review scheduling conflicts</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/shared-resources"
              className="dashboard-card bg-white rounded-lg shadow p-6 hover-shadow transition-all block"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Shared Resources</p>
                  <p className="text-sm text-gray-500">Manage common facilities</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/system-validation"
              className="dashboard-card bg-white rounded-lg shadow p-6 hover-shadow transition-all block"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">System Validation</p>
                  <p className="text-sm text-gray-500">Validate system integrity</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;