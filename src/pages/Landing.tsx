import React from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
        <div className="animate-fade-in">
          {/* Logo and Title */}
          <div className="mb-12">
            <div className="mb-8 animate-bounce-in">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <img 
                  src="/logo.png" 
                  alt="University Timetable Scheduler" 
                  className="h-16 w-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center shadow-xl">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-slide-in">
              University
              <span className="block text-primary-600 mt-2">Timetable Scheduler</span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-fade-in">
              Effortlessly create optimal class schedules with our advanced constraint-solving technology. 
              Designed for universities to manage complex timetabling challenges.
            </p>
          </div>

          {/* Features */}
          <div className="mb-16 animate-slide-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="bg-white rounded-lg p-6 shadow-lg hover-shadow hover-scale transition-all">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Scheduling</h3>
                <p className="text-gray-600">AI-powered constraint solving to create conflict-free timetables automatically.</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-lg hover-shadow hover-scale transition-all">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Department</h3>
                <p className="text-gray-600">Coordinate schedules across multiple departments with global conflict resolution.</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-lg hover-shadow hover-scale transition-all">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Reports</h3>
                <p className="text-gray-600">Comprehensive reports and visualizations for schedule optimization insights.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 sm:space-y-0 sm:space-x-6 sm:flex sm:justify-center animate-bounce-in">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-all hover-scale btn-primary shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </Link>
            
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary-600 text-lg font-medium rounded-lg text-primary-600 bg-white hover:bg-primary-50 transition-all hover-scale shadow-lg mt-4 sm:mt-0"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Get Started
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-20 pt-8 border-t border-gray-200 animate-fade-in">
            <p className="text-gray-500 text-sm">
              Built with Google OR-Tools • React • Flask • PostgreSQL
            </p>
            <p className="text-gray-400 text-xs mt-2">
              © 2024 University Timetable Scheduler. Optimizing education scheduling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
