/* eslint-disable @typescript-eslint/no-require-imports */
// server.js
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Your frontend URL
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store room information
const rooms = new Map();

// Gemini API translation function
async function translateWithGemini(text, fromLang, toLang) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  console.log("GEMINI_API_KEY=> ", GEMINI_API_KEY)
  
  const systemPrompt = `You are a professional translator. Translate the following text naturally and contextually from
  ${fromLang === 'en' ? 'English' : 'Portuguese'} to ${toLang === 'en' ? 'English' : 'Portuguese'}.
  Focus on conveying the meaning and emotion rather than word-for-word translation.
  Keep the tone and personality of the original message intact. Only return the translated text, nothing else.
  You never provide any explanation or anything, just return the translation`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nText to translate: "${text}"`
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    console.log(data)
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Translation error:', error);
    return `[Translation failed] ${text}`;
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    const { roomCode, language } = data;
    
    // Join the room
    socket.join(roomCode);
    
    // Store user language preference
    socket.language = language;
    socket.roomCode = roomCode;
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, { users: [] });
    }
    
    const room = rooms.get(roomCode);
    room.users.push({ id: socket.id, language });
    
    console.log(`User ${socket.id} joined room ${roomCode} with language ${language}`);
    
    // Notify other users in the room
    socket.to(roomCode).emit('user-joined', { 
      userId: socket.id, 
      language,
      usersCount: room.users.length 
    });
  });

  socket.on('send-message', async (data) => {
    const { message, roomCode } = data;
    const senderLanguage = socket.language;
    
    // Get other users in the room to determine target language
    const room = rooms.get(roomCode);
    if (!room) return;
    
    // Find other users and their languages
    const otherUsers = room.users.filter(user => user.id !== socket.id);
    
    // Translate message for each user with different language
    for (const user of otherUsers) {
      if (user.language !== senderLanguage) {
        try {
          const translatedMessage = await translateWithGemini(
            message.original, 
            senderLanguage, 
            user.language
          );
          
          // Send translated message to specific user
          io.to(user.id).emit('receive-message', {
            id: message.id,
            original: message.original,
            translated: translatedMessage,
            sender: 'other',
            timestamp: message.timestamp
          });
        } catch (error) {
          console.error('Translation failed:', error);
        }
      } else {
        // Same language, no translation needed
        io.to(user.id).emit('receive-message', {
          id: message.id,
          original: message.original,
          translated: message.original,
          sender: 'other',
          timestamp: message.timestamp
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from room
    if (socket.roomCode && rooms.has(socket.roomCode)) {
      const room = rooms.get(socket.roomCode);
      room.users = room.users.filter(user => user.id !== socket.id);
      
      if (room.users.length === 0) {
        rooms.delete(socket.roomCode);
      } else {
        // Notify remaining users
        socket.to(socket.roomCode).emit('user-left', { 
          userId: socket.id,
          usersCount: room.users.length 
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
