import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, handleApiError } from '../utils/api';
import DashboardCard from '../components/DashboardCard';
import Header from '../components/Header';

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
        sections: sectionsResponse.data.success && sectionsResponse.data.data ? sectionsResponse.data.data.length : 0,
        teachers: teachersResponse.data.success && teachersResponse.data.data ? teachersResponse.data.data.length : 0,
        courses: coursesResponse.data.success && coursesResponse.data.data ? coursesResponse.data.data.length : 0,
        classrooms: classroomsResponse.data.success && classroomsResponse.data.data ? classroomsResponse.data.data.length : 0,
        assignments: assignmentsResponse.data.success && assignmentsResponse.data.data ? assignmentsResponse.data.data.length : 0,
        rules: rulesResponse.data.success && rulesResponse.data.data ? rulesResponse.data.data.length : 0,
        timetables: timetablesResponse.data.success && timetablesResponse.data.data ? timetablesResponse.data.data.length : 0
      });

      // Update recent timetables
      if (timetablesResponse.data.success && timetablesResponse.data.data) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Modern Header with Logo */}
      <Header 
        title={`${user?.department} Department`}
        subtitle={`Welcome back, ${user?.name} | Department Head`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 rounded-lg p-4 shadow-sm">
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

        {/* Readiness Status - Modern Design */}
        <div className={`mb-8 rounded-xl p-6 shadow-lg border-l-4 ${
          readiness.ready 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400' 
            : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0 p-2 rounded-full bg-white shadow-sm">
              {readiness.ready ? (
                <svg className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-lg font-semibold ${readiness.ready ? 'text-green-800' : 'text-yellow-800'}`}>
                {readiness.ready ? 'System Ready' : 'Setup Required'}
              </h3>
              <p className={`text-sm ${readiness.ready ? 'text-green-700' : 'text-yellow-700'}`}>
                {readiness.message}
              </p>
            </div>
            {readiness.ready && (
              <button
                onClick={handleCreateTimetable}
                className="ml-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                Create Timetable
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Department Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { label: 'Sections', value: stats.sections, color: 'from-blue-500 to-blue-600', icon: '📚' },
              { label: 'Teachers', value: stats.teachers, color: 'from-green-500 to-green-600', icon: '👨‍🏫' },
              { label: 'Courses', value: stats.courses, color: 'from-purple-500 to-purple-600', icon: '📖' },
              { label: 'Classrooms', value: stats.classrooms, color: 'from-indigo-500 to-indigo-600', icon: '🏫' },
              { label: 'Assignments', value: stats.assignments, color: 'from-orange-500 to-orange-600', icon: '📋' },
              { label: 'Rules', value: stats.rules, color: 'from-red-500 to-red-600', icon: '⚙️' },
              { label: 'Timetables', value: stats.timetables, color: 'from-pink-500 to-pink-600', icon: '📅' }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="text-center">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-gray-600 mt-1">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Actions - Enhanced Design */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Create New Timetable Card - Enhanced */}
            <div className={`group rounded-xl shadow-lg border-2 transition-all duration-300 hover:scale-105 ${
              readiness.ready 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300 hover:shadow-2xl cursor-pointer' 
                : 'bg-gray-300 border-gray-400 cursor-not-allowed'
            }`}>
              <div 
                className="p-6 text-center text-white"
                onClick={readiness.ready ? handleCreateTimetable : undefined}
              >
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-xl font-bold mb-2">Create New Timetable</h3>
                <p className="text-sm opacity-90">Start the 7-step wizard to generate a new optimized timetable</p>
                {!readiness.ready && (
                  <div className="mt-3 text-xs bg-black bg-opacity-20 rounded-full px-3 py-1 inline-block">
                    Complete setup first
                  </div>
                )}
              </div>
            </div>

            {/* Other Action Cards */}
            {[
              { 
                title: 'Preview Sections', 
                desc: `View and manage your ${stats.sections} sections`,
                icon: '📝',
                color: 'from-green-500 to-green-600',
                onClick: () => navigate('/dept/sections')
              },
              { 
                title: 'Preview Teachers', 
                desc: `View and manage your ${stats.teachers} teachers`,
                icon: '👥',
                color: 'from-purple-500 to-purple-600',
                onClick: () => navigate('/dept/teachers')
              },
              { 
                title: 'View All Timetables', 
                desc: `Access your ${stats.timetables} existing timetables`,
                icon: '📊',
                color: 'from-indigo-500 to-indigo-600',
                onClick: () => navigate('/dept/timetables')
              }
            ].map((action, index) => (
              <div 
                key={index}
                className={`group rounded-xl shadow-lg border-2 border-opacity-20 bg-gradient-to-br ${action.color} transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer`}
                onClick={action.onClick}
              >
                <div className="p-6 text-center text-white">
                  <div className="text-4xl mb-4">{action.icon}</div>
                  <h3 className="text-lg font-bold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Management - Enhanced */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Data Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Courses & Labs',
                desc: `Manage your ${stats.courses} courses and lab sessions`,
                icon: '📚',
                color: 'border-orange-200 hover:border-orange-300',
                bgColor: 'hover:bg-orange-50',
                iconColor: 'text-orange-600',
                onClick: () => navigate('/dept/courses')
              },
              {
                title: 'Classrooms',
                desc: `Configure your ${stats.classrooms} available rooms`,
                icon: '🏫',
                color: 'border-blue-200 hover:border-blue-300',
                bgColor: 'hover:bg-blue-50',
                iconColor: 'text-blue-600',
                onClick: () => navigate('/dept/classrooms')
              },
              {
                title: 'Course Assignments',
                desc: `Manage ${stats.assignments} course-teacher-section assignments`,
                icon: '🔗',
                color: 'border-red-200 hover:border-red-300',
                bgColor: 'hover:bg-red-50',
                iconColor: 'text-red-600',
                onClick: () => navigate('/dept/assignments')
              }
            ].map((item, index) => (
              <div 
                key={index}
                className={`bg-white rounded-xl shadow-sm border-2 ${item.color} ${item.bgColor} transition-all duration-300 hover:shadow-lg cursor-pointer group`}
                onClick={item.onClick}
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="text-3xl mr-4">{item.icon}</div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-700">{item.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Timetables - Enhanced Table */}
        {recentTimetables.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Timetables
              </h2>
              <Link
                to="/dept/timetables"
                className="text-indigo-600 hover:text-indigo-500 font-medium flex items-center transition-colors"
              >
                View All
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Timetable Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTimetables.map((timetable) => (
                      <tr key={timetable.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{timetable.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(timetable.status)}`}>
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
                              className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Results
                            </Link>
                          ) : (
                            <span className="text-gray-400 text-sm">
                              {timetable.status === 'generating' ? (
                                <span className="flex items-center">
                                  <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Generating...
                                </span>
                              ) : 'Unavailable'}
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

        {/* Help Section - Enhanced */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-8 border border-blue-200 shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0 p-3 bg-white rounded-full shadow-sm">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-6 flex-1">
              <h3 className="text-xl font-bold text-blue-900 mb-3">Getting Started with Timetable Creation</h3>
              <div className="text-blue-800 mb-4">
                <p className="mb-4">To create your first optimized timetable, complete these essential steps:</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li className="flex items-center"><span className="text-green-600 mr-2">✓</span>Add your class sections</li>
                    <li className="flex items-center"><span className="text-green-600 mr-2">✓</span>Configure teacher information and availability</li>
                    <li className="flex items-center"><span className="text-green-600 mr-2">✓</span>Define courses and lab sessions</li>
                    <li className="flex items-center"><span className="text-green-600 mr-2">✓</span>Set up classroom details</li>
                  </ol>
                  <ol className="list-decimal list-inside space-y-2 text-sm" start={5}>
                    <li className="flex items-center"><span className="text-green-600 mr-2">✓</span>Create course-teacher-section assignments</li>
                    <li className="flex items-center"><span className="text-green-600 mr-2">✓</span>Configure scheduling rules and constraints</li>
                    <li className="flex items-center"><span className="text-green-600 mr-2">✓</span>Generate your optimized timetable</li>
                  </ol>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/dept/create-timetable"
                  className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    readiness.ready
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                      : 'bg-gray-400 text-white cursor-not-allowed'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Start Creating Timetable
                </Link>
                <button
                  onClick={loadDashboardData}
                  className="inline-flex items-center px-4 py-3 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeptDashboard;
