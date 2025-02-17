"use client"
import React, { useState } from "react";
import { Upload, AlertTriangle, MessageCircle, Sparkles, Clock, MessageSquare, Users } from "lucide-react";
import { Card, CardContent} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AnalysisResult {
  roast: string;
  averageResponseTime: string;
  topWords: string[];
  relationshipPhrase: string;
}

const FloatingHearts = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 5}s`
          }}
        >
          <span className="text-pink-500 opacity-60">❤️</span>
        </div>
      ))}
    </div>
  );
};

const WhatsAppRoster: React.FC = () => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/plain") {
      setFile(droppedFile);
    } else {
      alert("Please upload a valid .txt file.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/plain") {
      setFile(selectedFile);
    } else {
      alert("Please upload a valid .txt file.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/analyse-chat", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setAnalysis(data.analysis);
      setIsRevealed(true); // Trigger reveal animations
    } catch (error) {
      console.error("Error analyzing chat:", error);
      alert("An error occurred while analyzing the chat.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen relative transition-all duration-1000 ${
      isRevealed 
        ? "bg-gradient-to-b from-purple-900 via-pink-900 to-purple-900" 
        : "bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900"
    }`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-20" />
      
      {/* Dynamic glowing orbs */}
      <div className={`absolute top-20 left-20 w-32 h-32 rounded-full blur-3xl opacity-20 transition-all duration-1000
        ${isRevealed ? 'bg-pink-500 animate-pulse-fast' : 'bg-purple-500 animate-pulse'}`} />
      <div className={`absolute bottom-20 right-20 w-32 h-32 rounded-full blur-3xl opacity-20 transition-all duration-1000
        ${isRevealed ? 'bg-purple-500 animate-pulse-fast' : 'bg-pink-500 animate-pulse'}`} />

      {/* Floating hearts when revealed */}
      {isRevealed && <FloatingHearts />}

      {/* Main content */}
      <div className="relative z-10 container mx-auto min-h-screen py-12 px-4">
        <div className={`text-center mb-8 transition-all duration-500 ${isRevealed ? 'scale-110' : ''}`}>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-4 flex items-center justify-center gap-3">
            <Sparkles className={`w-8 h-8 text-purple-400 animate-pulse'}`} />
            TextPosed  🔍
            <Sparkles className={`w-8 h-8 text-pink-400 animate-pulse'}`} />
          </h1>
          <p className="text-gray-400 text-lg">Uncover the hidden meanings in your messages 🔮</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-8">
          <Card className={`bg-gray-800/50 border-0 backdrop-blur-lg shadow-2xl transition-all duration-500 ${
            isRevealed ? 'scale-105' : ''
          }`}>
            <CardContent className="p-6">
              <div
                className={`border-2 rounded-xl p-8 text-center transition-all backdrop-blur-sm
                  ${isDragging ? "border-purple-500 bg-purple-900/30" : "border-gray-700 bg-gray-800/30"}
                  ${file ? "border-green-500 bg-green-900/30" : ""}
                  hover:border-purple-400 hover:bg-purple-900/20
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className={`w-16 h-16 mx-auto mb-4 text-purple-400 transition-all
          ${!file ? 'animate-bounce' : 'transform rotate-0'}
        `}  />
                <div className="text-gray-300">
                  {file ? (
                    <p className="text-green-400 font-medium flex items-center justify-center gap-2">
                     
                      {file.name}
                    </p>
                  ) : (
                    <>
                      <p className="font-medium text-lg mb-2">Drop your chat file here! 📂</p>
                      <p className="text-gray-400 mb-4">or</p>
                      <input
                        type="file"
                        accept=".txt"
                        onChange={handleFileChange}
                        className="hidden"
                        id="fileInput"
                      />
                      <label htmlFor="fileInput">
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all hover:scale-105">
                          Choose File 📁
                        </Button>
                      </label>
                    </>
                  )}
                </div>
              </div>

              <Alert className="mt-6 bg-gray-800/50 border border-purple-500/30">
                <AlertTriangle className="w-6 h-6 text-purple-400 " />
                <AlertDescription className="text-gray-300 p-2">
                  Get ready for 😱 revelations, 😂 surprises, and 🤔 insights!
                </AlertDescription>
              </Alert>

              <Button
                className={`w-full mt-6 h-14 text-lg font-bold text-white transition-all hover:scale-102 disabled:opacity-50
                  ${isRevealed 
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  }`}
                disabled={!file || loading}
                onClick={handleUpload}
              >
                {loading ? "🔄 Analyzing..." : "🔮 Reveal The Truth 🔮"}
              </Button>
            </CardContent>
          </Card>

          {analysis && (
            <div className="space-y-6 animate-fade-in">
              {/* Roast Analysis */}
              <Card className="bg-gray-800/50 border-0 backdrop-blur-lg shadow-2xl transform transition-all hover:scale-105">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    The Roast 🔥
                  </h3>
                  <p className="text-gray-300">{analysis.roast}</p>
                </CardContent>
              </Card>

              {/* Response Time */}
              <Card className="bg-gray-800/50 border-0 backdrop-blur-lg shadow-2xl transform transition-all hover:scale-105">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    Response Time ⏱️
                  </h3>
                  <p className="text-gray-300">Average response time: {analysis.averageResponseTime}</p>
                </CardContent>
              </Card>

              {/* Top Words */}
              <Card className="bg-gray-800/50 border-0 backdrop-blur-lg shadow-2xl transform transition-all hover:scale-105">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-purple-400 mb-4">Top 5 Words 📊</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topWords.map((word, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-500/20 rounded-full text-purple-300"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Relationship Analysis */}
              <Card className="bg-gray-800/50 border-0 backdrop-blur-lg shadow-2xl transform transition-all hover:scale-105">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    Relationship Status 💝
                  </h3>
                  <p className="text-gray-300">{analysis.relationshipPhrase}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppRoster;


const styles = `
  @keyframes float {
    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
    20% { opacity: 0.8; }
}
  }

  .animate-float {
    animation: float 6s ease-in-out infinite;
  }

  .animate-pulse-fast {
    animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animate-fade-in {
    animation: fadeIn 1s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;