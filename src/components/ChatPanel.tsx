import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { clearPilot } from '../store/reducers/chatpilot';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
    pilotId: number;
    content: string;
    timestamp: number;
}

const ChatPanel = () => {
  const [selectedPilot, setSelectedPilot] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useDispatch();
  const pilots = useSelector((state: RootState) => state.chatpilot.pilots);

  useEffect(() => {
    const socket = io('http://localhost:2003/chat', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      extraHeaders: {
        "Access-Control-Allow-Origin": "*"
      }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO bağlantısı kuruldu');
    });

    socket.on('left', (data:any) => {
      debugger;
      var roomId = data.roomId;
      var admin = data.admin;
      var obj = {
        pilotId: roomId,
        content: `${admin.name} left the chat`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, obj]);
    });

    socket.on('joined', (data:any) => {
      debugger;
      var obj = {
        pilotId: data.pilotId,
        content: `${data.admin.name} joined the chat`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, obj]);
    });

    socket.on('message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('connect_error', (error) => {
      console.error('Bağlantı hatası:', error);
    });
    
    socket.on('connect_timeout', () => {
      console.error('Bağlantı zaman aşımı');
    });
    
    socket.on('error', (error) => {
      console.error('Soket hatası:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    document.addEventListener('pilot_clicked', (e:any) => {
      setIsOpen(true);
      setIsMinimized(false);
    });
  }, [selectedPilot]);

  useEffect(() => {
    if (socketRef.current) {
      if (selectedPilot) {
        socketRef.current.emit('join', {
          pilotId: selectedPilot,
          socketId: socketRef.current.id,
          adminId: 1,
          adminName: 'Ali Kilic',
          name: pilots[selectedPilot]?.name
        });
      } else {
        if(selectedPilot){
          socketRef.current.emit('leave',{socketId:socketRef.current.id,pilotId:selectedPilot,adminId:1});
        }
      }
    }
  }, [selectedPilot]);

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(true);
  };

  const handleOpen = () => {
    if(selectedPilot){
      setIsOpen(true);
      setIsMinimized(false);
    }else{
      alert('Please select a pilot to open the chat');
    }
    
  };

  const handlePilotClick = (pilotId: number) => {
    setSelectedPilot(pilotId);
  };

  const handleRemovePilot = (pilotId: number) => {
    if (selectedPilot === pilotId) {
      setSelectedPilot(null);
    }
    if(socketRef.current){
      socketRef.current.emit('leave',{socketId:socketRef.current.id,pilotId:pilotId,adminId:1});
    }
    dispatch(clearPilot(pilotId));
  };

  const handleSendMessage = () => {
    debugger;
    if (socketRef.current && message.trim() && selectedPilot) {
      const newMessage: ChatMessage = {
        pilotId: selectedPilot,
        content: message,
        timestamp: Date.now()
      };
      socketRef.current.emit('message', {adminId:1, message:newMessage});
      //setMessages(prev => [...prev, newMessage]);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (isMinimized) {
    return (
      <div 
        onClick={handleOpen}
        className="fixed bottom-4 right-4 w-12 h-12 bg-gray-800 rounded-full shadow-lg cursor-pointer flex items-center justify-center hover:bg-gray-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
    );
  }

  if (!isOpen || Object.keys(pilots).length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 w-80 bg-gray-800 text-white rounded-t-lg shadow-lg">
      <div className="flex justify-between items-center p-3 bg-gray-900 rounded-t-lg">
        <h3 className="text-lg font-semibold">Pilot Chat</h3>
        <button 
          onClick={handleClose}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="h-96 p-4">
        {selectedPilot ? (
          <div className="h-full flex flex-col">
            <div className="mb-2 text-sm text-gray-400">
              Chat with {pilots[selectedPilot]?.name}
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-700 rounded p-2 mb-2">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-2 p-2 rounded ${
                  msg.pilotId === selectedPilot 
                    ? 'bg-amber-900 ml-auto' 
                    : 'bg-gray-600'
                }`}
              >
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs text-gray-400">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
            <div className='flex flex-row justify-between items-center gap-2'>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              type="text"
              placeholder="Type a message..."
              className="w-full p-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-900"
            />
            <button onClick={handleSendMessage} className='bg-green-800 p-2 rounded text-white'>Send</button></div>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            Select a pilot to start chatting
          </div>
        )}
      </div>

      <div className="p-2 bg-gray-900 overflow-x-auto">
        <div className="flex space-x-2">
          {Object.values(pilots).map((pilot:any) => (
            <div 
              key={pilot.id}
              className={`flex space-x-1 p-1 px-2 justify-center items-center rounded cursor-pointer ${
                selectedPilot === pilot.id ? 'bg-gray-600' : 'bg-gray-700'
              }`}
              onClick={() => handlePilotClick(pilot.id)}
            >
              <span className="truncate max-w-[100px] text-xs mr-1">{pilot.name}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePilot(pilot.id);
                }}
                className="text-gray-400 hover:text-red-500"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
