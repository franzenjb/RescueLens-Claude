import React from 'react';

export const ExampleReport: React.FC = () => {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-white text-xl font-bold mb-2">Sample PDF Output</h2>
      <p className="text-slate-400 text-sm mb-6">Example of a generated Disaster Damage Assessment Report</p>
      <div className="bg-white rounded-xl p-8 border-4 border-[#ce1126] shadow-[0_0_40px_rgba(206,17,38,0.3)]">
        <img
          src="/examples/sample-report.png"
          alt="Example American Red Cross Disaster Damage Assessment Report"
          className="max-w-2xl w-full h-auto rounded shadow-lg"
        />
      </div>
    </div>
  );
};
