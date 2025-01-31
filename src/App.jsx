import React, { useState, useRef, useEffect } from "react";
import { FaMicrophone } from "react-icons/fa";
import "./App.css";

function App() {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [socket, setSocket] = useState(null);
  const [transcription, setTranscription] = useState("");
  const PASSWORD = "tomer"; // Replace with actual password

  useEffect(() => {
    // Correct WebSocket URL format
    const ws = new WebSocket("wss://1846-2a06-c701-c650-8a00-7957-4e41-f6ff-97d2.ngrok-free.app/transcribe");

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(PASSWORD); // Send password for authentication
    };

    ws.onmessage = (event) => {
      console.log("Transcription received:", event.data);
      setTranscription(event.data);
    };

    ws.onerror = (error) => console.error("WebSocket error:", error);

    ws.onclose = () => {
      console.log("WebSocket closed, attempting to reconnect...");
      setTimeout(() => {
        setSocket(new WebSocket("wss://a779-2a06-c701-c650-8a00-7957-4e41-f6ff-97d2.ngrok-free.app/transcribe"));
      }, 3000);
    };

    setSocket(ws);
    return () => ws.close();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(reader.result); // Send raw binary data
          }
        };
        reader.readAsArrayBuffer(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="App">
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        className={recording ? "recording" : ""}
      >
        <FaMicrophone />
      </button>
      <p>Transcription: {transcription}</p>
    </div>
  );
}

export default App;
