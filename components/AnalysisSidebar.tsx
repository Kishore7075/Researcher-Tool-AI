import React from 'react';
import { AnalysisState, Suggestion, SourceMatch, AnalysisType, VerificationResult } from '../types';

interface AnalysisSidebarProps {
  analysisState: AnalysisState;
  activeTab: AnalysisType;
  onApplySuggestion: (suggestion: Suggestion) => void;
  onSelectTab: (tab: AnalysisType) => void;
}

const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({ 
  analysisState, 
  activeTab, 
  onApplySuggestion, 
  onSelectTab 
}) => {
  const { isAnalyzing, suggestions, sources, claimVerification, summary, aiDetection, error } = analysisState;

  const renderTabs = () => (
    <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
      <button
        onClick={() => onSelectTab(AnalysisType.GRAMMAR)}
        className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors ${activeTab === AnalysisType.GRAMMAR ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
      >
        Issues ({suggestions.length})
      </button>
      <button
        onClick={() => onSelectTab(AnalysisType.AI_CHECK)}
        className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors ${activeTab === AnalysisType.AI_CHECK ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
      >
        AI Check
      </button>
      <button
        onClick={() => onSelectTab(AnalysisType.SOURCES)}
        className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors ${activeTab === AnalysisType.SOURCES ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
      >
        Sources
      </button>
      <button
        onClick={() => onSelectTab(AnalysisType.SUMMARY)}
        className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors ${activeTab === AnalysisType.SUMMARY ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
      >
        Summary
      </button>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'Questionable': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'False': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const renderContent = () => {
    if (isAnalyzing) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm">Analyzing document...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      );
    }

    switch (activeTab) {
      case AnalysisType.GRAMMAR:
        if (suggestions.length === 0) {
          return (
            <div className="p-8 text-center text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No issues found! Great job.</p>
            </div>
          );
        }
        return (
          <div className="space-y-4 p-4 pb-24 overflow-y-auto h-full custom-scrollbar">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 relative group">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full 
                    ${suggestion.type === 'Grammar' ? 'bg-red-100 text-red-700' : 
                      suggestion.type === 'Spelling' ? 'bg-orange-100 text-orange-700' :
                      suggestion.type === 'Clarity' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {suggestion.type}
                  </span>
                  <span className="text-xs text-slate-400">{suggestion.severity}</span>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1 line-through decoration-red-300 decoration-2">{suggestion.originalText}</p>
                  <p className="text-sm font-semibold text-slate-800 bg-green-50 p-1 rounded -ml-1 inline-block">{suggestion.suggestedText}</p>
                </div>
                
                <p className="text-sm text-slate-600 mb-3">{suggestion.explanation}</p>
                
                <button 
                  onClick={() => onApplySuggestion(suggestion)}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Accept Fix</span>
                </button>
              </div>
            ))}
          </div>
        );

      case AnalysisType.AI_CHECK:
        if (!aiDetection) {
           return (
            <div className="p-8 text-center text-slate-400">
              <p>Run analysis to detect AI content.</p>
            </div>
          );
        }
        
        const isHighAI = aiDetection.score > 70;
        const isLowAI = aiDetection.score < 30;
        const scoreColor = isHighAI ? 'text-red-600' : isLowAI ? 'text-green-600' : 'text-orange-600';
        const barColor = isHighAI ? 'bg-red-500' : isLowAI ? 'bg-green-500' : 'bg-orange-500';

        return (
          <div className="p-4 pb-24 overflow-y-auto h-full custom-scrollbar">
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">AI Probability</h3>
             
             <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center mb-4">
                <div className={`text-4xl font-bold mb-1 ${scoreColor}`}>
                  {aiDetection.score}%
                </div>
                <div className="text-sm font-medium text-slate-600 mb-4">{aiDetection.label}</div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
                  <div 
                    className={`h-3 rounded-full transition-all duration-1000 ${barColor}`} 
                    style={{ width: `${aiDetection.score}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                  <span>Human</span>
                  <span>AI</span>
                </div>
             </div>

             <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Analysis</h4>
                <p className="text-sm text-blue-900">{aiDetection.explanation}</p>
             </div>
          </div>
        );

      case AnalysisType.SOURCES:
        if (claimVerification.length > 0) {
          return (
            <div className="space-y-4 p-4 pb-24 overflow-y-auto h-full custom-scrollbar">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Claims Verification</h3>
              {claimVerification.map((result) => (
                <div key={result.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${getStatusColor(result.status)}`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mb-2">"{result.claim}"</p>
                  <p className="text-xs text-slate-600 mb-3 bg-slate-50 p-2 rounded">{result.explanation}</p>
                  
                  {result.sources && result.sources.length > 0 && (
                    <div className="border-t border-slate-100 pt-2 mt-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Evidence</p>
                      {result.sources.map((source, i) => (
                        <a key={i} href={source.url} target="_blank" rel="noreferrer" className="block text-xs text-indigo-600 hover:underline truncate mb-1">
                          {source.title || source.url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="text-center pt-4">
                 <button onClick={() => {}} className="text-xs text-slate-400 underline">Clear Results</button>
              </div>
            </div>
          );
        }

        if (sources.length === 0) {
           return (
            <div className="p-8 text-center text-slate-400">
              <p>No external sources matched yet. Run analysis or verify a specific selection.</p>
            </div>
          );
        }
        return (
          <div className="space-y-4 p-4 pb-24 overflow-y-auto h-full custom-scrollbar">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Found Resources</h3>
            {sources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.url} 
                target="_blank" 
                rel="noreferrer"
                className="block bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 transition-colors p-4"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div className="ml-3 overflow-hidden">
                    <p className="text-sm font-medium text-slate-800 truncate">{source.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-1">{source.url}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        );

      case AnalysisType.SUMMARY:
        return (
          <div className="p-4 pb-24 overflow-y-auto h-full custom-scrollbar">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Document Abstract</h3>
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
              {summary ? (
                <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">Run analysis to generate a summary.</p>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <aside className="w-80 md:w-96 bg-white border-l border-slate-200 flex flex-col h-full absolute right-0 top-0 md:relative z-20 shadow-xl md:shadow-none">
      {renderTabs()}
      <div className="flex-1 overflow-hidden relative">
        {renderContent()}
      </div>
    </aside>
  );
};

export default AnalysisSidebar;