import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, handleApiError } from '../utils/api';
import DashboardCard from '../components/DashboardCard';

interface DeptStats {
  sections: number;
  teachers: number;
  courses: number;
  classrooms: number;
  assignments: number;
  rules: number;
  timetables: number;
}

interface DeptTimetable {
  id: number;
  name: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

const DeptDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DeptStats>({
    sections: 0,
    teachers: 0,
    courses: 0,
    classrooms: 0,
    assignments: 0,
    rules: 0,
    timetables: 0
  });
  const [recentTimetables, setRecentTimetables] = useState<DeptTimetable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load department data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Load all department data in parallel
      const [
        sectionsResponse,
        teachersResponse,
        coursesResponse,
        classroomsResponse,
        assignmentsResponse,
        rulesResponse,
        timetablesResponse
      ] = await Promise.all([
        api.dept.getSections(),
        api.dept.getTeachers(),
        api.dept.getCourses(),
        api.dept.getClassrooms(),
        api.dept.getAssignments(),
        api.dept.getRules(),
        api.dept.getTimetables()
      ]);

      // Update stats
      setStats({
        sections: sectionsResponse.data.success ? sectionsResponse.data.data.length : 0,
        teachers: teachersResponse.data.success ? teachersResponse.data.data.length : 0,
        courses: coursesResponse.data.success ? coursesResponse.data.data.length : 0,
        classrooms: classroomsResponse.data.success ? classroomsResponse.data.data.length : 0,
        assignments: assignmentsResponse.data.success ? assignmentsResponse.data.data.length : 0,
        rules: rulesResponse.data.success ? rulesResponse.data.data.length : 0,
        timetables: timetablesResponse.data.success ? timetablesResponse.data.data.length : 0
      });

      // Update recent timetables
      if (timetablesResponse.data.success) {
        setRecentTimetables(timetablesResponse.data.data.slice(0, 5));
      }

    } catch (err) {
      console.error('Dashboard data loading error:', err);
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTimetable = () => {
    navigate('/dept/create-timetable');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReadinessStatus = () => {
    const requiredForTimetable = stats.sections > 0 && stats.teachers > 0 && stats.courses > 0 && stats.classrooms > 0 && stats.assignments > 0;
    return {
      ready: requiredForTimetable,
      message: requiredForTimetable 
        ? 'Ready to create timetable'
        : 'Complete setup: Add sections, teachers, courses, classrooms, and assignments'
    };
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

  const readiness = getReadinessStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user?.department} Department</h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome back, {user?.name} | Department Head
              </p>
            </div>
            <div className="flex items-center space-x-4">
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
        {/* Error Message */}
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

        {/* Readiness Status */}
        <div className={`mb-8 rounded-lg p-4 ${readiness.ready ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {readiness.ready ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${readiness.ready ? 'text-green-800' : 'text-yellow-800'}`}>
                {readiness.message}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.sections}</div>
              <div className="text-sm text-gray-600">Sections</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.teachers}</div>
              <div className="text-sm text-gray-600">Teachers</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.courses}</div>
              <div className="text-sm text-gray-600">Courses</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.classrooms}</div>
              <div className="text-sm text-gray-600">Classrooms</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.assignments}</div>
              <div className="text-sm text-gray-600">Assignments</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rules}</div>
              <div className="text-sm text-gray-600">Rules</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.timetables}</div>
              <div className="text-sm text-gray-600">Timetables</div>
            </div>
          </div>
        </div>

        {/* Main Action Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Create New Timetable Card */}
            <DashboardCard
              title="Create New Timetable"
              description="Start the 7-step wizard to generate a new optimized timetable"
              icon={
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
              onClick={handleCreateTimetable}
              disabled={!readiness.ready}
              variant={readiness.ready ? 'primary' : 'disabled'}
            />

            {/* Preview Sections Card */}
            <DashboardCard
              title="Preview Sections"
              description={`View and manage your ${stats.sections} sections`}
              icon={
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
              onClick={() => navigate('/dept/sections')}
              variant="secondary"
            />

            {/* Preview Teachers Card */}
            <DashboardCard
              title="Preview Teachers"
              description={`View and manage your ${stats.teachers} teachers`}
              icon={
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              onClick={() => navigate('/dept/teachers')}
              variant="secondary"
            />

            {/* View All Timetables Card */}
            <DashboardCard
              title="View All Timetables"
              description={`Access your ${stats.timetables} existing timetables`}
              icon={
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              onClick={() => navigate('/dept/timetables')}
              variant="secondary"
            />
          </div>
        </div>

        {/* Data Management Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Courses Card */}
            <DashboardCard
              title="Courses & Labs"
              description={`Manage your ${stats.courses} courses and lab sessions`}
              icon={
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
              onClick={() => navigate('/dept/courses')}
              variant="outline"
            />

            {/* Classrooms Card */}
            <DashboardCard
              title="Classrooms"
              description={`Configure your ${stats.classrooms} available rooms`}
              icon={
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
              onClick={() => navigate('/dept/classrooms')}
              variant="outline"
            />

            {/* Assignments Card */}
            <DashboardCard
              title="Course Assignments"
              description={`Manage ${stats.assignments} course-teacher-section assignments`}
              icon={
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              }
              onClick={() => navigate('/dept/assignments')}
              variant="outline"
            />
          </div>
        </div>

        {/* Recent Timetables */}
        {recentTimetables.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Timetables</h2>
              <Link
                to="/dept/timetables"
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                View All →
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTimetables.map((timetable) => (
                      <tr key={timetable.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{timetable.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timetable.status)}`}>
                            {timetable.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(timetable.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {timetable.status === 'completed' ? (
                            <Link
                              to={`/dept/results/${timetable.id}`}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              View Results
                            </Link>
                          ) : (
                            <span className="text-gray-400">
                              {timetable.status === 'generating' ? 'Generating...' : 'Unavailable'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-primary-50 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-primary-800">Getting Started</h3>
              <div className="mt-2 text-sm text-primary-700">
                <p className="mb-2">To create your first timetable, you'll need to:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Add your class sections</li>
                  <li>Configure teacher information and availability</li>
                  <li>Define courses and lab sessions</li>
                  <li>Set up classroom details</li>
                  <li>Create course-teacher-section assignments</li>
                  <li>Configure scheduling rules and constraints</li>
                  <li>Generate your optimized timetable</li>
                </ol>
              </div>
              <div className="mt-4">
                <Link
                  to="/dept/create-timetable"
                  className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  Start Creating Timetable
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeptDashboard;
