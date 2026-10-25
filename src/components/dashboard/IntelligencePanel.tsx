import React, { useState } from 'react';
import { Sparkles, Clock, ArrowRight, Send } from 'lucide-react';

interface IntelligencePanelProps {
  onAskQuestion: (query: string) => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ onAskQuestion }) => {
  const [inputQuery, setInputQuery] = useState<string>('');

  const questions = [
    'What is the BTC candlestick chart showing right now?',
    'What do Long and Short mean in practice trading?',
    'How does leverage affect my virtual gains and losses?',
    'What do stop-loss and take-profit do?',
    'Which Strike traders have the most consistent records?',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuery.trim()) {
      onAskQuestion(inputQuery.trim());
      setInputQuery('');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 space-y-4">
      {/* Header with Green 4-Point Star and AI Badge */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-base text-slate-900 tracking-tight">
            Ask MENSAH
          </h3>
          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Assistant
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Ask anything in plain English about charts, trades, or your practice portfolio.
        </p>
      </div>

      {/* 5 Clickable Question Rows matching reference */}
      <div className="space-y-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onAskQuestion(q)}
            className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs text-slate-700 group-hover:text-slate-900 truncate font-medium">
                {q}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      {/* Input Box matching reference design */}
      <form onSubmit={handleSubmit} className="relative pt-1">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask Mensah anything..."
          className="w-full bg-[#f8fafc] hover:bg-slate-100/70 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-xl pl-3.5 pr-10 py-2.5 border border-slate-200 focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none transition-all shadow-xs"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 mt-0.5 w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
          aria-label="Send query to Mensah Intelligence"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
