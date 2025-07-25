'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface AudioAnalysisUploadProps {
  onAnalysisUpload: (analysisData: unknown) => void;
}

export default function AudioAnalysisUpload({ onAnalysisUpload }: AudioAnalysisUploadProps) {
  const [dragActive, setDragActive] = useState(false);

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

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      onAnalysisUpload(data);
    } catch (error) {
      alert('Invalid file format. Please upload a valid JSON file.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 p-4 border-2 border-dashed border-purple-400/50 rounded-lg"
    >
      <div className="text-center">
        <h3 className="text-white font-medium mb-2">Enhanced Audio Analysis</h3>
        <p className="text-gray-300 text-sm mb-4">
          Upload your own audio analysis data for more accurate mood visualization
        </p>
        
        <div
          className={`p-6 rounded-lg border-2 border-dashed transition-colors ${
            dragActive 
              ? 'border-purple-400 bg-purple-400/10' 
              : 'border-gray-500 hover:border-purple-400/70'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
            id="analysis-upload"
          />
          <label
            htmlFor="analysis-upload"
            className="cursor-pointer text-gray-300 hover:text-white"
          >
            <div className="space-y-2">
              <div className="text-2xl">📊</div>
              <div>Drop JSON file here or click to upload</div>
              <div className="text-xs text-gray-400">
                Supports: Spotify API exports, Last.fm data, custom analysis
              </div>
            </div>
          </label>
        </div>
        
        <details className="mt-4 text-left">
          <summary className="text-purple-400 cursor-pointer text-sm">
            How to get better audio analysis data
          </summary>
          <div className="mt-2 text-xs text-gray-400 space-y-2">
            <p>• Use Spotify's Web API with user authentication for real audio features</p>
            <p>• Export data from Last.fm, MusicBrainz, or other music databases</p>
            <p>• Use audio analysis tools like Essentia, librosa, or Spotify's own tools</p>
            <p>• Manual analysis based on your knowledge of the tracks</p>
          </div>
        </details>
      </div>
    </motion.div>
  );
}