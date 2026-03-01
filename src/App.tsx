import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, UserCheck, UserX, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { AudioRecorder } from './components/AudioRecorder';

// NSUT Logo URL (using a placeholder or generic university icon if not available, but trying to match theme)
// Since I don't have the exact asset, I'll use a text representation or a generic shield icon styled appropriately.

export default function App() {
  const [stage, setStage] = useState<1 | 2>(1);
  const [stage1File, setStage1File] = useState<File | null>(null);
  const [stage2File, setStage2File] = useState<File | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage1Result, setStage1Result] = useState<{ result: string | number; score?: number } | null>(null);
  const [stage2Result, setStage2Result] = useState<{ is_same_speaker: boolean; similarity: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stage2Mode, setStage2Mode] = useState<'upload' | 'record'>('upload');

  const handleStage1Submit = async () => {
    if (!stage1File) return;
    
    setIsProcessing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('audio', stage1File);

    try {
      const response = await fetch('/api/detect-deepfake', {
        method: 'POST',
        body: formData,
      });
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (data.error || data.status === 'error') {
          throw new Error(data.error || data.message || 'Detection failed');
        }
        setStage1Result(data);
        
        const isReal = data.result === 'Real' || data.result === 0 || data.result === '0';
        if (isReal) {
          setTimeout(() => setStage(2), 1500);
        }
      } else {
        const text = await response.text();
        console.error("Server response:", text);
        throw new Error("Server returned an invalid response. Check console for details.");
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStage2Submit = async (file: File) => {
    if (!stage1File) return;
    setStage2File(file);
    
    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('audio1', stage1File);
    formData.append('audio2', file);

    try {
      const response = await fetch('/api/verify-speaker', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();

        if (data.error || data.status === 'error') {
          throw new Error(data.error || data.message || 'Verification failed');
        }

        setStage2Result(data);
      } else {
        const text = await response.text();
        console.error("Server response:", text);
        throw new Error("Server returned an invalid response. Please try again later.");
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setStage(1);
    setStage1File(null);
    setStage2File(null);
    setStage1Result(null);
    setStage2Result(null);
    setError(null);
  };

  const isFake = stage1Result?.result === 'Deepfake' || stage1Result?.result === 1 || stage1Result?.result === '1';
  const isReal = stage1Result?.result === 'Real' || stage1Result?.result === 0 || stage1Result?.result === '0';

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-200 selection:bg-blue-500/30">
      {/* Header */}
      <header className="pt-12 pb-8 text-center px-4">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg shadow-blue-900/20 overflow-hidden p-1">
             {/* Placeholder for NSUT Logo - Using text if image fails */}
             <div className="w-full h-full rounded-full bg-red-700 flex items-center justify-center text-white font-bold text-xs text-center border-2 border-red-800">
               NSUT
             </div>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
          Deepfake Audio Detection System
        </h1>
        <p className="text-lg text-slate-400 font-light">
          Two-Stage Deepfake Detection & Speaker Verification
        </p>
        <p className="text-sm text-slate-500 mt-2 italic">
          Under the guidance of Dr. Sanya Anees
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pb-20">
        
        {/* Error Message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Stage 1 Card */}
        <AnimatePresence mode="wait">
          {stage === 1 && (
            <motion.div
              key="stage1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl"
            >
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-white mb-2">Stage 1: Upload Suspicious Audio</h2>
                <p className="text-slate-400 text-sm">Upload the audio file you want to analyze for authenticity.</p>
              </div>

              <div className="mb-8">
                <FileUpload 
                  onFileSelect={setStage1File} 
                  isLoading={isProcessing}
                />
              </div>

              {/* Result Display for Stage 1 */}
              {stage1Result && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mb-8 p-6 rounded-xl border ${isFake ? 'bg-red-500/10 border-red-500/50' : 'bg-green-500/10 border-green-500/50'} flex flex-col items-center text-center`}
                >
                  {isFake ? (
                    <>
                      <ShieldAlert className="w-16 h-16 text-red-500 mb-3" />
                      <h3 className="text-2xl font-bold text-red-400">Deepfake Detected</h3>
                      <p className="text-red-200/70 mt-1">The audio appears to be AI-generated.</p>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-16 h-16 text-green-500 mb-3" />
                      <h3 className="text-2xl font-bold text-green-400">Real Human Voice</h3>
                      <p className="text-green-200/70 mt-1">The audio appears to be authentic.</p>
                      <p className="text-sm text-slate-400 mt-4 animate-pulse">Proceeding to Stage 2...</p>
                    </>
                  )}
                </motion.div>
              )}

              {/* Action Button */}
              {!stage1Result && (
                <button
                  onClick={handleStage1Submit}
                  disabled={!stage1File || isProcessing}
                  className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center transition-all
                    ${!stage1File || isProcessing 
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40'}
                  `}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Run Deepfake Detection
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              )}
              
              {isFake && (
                <button
                  onClick={reset}
                  className="w-full mt-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Analyze Another File
                </button>
              )}
            </motion.div>
          )}

          {/* Stage 2 Card */}
          {stage === 2 && (
            <motion.div
              key="stage2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl"
            >
              <div className="mb-6 text-center">
                <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium mb-4 border border-green-500/30">
                  Stage 1 Passed: Real Audio
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">Stage 2: Speaker Verification</h2>
                <p className="text-slate-400 text-sm">Verify if the speaker matches the claimed identity.</p>
              </div>

              {/* Toggle Mode */}
              {!stage2Result && (
                <div className="flex justify-center mb-8 bg-slate-900/50 p-1 rounded-lg w-fit mx-auto">
                  <button
                    onClick={() => setStage2Mode('upload')}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${stage2Mode === 'upload' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    Upload Sample
                  </button>
                  <button
                    onClick={() => setStage2Mode('record')}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${stage2Mode === 'record' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    Record Live
                  </button>
                </div>
              )}

              {/* Input Area */}
              {!stage2Result && (
                <div className="mb-8">
                  {stage2Mode === 'upload' ? (
                    <FileUpload 
                      label="Upload Verification Sample"
                      sublabel="Upload a known sample of the speaker"
                      onFileSelect={(file) => handleStage2Submit(file)}
                      isLoading={isProcessing}
                    />
                  ) : (
                    <AudioRecorder 
                      onRecordingComplete={(file) => handleStage2Submit(file)}
                      isLoading={isProcessing}
                    />
                  )}
                </div>
              )}

              {/* Result Display for Stage 2 */}
              {stage2Result && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mb-8 p-6 rounded-xl border ${stage2Result.is_same_speaker ? 'bg-green-500/10 border-green-500/50' : 'bg-yellow-500/10 border-yellow-500/50'} flex flex-col items-center text-center`}
                >
                  {stage2Result.is_same_speaker ? (
                    <>
                      <UserCheck className="w-16 h-16 text-green-500 mb-3" />
                      <h3 className="text-2xl font-bold text-green-400">Identity Verified</h3>
                      <p className="text-green-200/70 mt-1">The speakers match with {(stage2Result.similarity * 100).toFixed(1)}% similarity.</p>
                    </>
                  ) : (
                    <>
                      <UserX className="w-16 h-16 text-yellow-500 mb-3" />
                      <h3 className="text-2xl font-bold text-yellow-400">Identity Mismatch</h3>
                      <p className="text-yellow-200/70 mt-1">The speakers do not match ({(stage2Result.similarity * 100).toFixed(1)}% similarity).</p>
                    </>
                  )}
                </motion.div>
              )}

              {stage2Result && (
                <button
                  onClick={reset}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Start New Verification
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 text-sm border-t border-white/5 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4">
          <p className="font-semibold text-slate-400 mb-4 uppercase tracking-wider text-xs">Project Team</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>Aman Kumar Jha</div>
            <div>Divyesh Kumar</div>
            <div>Rohan Sethi</div>
            <div>Vaibhav Singh</div>
          </div>
          <p className="text-xs opacity-60">
            Department of Electronics & Communication Engineering<br/>
            Netaji Subhas University of Technology, New Delhi-110078
          </p>
        </div>
      </footer>
    </div>
  );
}
