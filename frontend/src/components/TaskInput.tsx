import React from 'react';
import { Play, Sparkles } from 'lucide-react';

interface TaskInputProps {
  task: string;
  setTask: (t: string) => void;
  onRun: () => void;
  isLoading: boolean;
  selectedSite: string;
}

export const TaskInput: React.FC<TaskInputProps> = ({ task, setTask, onRun, isLoading, selectedSite }) => {
  const getPresetTasks = () => {
    switch (selectedSite) {
      case 'form':
        return [
          "Fill registration form for Alex Johnson",
          "Apply for tech workshop with mobile contact"
        ];
      case 'ecommerce':
        return [
          "Search for headphones and add to cart",
          "Find smart watch and put in bag"
        ];
      default:
        return [
          "Search for Python courses and open the first result",
          "Look for Machine Learning and select syllabus"
        ];
    }
  };

  const presets = getPresetTasks();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-sky-600" />
        <h2 className="font-semibold text-slate-800 text-lg">Natural Language Task Prompt</h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (task.trim() && !isLoading) onRun();
        }}
        className="flex gap-3 mb-3"
      >
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="e.g. Search for Python courses and open the first result"
          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm md:text-base font-medium shadow-inner"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !task.trim()}
          className={`px-6 py-3 rounded-lg font-bold text-white flex items-center gap-2 shadow-sm transition-all ${
            isLoading || !task.trim()
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-sky-600 hover:bg-sky-700 active:scale-98 cursor-pointer'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Executing Agent...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>RUN AGENT</span>
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
        <span className="font-medium text-slate-500">Preset Prompts:</span>
        {presets.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setTask(preset)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-300 rounded-md transition-colors font-medium text-left"
          >
            "{preset}"
          </button>
        ))}
      </div>
    </div>
  );
};
