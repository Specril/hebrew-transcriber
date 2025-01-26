import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import './App.css';

function App() {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioChunksRef = useRef([]); // Use a ref to store audio chunks
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (recording) {
      const updateVolume = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setVolume(volume);
        }
        if (recording) {
          requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();
    }
  }, [recording]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (recording) stopRecording();
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [recording]);

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = []; // Reset audio chunks

        mediaRecorder.start();
        setRecording(true);

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);

          // Play back the recording
          const audio = new Audio(audioUrl);
          audio.play();

          // Trigger a download for the recording
          const downloadLink = document.createElement('a');
          downloadLink.href = audioUrl;
          downloadLink.download = `recording-${Date.now()}.webm`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);

          console.log('Recorded message saved as:', downloadLink.download);

          // Clean up resources
          audioContextRef.current.close();
          audioContextRef.current = null;
        };
      })
      .catch((error) => {
        console.error('Error accessing microphone:', error);
      });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setVolume(0); // Reset volume
    }
  };

  return (
    <div className="App">
      <button
        onMouseDown={startRecording}
        onTouchStart={startRecording}
        className={recording ? 'recording' : ''}
        style={{
          boxShadow: recording ? `0 0 ${volume}px ${volume / 2}px rgba(97, 218, 251, 0.7)` : 'none'
        }}
      >
        <FaMicrophone />
      </button>
    </div>
  );
}

export default App;
