import React, { useState, useEffect } from 'react';

interface RuleData {
  name: string;
  rule_type: 'lunch_window' | 'max_lectures_per_day' | 'gap_preference' | 'forbidden_time_pairs';
  rule_data: Record<string, any>;
}

interface Step6RulesProps {
  data: {
    rules: RuleData[];
  };
  onSubmit: (rules: RuleData[]) => void;
  onDataChange: (data: { rules: RuleData[] }) => void;
  isLoading: boolean;
}

const Step6Rules: React.FC<Step6RulesProps> = ({
  data,
  onSubmit,
  onDataChange,
  isLoading
}) => {
  const [rules, setRules] = useState<RuleData[]>(data.rules.length > 0 ? data.rules : []);
  const [errors, setErrors] = useState<{ [key: number]: { [field: string]: string } }>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedRuleType, setSelectedRuleType] = useState<RuleData['rule_type']>('lunch_window');
  const [newRule, setNewRule] = useState<RuleData>({
    name: '',
    rule_type: 'lunch_window',
    rule_data: {}
  });

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

  // Rule type templates
  const ruleTemplates = {
    lunch_window: {
      name: 'Lunch Break Window',
      description: 'Prefer no classes during lunch time',
      defaultData: {
        start_slot: 5, // 12:35 PM
        end_slot: 6,   // 1:30 PM
        penalty: 20
      }
    },
    max_lectures_per_day: {
      name: 'Maximum Lectures Per Day',
      description: 'Limit the number of lectures per day for sections',
      defaultData: {
        max_lectures: 6,
        apply_to_all_sections: true,
        section_exceptions: []
      }
    },
    gap_preference: {
      name: 'Gap Preferences',
      description: 'Minimize or allow gaps between classes',
      defaultData: {
        preference: 'minimize', // 'minimize' or 'allow'
        max_gap_hours: 2,
        penalty_weight: 10
      }
    },
    forbidden_time_pairs: {
      name: 'Forbidden Time Slots',
      description: 'Specific times when certain courses cannot be scheduled',
      defaultData: {
        pairs: [] // Array of {course_name, day, slot}
      }
    }
  };

  // Update parent component when rules change
  useEffect(() => {
    onDataChange({ rules });
  }, [rules, onDataChange]);

  const addRule = () => {
    const template = ruleTemplates[selectedRuleType];
    const rule: RuleData = {
      name: template.name,
      rule_type: selectedRuleType,
      rule_data: { ...template.defaultData }
    };
    
    setRules([...rules, rule]);
    setShowAddForm(false);
    setNewRule({
      name: '',
      rule_type: 'lunch_window',
      rule_data: {}
    });
  };

  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    
    // Clear errors for this rule
    const newErrors = { ...errors };
    delete newErrors[index];
    // Adjust error indices for remaining rules
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
  };

  const updateRule = (index: number, field: keyof RuleData, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);

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

  const updateRuleData = (index: number, dataField: string, value: any) => {
    const newRules = [...rules];
    newRules[index].rule_data = {
      ...newRules[index].rule_data,
      [dataField]: value
    };
    setRules(newRules);
  };

  const validateRules = (): boolean => {
    const newErrors: { [key: number]: { [field: string]: string } } = {};
    const usedNames = new Set<string>();

    rules.forEach((rule, index) => {
      const ruleErrors: { [field: string]: string } = {};

      // Validate rule name
      if (!rule.name.trim()) {
        ruleErrors.name = 'Rule name is required';
      } else {
        const name = rule.name.trim().toLowerCase();
        if (usedNames.has(name)) {
          ruleErrors.name = 'Rule name must be unique';
        } else {
          usedNames.add(name);
        }
      }

      // Validate rule-specific data
      if (rule.rule_type === 'lunch_window') {
        const { start_slot, end_slot, penalty } = rule.rule_data;
        if (start_slot >= end_slot) {
          ruleErrors.rule_data = 'End time must be after start time';
        }
        if (penalty < 0 || penalty > 100) {
          ruleErrors.rule_data = 'Penalty must be between 0 and 100';
        }
      } else if (rule.rule_type === 'max_lectures_per_day') {
        const { max_lectures } = rule.rule_data;
        if (max_lectures < 1 || max_lectures > 10) {
          ruleErrors.rule_data = 'Maximum lectures must be between 1 and 10';
        }
      } else if (rule.rule_type === 'gap_preference') {
        const { max_gap_hours, penalty_weight } = rule.rule_data;
        if (max_gap_hours < 0 || max_gap_hours > 8) {
          ruleErrors.rule_data = 'Maximum gap hours must be between 0 and 8';
        }
        if (penalty_weight < 0 || penalty_weight > 100) {
          ruleErrors.rule_data = 'Penalty weight must be between 0 and 100';
        }
      }

      if (Object.keys(ruleErrors).length > 0) {
        newErrors[index] = ruleErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateRules()) {
      onSubmit(rules);
    }
  };

  const renderRuleEditor = (rule: RuleData, index: number) => {
    switch (rule.rule_type) {
      case 'lunch_window':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <select
                  value={rule.rule_data.start_slot || 5}
                  onChange={(e) => updateRuleData(index, 'start_slot', parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  {timeSlots.map(slot => (
                    <option key={slot.index} value={slot.index}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <select
                  value={rule.rule_data.end_slot || 6}
                  onChange={(e) => updateRuleData(index, 'end_slot', parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  {timeSlots.map(slot => (
                    <option key={slot.index} value={slot.index}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Penalty Weight (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rule.rule_data.penalty || 20}
                  onChange={(e) => updateRuleData(index, 'penalty', parseInt(e.target.value) || 20)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Classes scheduled during this time window will be penalized by the specified weight.
              Higher penalty values make it less likely for classes to be scheduled during lunch.
            </p>
          </div>
        );

      case 'max_lectures_per_day':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Lectures Per Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={rule.rule_data.max_lectures || 6}
                  onChange={(e) => updateRuleData(index, 'max_lectures', parseInt(e.target.value) || 6)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`apply-all-${index}`}
                  checked={rule.rule_data.apply_to_all_sections !== false}
                  onChange={(e) => updateRuleData(index, 'apply_to_all_sections', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor={`apply-all-${index}`} className="ml-2 block text-sm text-gray-700">
                  Apply to all sections
                </label>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Limits the number of lecture sessions that can be scheduled for any section in a single day.
              This helps prevent student fatigue and ensures balanced daily schedules.
            </p>
          </div>
        );

      case 'gap_preference':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gap Preference
                </label>
                <select
                  value={rule.rule_data.preference || 'minimize'}
                  onChange={(e) => updateRuleData(index, 'preference', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="minimize">Minimize gaps</option>
                  <option value="allow">Allow reasonable gaps</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Gap Hours
                </label>
                <input
                  type="number"
                  min="0"
                  max="8"
                  step="0.5"
                  value={rule.rule_data.max_gap_hours || 2}
                  onChange={(e) => updateRuleData(index, 'max_gap_hours', parseFloat(e.target.value) || 2)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Penalty Weight (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rule.rule_data.penalty_weight || 10}
                  onChange={(e) => updateRuleData(index, 'penalty_weight', parseInt(e.target.value) || 10)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {rule.rule_data.preference === 'minimize' 
                ? 'Tries to schedule classes with minimal gaps between them for each section.'
                : 'Allows gaps between classes but limits them to the specified maximum hours.'
              }
            </p>
          </div>
        );

      case 'forbidden_time_pairs':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-gray-700">Forbidden Time Slots</h5>
              <button
                type="button"
                onClick={() => {
                  const newPairs = [...(rule.rule_data.pairs || [])];
                  newPairs.push({ course_name: '', day: 0, slot: 0 });
                  updateRuleData(index, 'pairs', newPairs);
                }}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 transition-all"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Forbidden Slot
              </button>
            </div>

            {(rule.rule_data.pairs || []).map((pair: any, pairIndex: number) => (
              <div key={pairIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Course Name Pattern
                    </label>
                    <input
                      type="text"
                      value={pair.course_name || ''}
                      onChange={(e) => {
                        const newPairs = [...(rule.rule_data.pairs || [])];
                        newPairs[pairIndex] = { ...newPairs[pairIndex], course_name: e.target.value };
                        updateRuleData(index, 'pairs', newPairs);
                      }}
                      placeholder="e.g., Lab, Physics"
                      className="block w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Day</label>
                    <select
                      value={pair.day || 0}
                      onChange={(e) => {
                        const newPairs = [...(rule.rule_data.pairs || [])];
                        newPairs[pairIndex] = { ...newPairs[pairIndex], day: parseInt(e.target.value) };
                        updateRuleData(index, 'pairs', newPairs);
                      }}
                      className="block w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      {days.map((day, dayIndex) => (
                        <option key={dayIndex} value={dayIndex}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                    <select
                      value={pair.slot || 0}
                      onChange={(e) => {
                        const newPairs = [...(rule.rule_data.pairs || [])];
                        newPairs[pairIndex] = { ...newPairs[pairIndex], slot: parseInt(e.target.value) };
                        updateRuleData(index, 'pairs', newPairs);
                      }}
                      className="block w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      {timeSlots.map(slot => (
                        <option key={slot.index} value={slot.index}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        const newPairs = (rule.rule_data.pairs || []).filter((_: any, i: number) => i !== pairIndex);
                        updateRuleData(index, 'pairs', newPairs);
                      }}
                      className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 hover:bg-red-50 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(!rule.rule_data.pairs || rule.rule_data.pairs.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">
                No forbidden time slots configured. Click "Add Forbidden Slot" to add restrictions.
              </p>
            )}

            <p className="text-sm text-gray-600">
              Prevents courses matching the specified name pattern from being scheduled at the specified day and time.
              Use this for courses that conflict with external events or facility maintenance.
            </p>
          </div>
        );

      default:
        return <div>Unknown rule type</div>;
    }
  };

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
            <h3 className="text-sm font-medium text-blue-800">Scheduling Rules & Constraints</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Define scheduling rules to optimize your timetable:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><strong>Lunch Window:</strong> Reserve time slots for lunch breaks</li>
                <li><strong>Max Lectures:</strong> Limit daily lectures per section</li>
                <li><strong>Gap Preferences:</strong> Control gaps between classes</li>
                <li><strong>Forbidden Times:</strong> Block specific time slots for certain courses</li>
                <li>Rules are optional - skip this step if you prefer basic scheduling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Scheduling Rules</h3>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Rule
          </button>
        </div>

        {/* Add Rule Form */}
        {showAddForm && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <h4 className="text-md font-medium text-gray-900 mb-3">Add New Rule</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Type
                </label>
                <select
                  value={selectedRuleType}
                  onChange={(e) => setSelectedRuleType(e.target.value as RuleData['rule_type'])}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  {Object.entries(ruleTemplates).map(([key, template]) => (
                    <option key={key} value={key}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end space-x-2">
                <button
                  type="button"
                  onClick={addRule}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                >
                  Add Rule
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {ruleTemplates[selectedRuleType].description}
            </p>
          </div>
        )}

        {/* Existing Rules */}
        <div className="space-y-6">
          {rules.map((rule, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => updateRule(index, 'name', e.target.value)}
                    className={`text-lg font-medium ${
                      errors[index]?.name ? 'border-red-300' : 'border-transparent'
                    } bg-transparent border-b-2 focus:outline-none focus:border-primary-500 transition-all`}
                    placeholder="Rule name"
                  />
                  {errors[index]?.name && (
                    <p className="mt-1 text-sm text-red-600">{errors[index].name}</p>
                  )}
                  <div className="flex items-center mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {ruleTemplates[rule.rule_type].name}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="inline-flex items-center p-2 border border-transparent rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {renderRuleEditor(rule, index)}

              {errors[index]?.rule_data && (
                <p className="mt-2 text-sm text-red-600">{errors[index].rule_data}</p>
              )}
            </div>
          ))}
        </div>

        {rules.length === 0 && !showAddForm && (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduling rules</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add rules to customize your timetable generation, or skip this step for basic scheduling.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Add Rule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Step6Rules;
