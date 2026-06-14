// File: src/components/Steps.jsx
import React from 'react';

export const Steps = ({ steps, current }) => (
  <div className="flex items-center mb-6">
    {steps.map((s, i) => (
      <React.Fragment key={i}>
        <div className={`flex items-center gap-2 text-sm ${current > i ? 'text-green-600' : current === i ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${current > i ? 'bg-green-600 text-white' : current === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {current > i ? '✓' : i + 1}
          </div>
          <span className="whitespace-nowrap">{s}</span>
        </div>
        {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-300 mx-3" />}
      </React.Fragment>
    ))}
  </div>
);
