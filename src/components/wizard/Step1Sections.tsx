import React, { useState, useEffect } from 'react';

interface SectionData {
  code: string;
}

interface Step1SectionsProps {
  data: {
    sections: SectionData[];
  };
  onSubmit: (sections: SectionData[]) => void;
  onDataChange: (data: { sections: SectionData[] }) => void;
  isLoading: boolean;
}

const Step1Sections: React.FC<Step1SectionsProps> = ({
  data,
  onSubmit,
  onDataChange,
  isLoading
}) => {
  const [sections, setSections] = useState<SectionData[]>(
    data.sections.length > 0 ? data.sections : [{ code: '' }]
  );
  const [errors, setErrors] = useState<{ [key: number]: string }>({});

  // Update parent component when sections change
  useEffect(() => {
    const validSections = sections.filter(section => section.code.trim() !== '');
    onDataChange({ sections: validSections });
  }, [sections, onDataChange]);

  const addSection = () => {
    setSections([...sections, { code: '' }]);
  };

  const removeSection = (index: number) => {
    if (sections.length > 1) {
      const newSections = sections.filter((_, i) => i !== index);
      setSections(newSections);
      
      // Clear error for this index
      const newErrors = { ...errors };
      delete newErrors[index];
      // Adjust error indices for remaining sections
      const adjustedErrors: { [key: number]: string } = {};
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

  const updateSection = (index: number, field: keyof SectionData, value: string) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);

    // Clear error for this field
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const validateSections = (): boolean => {
    const newErrors: { [key: number]: string } = {};
    const usedCodes = new Set<string>();

    sections.forEach((section, index) => {
      // Check if section code is empty
      if (!section.code.trim()) {
        newErrors[index] = 'Section code is required';
        return;
      }

      // Check for valid format (basic validation)
      const code = section.code.trim().toUpperCase();
      if (!/^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/.test(code)) {
        newErrors[index] = 'Section code should contain only letters, numbers, and hyphens';
        return;
      }

      // Check for duplicates
      if (usedCodes.has(code)) {
        newErrors[index] = 'Section code must be unique';
        return;
      }

      usedCodes.add(code);
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateSections()) {
      const validSections = sections
        .filter(section => section.code.trim() !== '')
        .map(section => ({
          code: section.code.trim().toUpperCase()
        }));
      
      if (validSections.length === 0) {
        setErrors({ 0: 'At least one section is required' });
        return;
      }

      onSubmit(validSections);
    }
  };

  const hasValidSections = sections.some(section => section.code.trim() !== '');

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
            <h3 className="text-sm font-medium text-blue-800">Section Codes</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Enter the section codes for your department's classes. Examples:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><strong>CS-A:</strong> Computer Science Section A</li>
                <li><strong>CS-B:</strong> Computer Science Section B</li>
                <li><strong>SE-1:</strong> Software Engineering Section 1</li>
                <li><strong>AI-MASTERS:</strong> AI Masters Program</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Section Input Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Class Sections</h3>
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Section
          </button>
        </div>

        <div className="space-y-3">
          {sections.map((section, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={section.code}
                    onChange={(e) => updateSection(index, 'code', e.target.value)}
                    placeholder="Enter section code (e.g., CS-A, SE-1)"
                    className={`block w-full px-3 py-2 border ${
                      errors[index] ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all`}
                  />
                  {errors[index] && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {errors[index] && (
                  <p className="mt-1 text-sm text-red-600">{errors[index]}</p>
                )}
              </div>
              
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className="inline-flex items-center p-2 border border-transparent rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {sections.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-2">No sections added yet</p>
            <button
              type="button"
              onClick={addSection}
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
            >
              Add Your First Section
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      {hasValidSections && (
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
                    {sections.filter(s => s.code.trim() !== '').length} section{sections.filter(s => s.code.trim() !== '').length !== 1 ? 's' : ''}
                  </strong>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sections
                    .filter(s => s.code.trim() !== '')
                    .map((section, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {section.code.trim().toUpperCase()}
                      </span>
                    ))}
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
          disabled={!hasValidSections || isLoading}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading && (
            <div className="spinner h-5 w-5 mr-2"></div>
          )}
          {isLoading ? 'Saving Sections...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
};

export default Step1Sections;
