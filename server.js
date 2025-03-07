const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');

// Configuration
const CONFIG = {
  port: process.env.PORT || 3000,
  apiKey: process.env.GEMINI_API_KEY || '', // Make sure you have this set
  model: 'gemini-2.0-flash-thinking-exp-1219', // Updated to newer model name
  chatSaveDir: path.join(__dirname, 'saved_chats'),
  exportDir: path.join(__dirname, 'exports'),
};

// Initialize Express
const app = express();

// Middleware - IMPORTANT: ORDER MATTERS
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

// File System Utilities
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
    console.log(`Directory exists: ${dirPath}`);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

async function saveChat(chatId, chatData) {
  await ensureDirectoryExists(CONFIG.chatSaveDir);
  const filePath = path.join(CONFIG.chatSaveDir, `chat_${chatId}.json`);
  await fs.writeFile(filePath, JSON.stringify(chatData, null, 2));
  return { success: true, path: filePath };
}

async function loadChat(chatId) {
  const filePath = path.join(CONFIG.chatSaveDir, `chat_${chatId}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { messages: [], settings: {} };
    }
    throw error;
  }
}

async function getChatList() {
  await ensureDirectoryExists(CONFIG.chatSaveDir);
  try {
    const files = await fs.readdir(CONFIG.chatSaveDir);
    
    const chats = await Promise.all(files
      .filter(file => file.startsWith('chat_') && file.endsWith('.json'))
      .map(async (file) => {
        try {
          const chatId = file.replace(/^chat_(.+)\.json$/, '$1');
          const data = await fs.readFile(path.join(CONFIG.chatSaveDir, file), 'utf8');
          const chatData = JSON.parse(data);
          const title = chatData.title || 
                        (chatData.messages && chatData.messages[0]?.content.slice(0, 30) + '...') || 
                        `Chat ${chatId}`;
          
          return {
            id: chatId,
            title: title,
            timestamp: parseInt(chatId),
            messageCount: chatData.messages?.length || 0
          };
        } catch (error) {
          console.error(`Error reading chat file ${file}:`, error);
          return null;
        }
      }));
    
    return chats.filter(chat => chat !== null).sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error getting chat list:", error);
    return [];
  }
}

// Initialize Gemini API if key is provided
let model = null;
if (CONFIG.apiKey) {
  try {
    const genAI = new GoogleGenerativeAI(CONFIG.apiKey);
    model = genAI.getGenerativeModel({ model: CONFIG.model });
    console.log(`Initialized Gemini model: ${CONFIG.model}`);
  } catch (error) {
    console.error('Failed to initialize Gemini API:', error);
  }
}

// Chat logic
async function generateChatResponse(messages) {
  if (!model) {
    return { 
      role: 'assistant', 
      content: 'API key not configured or Gemini API initialization failed. Please check server logs.' 
    };
  }
  
  try {
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({});
    
    // For simplicity, just send the last message
    const lastMessage = formattedMessages[formattedMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const response = result.response.text();
    
    return {
      role: 'assistant',
      content: response
    };
  } catch (error) {
    console.error('Error generating response:', error);
    return {
      role: 'assistant',
      content: `Error generating response: ${error.message}`
    };
  }
}

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    apiConfigured: !!CONFIG.apiKey,
    version: '2.0.0'
  });
});

app.get('/api/chats', async (req, res) => {
  try {
    const chats = await getChatList();
    res.json({ chats });
  } catch (error) {
    console.error('Error getting chat list:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, chatId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const currentChatId = chatId || Date.now().toString();
    let chatData = await loadChat(currentChatId);
    
    if (!chatData.messages) {
      chatData.messages = [];
    }
    
    // Add user message
    chatData.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });
    
    // Generate AI response
    const aiResponse = await generateChatResponse(chatData.messages);
    
    // Add AI response
    chatData.messages.push({
      ...aiResponse,
      timestamp: Date.now()
    });
    
    // Save the updated chat
    await saveChat(currentChatId, chatData);
    
    res.json({
      chatId: currentChatId,
      message: aiResponse.content,
      messages: chatData.messages
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats/:chatId', async (req, res) => {
  try {
    const chatData = await loadChat(req.params.chatId);
    res.json(chatData);
  } catch (error) {
    console.error(`Error loading chat ${req.params.chatId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// IMPORTANT: API routes must be defined BEFORE static file middleware

// Create public directories and files
async function setupPublicFiles() {
  const publicDir = path.join(__dirname, '../public');
  const cssDir = path.join(publicDir, 'css');
  const jsDir = path.join(publicDir, 'js');
  
  await ensureDirectoryExists(publicDir);
  await ensureDirectoryExists(cssDir);
  await ensureDirectoryExists(jsDir);
  
  // Create simple files if they don't exist
  const files = [
    {
      path: path.join(publicDir, 'index.html'),
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple AI Chat</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div class="container">
        <h1>AI Chat</h1>
        <div id="chat-container">
            <div id="messages"></div>
        </div>
        <div class="input-area">
            <textarea id="message-input" placeholder="Type a message..."></textarea>
            <button id="send-btn">Send</button>
        </div>
    </div>
    <script src="js/app.js"></script>
</body>
</html>`
    },
    {
      path: path.join(cssDir, 'styles.css'),
      content: `body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
}
.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}
#chat-container {
    height: 400px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 10px;
    background-color: white;
    margin-bottom: 20px;
}
.message {
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 5px;
}
.user-message {
    background-color: #e3f2fd;
    margin-left: 20%;
}
.ai-message {
    background-color: #f1f1f1;
    margin-right: 20%;
}
.input-area {
    display: flex;
    gap: 10px;
}
#message-input {
    flex-grow: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    resize: vertical;
}
#send-btn {
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}
#send-btn:hover {
    background-color: #45a049;
}`
    },
    {
      path: path.join(jsDir, 'app.js'),
      content: `document.addEventListener('DOMContentLoaded', () => {
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-btn');
    
    function addMessage(content, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'message user-message' : 'message ai-message';
        messageDiv.textContent = content;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Add user message to UI
        addMessage(message, true);
        messageInput.value = '';
        
        try {
            // Send to API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Add AI response to UI
            addMessage(data.message, false);
            
        } catch (error) {
            console.error('Error:', error);
            addMessage('Error: ' + error.message, false);
        }
    }
    
    // Send button click
    sendButton.addEventListener('click', sendMessage);
    
    // Enter key to send
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});`
    }
  ];
  
  for (const file of files) {
    try {
      await fs.access(file.path);
      console.log(`File exists: ${file.path}`);
    } catch (error) {
      await fs.writeFile(file.path, file.content);
      console.log(`Created file: ${file.path}`);
    }
  }
}

// Setup and start the server
async function startServer() {
  try {
    // Create required directories
    await ensureDirectoryExists(CONFIG.chatSaveDir);
    await ensureDirectoryExists(CONFIG.exportDir);
    
    // Setup public files
    await setupPublicFiles();
    
    // Serve static files AFTER creating them
    app.use(express.static(path.join(__dirname, '../public')));
    
    // Default route handler (must be after static files middleware)
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
    
    // Start the server
    app.listen(CONFIG.port, () => {
      console.log(`Server is running on http://localhost:${CONFIG.port}`);
      console.log(`API running with ${CONFIG.apiKey ? 'configured' : 'MISSING'} API key`);
      console.log(`Model being used: ${CONFIG.model}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
  }
}

// Start the server
startServer();
