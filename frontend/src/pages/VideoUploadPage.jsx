import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Play, Film } from 'lucide-react';
import Navbar from '../components/Navbar';

const VideoUploadPage = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus({ type: '', message: '' });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setStatus({ type: '', message: '' });
    }
  };

  const handleUpload = () => {
    if (!file) {
      setStatus({ type: 'error', message: 'Please select a video file first.' });
      return;
    }

    setUploading(true);
    setProgress(15);
    setStatus({ type: 'info', message: 'Uploading video to AWS S3 bucket...' });

    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/v1/upload', true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setProgress(pct);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.success) {
          setProgress(100);
          setStatus({ type: 'success', message: res.message || 'Video successfully uploaded to S3!' });
          setUploadedVideoUrl(res.videoUrl);
        } else {
          setStatus({
            type: 'error',
            message: res.message || 'Failed to upload video to AWS S3.',
          });
        }
      } catch (err) {
        setStatus({ type: 'error', message: 'Unexpected server response: ' + xhr.responseText });
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setStatus({ type: 'error', message: 'Network connection error while uploading.' });
    };

    xhr.send(formData);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-xl bg-zinc-900/90 border border-zinc-800 rounded-xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-red-600/20 text-red-600 mb-3">
              <Film className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Upload 5s Video to S3</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Select your 5-second video clip to upload to AWS S3 and stream directly.
            </p>
          </div>

          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-red-600 bg-red-600/10'
                : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <UploadCloud className="size-10 mx-auto text-zinc-400 mb-2" />
            <p className="text-sm font-medium text-zinc-200">
              {file ? (
                <span className="text-sky-400 font-semibold">{file.name}</span>
              ) : (
                'Click or drag & drop video file here'
              )}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {file
                ? `Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`
                : 'Supports MP4, WebM, MOV (e.g. 5 seconds clip)'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.webm,.mkv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Upload Button */}
          <button
            type="button"
            disabled={uploading || !file}
            onClick={handleUpload}
            className="w-full mt-5 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Uploading to S3 ({progress}%)...
              </>
            ) : (
              <>
                <UploadCloud className="size-5" />
                Upload to AWS S3 Bucket
              </>
            )}
          </button>

          {/* Progress Bar */}
          {uploading && (
            <div className="w-full bg-zinc-800 rounded-full h-2 mt-4 overflow-hidden">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          {/* Status Message */}
          {status.message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
                status.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-400'
                  : status.type === 'error'
                  ? 'bg-red-950/60 border border-red-800 text-red-400'
                  : 'bg-sky-950/60 border border-sky-800 text-sky-400'
              }`}
            >
              {status.type === 'success' && <CheckCircle className="size-5 shrink-0" />}
              {status.type === 'error' && <AlertCircle className="size-5 shrink-0" />}
              {status.type === 'info' && <UploadCloud className="size-5 shrink-0 animate-bounce" />}
              <span>{status.message}</span>
            </div>
          )}

          {/* Video Player (Live from S3) */}
          {uploadedVideoUrl && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-3">
                <Play className="size-4 fill-emerald-400" />
                Live Stream from AWS S3 Bucket:
              </div>

              <div className="overflow-hidden rounded-lg border border-zinc-700 bg-black shadow-lg">
                <video
                  src={uploadedVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full aspect-video object-contain bg-black"
                ></video>
              </div>

              <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-400 break-all">
                <span className="font-semibold text-zinc-200 block mb-1">S3 Object URL:</span>
                <a
                  href={uploadedVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  {uploadedVideoUrl}
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VideoUploadPage;
