import React, { useState, useRef, useEffect } from "react";
import { FaMicrophone } from "react-icons/fa";
import "./App.css";

function App() {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [socket, setSocket] = useState(null);
  const [transcription, setTranscription] = useState("");

  useEffect(() => {
    // Establish WebSocket connection to the server
    const ws = new WebSocket("ws://10.0.0.21:443/transcribe");
    setSocket(ws);

    ws.onopen = () => console.log("WebSocket connected");

    ws.onmessage = (event) => {
      console.log("Transcription received:", event.data);
      setTranscription(event.data);
    };

    ws.onclose = () => console.log("WebSocket closed");

    return () => ws.close();
  }, []);

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = () => {
            const buffer = reader.result;
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(buffer); // Send raw binary data to WebSocket
            }
          };
          reader.readAsArrayBuffer(audioBlob);
        };

        mediaRecorder.start();
        setRecording(true);
      })
      .catch((error) => console.error("Error accessing microphone:", error));
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
