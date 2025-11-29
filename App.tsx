import React, { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import AnalysisSidebar from './components/AnalysisSidebar';
import { AnalysisState, Suggestion, DocumentState, AnalysisType } from './types';
import { checkGrammarAndStyle, verifySources, generateSummary, detectAIContent, extractTextFromFile, verifyTextClaims } from './services/geminiService';

const DEFAULT_TEXT = `Research Methodology
The study utilize a qualitative approach to understands the user behavior. We interviewed 20 particiapnts from diverse backgrounds. The results shows that 80% of users prefer simple interfaces over complex ones. This finding aligns with Smith (2019) who argued that cognitive load affect decision making.

However, the sample size were small which limits the generalizability of the findings. Future research should expands the scope to include more demographics. 

AI technology are rapidly evolving. It is imperative that developers considers ethical implications.`;

const App: React.FC = () => {
  const [doc, setDoc] = useState<DocumentState>({
    text: DEFAULT_TEXT,
    title: 'Untitled Document'
  });

  const [selectedText, setSelectedText] = useState('');
  const [activeTab, setActiveTab] = useState<AnalysisType>(AnalysisType.GRAMMAR);
  
  const [analysis, setAnalysis] = useState<AnalysisState>({
    isAnalyzing: false,
    suggestions: [],
    sources: [],
    claimVerification: [],
    summary: null,
    aiDetection: null,
    error: null
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDoc(prev => ({ ...prev, text: e.target.value }));
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    if (target.selectionStart !== target.selectionEnd) {
        setSelectedText(target.value.substring(target.selectionStart, target.selectionEnd));
    } else {
        setSelectedText('');
    }
  };

  const runAnalysis = async () => {
    if (!doc.text.trim()) return;

    setAnalysis(prev => ({ ...prev, isAnalyzing: true, error: null, claimVerification: [] })); // Clear specific claims on full run
    
    try {
      // Run parallel requests for efficiency
      const [suggestions, sources, summary, aiDetection] = await Promise.all([
        checkGrammarAndStyle(doc.text),
        verifySources(doc.text),
        generateSummary(doc.text),
        detectAIContent(doc.text)
      ]);

      setAnalysis({
        isAnalyzing: false,
        suggestions,
        sources,
        claimVerification: [], // Reset granular checks
        summary,
        aiDetection,
        error: null
      });

      // If AI score is very high, switch to AI tab automatically
      if (aiDetection.score > 80) {
        setActiveTab(AnalysisType.AI_CHECK);
      } else if (suggestions.length > 0) {
        setActiveTab(AnalysisType.GRAMMAR);
      } else if (sources.length > 0) {
        setActiveTab(AnalysisType.SOURCES);
      }

    } catch (err) {
      console.error(err);
      setAnalysis(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        error: "Failed to complete analysis. Please check your internet connection or API key." 
      }));
    }
  };

  const verifySelection = async () => {
    if (!selectedText) return;
    
    setAnalysis(prev => ({ ...prev, isAnalyzing: true, error: null }));
    setActiveTab(AnalysisType.SOURCES);

    try {
      const claims = await verifyTextClaims(selectedText);
      
      setAnalysis(prev => ({
        ...prev,
        isAnalyzing: false,
        claimVerification: claims
      }));
    } catch (err) {
      console.error(err);
      setAnalysis(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        error: "Failed to verify selected text." 
      }));
    }
  };

  const applySuggestion = useCallback((suggestion: Suggestion) => {
    setDoc(prev => {
      // Simple string replacement for MVP. 
      const newText = prev.text.replace(suggestion.originalText, suggestion.suggestedText);
      return { ...prev, text: newText };
    });
    
    // Remove the applied suggestion from the list
    setAnalysis(prev => ({
      ...prev,
      suggestions: prev.suggestions.filter(s => s.id !== suggestion.id)
    }));
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = (e.target?.result as string).split(',')[1];
        if (base64String) {
          try {
            const extractedText = await extractTextFromFile(base64String, file.type);
            setDoc({
              text: extractedText,
              title: file.name
            });
            // Reset analysis state for new doc
            setAnalysis({
              isAnalyzing: false,
              suggestions: [],
              sources: [],
              claimVerification: [],
              summary: null,
              aiDetection: null,
              error: null
            });
          } catch (err) {
             setAnalysis(prev => ({...prev, error: "Failed to read document text. The format might not be supported."}));
          } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      setAnalysis(prev => ({...prev, error: "Failed to upload file."}));
    }
  };

  const wordCount = doc.text.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative min-w-0">
          
          {/* Toolbar */}
          <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shadow-sm z-10">
            <div className="flex items-center space-x-4">
              {/* File Upload Button */}
              <div className="relative">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.txt,image/*"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || analysis.isAnalyzing}
                  className="flex items-center space-x-2 text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {isUploading ? (
                     <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                  <span>{isUploading ? 'Extracting...' : 'Upload Doc'}</span>
                </button>
              </div>

              <div className="h-4 w-[1px] bg-slate-200"></div>

              <div className="text-xs text-slate-500 font-mono">
                {wordCount} words
              </div>
            </div>
            
            <div className="flex space-x-2">
              {selectedText && (
                <button
                  onClick={verifySelection}
                  disabled={analysis.isAnalyzing}
                  className="flex items-center space-x-2 px-4 py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-full text-sm font-bold transition-all animate-fade-in"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Verify Selection</span>
                </button>
              )}

              <button
                onClick={runAnalysis}
                disabled={analysis.isAnalyzing || !doc.text.trim() || isUploading}
                className={`
                  flex items-center space-x-2 px-6 py-2 rounded-full text-sm font-bold transition-all
                  ${analysis.isAnalyzing || !doc.text.trim() || isUploading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'}
                `}
              >
                {analysis.isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>Full Scan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Text Input */}
          <div className="flex-1 p-8 overflow-y-auto bg-white" onClick={() => document.getElementById('main-editor')?.focus()}>
            <textarea
              id="main-editor"
              className="w-full h-full resize-none outline-none border-none text-lg text-slate-800 leading-relaxed font-serif placeholder-slate-300"
              placeholder="Paste text or upload a PDF/Word document to begin..."
              value={doc.text}
              onChange={handleTextChange}
              onSelect={handleSelect}
              spellCheck="false" 
            />
          </div>
        </div>

        {/* Sidebar */}
        <AnalysisSidebar 
          analysisState={analysis}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onApplySuggestion={applySuggestion}
        />
      </main>
    </div>
  );
};

export default App;