// WebSocket client for backend connection
// HARDCODED to connect to backend at port 8000

const WS_URL = "ws://localhost:8000/ws";

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

export const initSocket = () => {
  // If socket already exists and is connected, don't create a new one
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket;
  }

  // Close existing socket if it exists
  if (socket) {
    socket.close();
  }

  try {
    socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
      console.log('✅ WebSocket connected to backend:', WS_URL);
      reconnectAttempts = 0;
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    socket.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
      
      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => {
          initSocket();
        }, RECONNECT_DELAY);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);
        // Handle incoming messages here
        // You can emit custom events or call callbacks
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('websocket-message', { detail: data }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    return socket;
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    return null;
  }
};

export const closeSocket = () => {
  if (socket) {
    socket.close(1000, 'Client closing connection');
    socket = null;
    reconnectAttempts = 0;
  }
};

export const sendMessage = (message) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return true;
  } else {
    console.warn('WebSocket is not connected. Message not sent:', message);
    return false;
  }
};

export const getSocket = () => {
  return socket;
};

export const isConnected = () => {
  return socket && socket.readyState === WebSocket.OPEN;
};






