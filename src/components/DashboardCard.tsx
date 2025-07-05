import React from 'react';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'disabled';
  className?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  icon,
  onClick,
  disabled = false,
  variant = 'primary',
  className = ''
}) => {
  const baseClasses = "dashboard-card block w-full p-6 rounded-lg shadow transition-all duration-300 ease-in-out cursor-pointer";
  
  const variantClasses = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 hover-shadow hover-scale",
    secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover-shadow hover-scale",
    outline: "bg-white text-gray-900 border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50 hover-shadow hover-scale",
    disabled: "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
  };

  const disabledClasses = disabled 
    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
    : variantClasses[variant];

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`${baseClasses} ${disabledClasses} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-disabled={disabled}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className={`p-3 rounded-lg ${
            variant === 'primary' && !disabled
              ? 'bg-primary-500 bg-opacity-20'
              : variant === 'disabled' || disabled
              ? 'bg-gray-200'
              : 'bg-gray-100'
          }`}>
            {icon}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold mb-2 ${
            variant === 'primary' && !disabled
              ? 'text-white'
              : disabled
              ? 'text-gray-400'
              : 'text-gray-900'
          }`}>
            {title}
          </h3>
          
          <p className={`text-sm leading-relaxed ${
            variant === 'primary' && !disabled
              ? 'text-primary-100'
              : disabled
              ? 'text-gray-400'
              : 'text-gray-600'
          }`}>
            {description}
          </p>
        </div>

        {/* Arrow indicator */}
        {!disabled && (
          <div className="flex-shrink-0">
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${
                variant === 'primary'
                  ? 'text-white'
                  : 'text-gray-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Disabled overlay indicator */}
      {disabled && (
        <div className="absolute top-2 right-2">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0H10m8-9a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default DashboardCard;
