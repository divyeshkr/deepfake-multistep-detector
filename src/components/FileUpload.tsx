import React, { useRef, useState } from 'react';
import { Upload, FileAudio, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  sublabel?: string;
  isLoading?: boolean;
}

export function FileUpload({ 
  onFileSelect, 
  accept = "audio/*", 
  label = "Click to upload evidence",
  sublabel = ".wav, .mp3, .m4a, .opus (Max 10MB)",
  isLoading = false
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    onFileSelect(file);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200
          ${dragActive ? "border-blue-500 bg-blue-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-800/50"}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleChange}
          disabled={isLoading}
        />

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
              <p className="text-slate-300">Processing audio...</p>
            </motion.div>
          ) : selectedFile ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center p-4"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <FileAudio className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-lg font-medium text-white mb-1 text-center max-w-xs truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-slate-400 mb-4">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <button
                onClick={clearFile}
                className="flex items-center px-3 py-1.5 text-sm text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center p-4"
            >
              <Upload className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-lg font-medium text-white mb-2">{label}</p>
              <p className="text-sm text-slate-400">{sublabel}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
