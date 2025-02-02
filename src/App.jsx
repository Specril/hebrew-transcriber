import React, { useState, useRef, useEffect } from "react";
import { FaMicrophone } from "react-icons/fa";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import "./App.css";
import cfg from "./cfg.json";

const firebaseConfig = cfg;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PASSWORD = cfg.password;

const fetchNgrokUrl = async () => {
  try {
    const docRef = doc(db, "ngrokUrls", "current");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data()?.url) {
      return `wss:/${docSnap.data().url}/transcribe`;
    } else {
      console.error("No ngrok URL found in Firestore.");
    }
  } catch (error) {
    console.error("Error fetching ngrok URL:", error);
  }
  return "";
};


function App() {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [socket, setSocket] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [webSocketUrl, setWebSocketUrl] = useState("");

  useEffect(() => {
    const getWebSocketUrl = async () => {
      const url = await fetchNgrokUrl();
      if (url) setWebSocketUrl(url);
    };
    getWebSocketUrl();
  }, []);

  useEffect(() => {
    if (!webSocketUrl) return;

    console.log("Initializing WebSocket...");
    const ws = new WebSocket(webSocketUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(PASSWORD);
    };

    ws.onmessage = (event) => {
      console.log("Transcription received:", event.data);
      setTranscription(event.data);
    };

    ws.onerror = (error) => console.error("WebSocket error:", error);

    ws.onclose = () => {
      console.log("WebSocket closed. Reconnecting...");
      setTimeout(() => setSocket(new WebSocket(webSocketUrl)), 3000);
    };

    setSocket(ws);
    return () => ws.close();
  }, [webSocketUrl]);

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
