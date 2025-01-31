import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { clearPilot } from '../store/reducers/chatpilot';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SendMessage } from '../types';

interface ChatMessage {
    pilotId: number;
    content: string;
    timestamp: number;
}

const ChatPanel = () => {
  const [selectedPilot, setSelectedPilot] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [messages, setMessages] = useState<SendMessage[]>([]);
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
      var route_id:number = data.route_id;
      var user = data.user;
      var obj:SendMessage = {
        user_id:user.id,
        route_id:route_id,
        sender:'Ali Kilic',
        message:{
          type:'text',
          text:{
            type:'text',
            data:user.name + ' left the chat'
          },
          timestamp:Date.now()
        }
      };
      setMessages(prev => [...prev, obj]);
    });

    socket.on('joined', (data:any) => {
      debugger;
      var route_id:number = data.route_id;
      var user:any = data.user;
      var route_users:number[] = data.route_users;
      var obj:SendMessage = {
        user_id:user.id,
        route_id:route_id,
        sender:'Ali Kilic',
        message:{
          type:'text',
          text:{
            type:'text',
            data:user.name + ' joined the chat, There are ' + route_users.length + ' users in the chat'
          },
          timestamp:Date.now()
        }
      };
      setMessages(prev => [...prev, obj]);
    });

    socket.on('message', (message: SendMessage) => {
      setMessages(prev => [...prev, message]);
      var chatbox = document.getElementById('chatbox');
      if(chatbox){
        chatbox.scrollTop = chatbox.scrollHeight;
      }
    });

    socket.on('connect_error', (error) => {
      console.error('connect_error:', error);
    });
    
    socket.on('connect_timeout', () => {
      console.error('connect_timeout');
    });
    
    socket.on('error', (error) => {
      console.error('Soket error:', error);
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
          route_id: selectedPilot,
          socketId: socketRef.current.id,
          id: 1,
          name: 'Ali Kilic',
        });
      } else {
        if(selectedPilot){
          socketRef.current.emit('leave',{
            socketId:socketRef.current.id,
            route_id:selectedPilot,
            user_id:1}
          );
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
      socketRef.current.emit('leave',{
        socketId:socketRef.current.id,
        route_id:pilotId,
        user_id:1
      }); 
    }
    dispatch(clearPilot(pilotId));
  };

  const handleSendMessage = () => {
    if (socketRef.current && message.trim() && selectedPilot) {
      const newMessage: SendMessage = {
        user_id:1,
        route_id:selectedPilot,
        sender:'Ali Kilic',
        message:{
          type:'text',
          text:{
            type:'text',
            data:message
          },
          timestamp:Date.now()
        }
      };
      socketRef.current.emit('message', newMessage);
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

  const handleSendCommand = () => {
    debugger;
    if (socketRef.current && selectedPilot) {
      var newCommand:SendMessage = {
        user_id:1,
        route_id:selectedPilot,
        sender:'Ali Kilic',
        message:{
          type:'command',
          timestamp:Date.now(),
          command:{
            type:'command',
            data:{
              question:'Are you ready for the new mission?',
              true_answer:'Yes',
              false_answer:'No'
            }
          }
        }
      };
      socketRef.current.emit('message', newCommand);
    }
  };

  const handleSendLocation = () => {
    debugger;
    if (socketRef.current && selectedPilot) {
      var newLocation:SendMessage = {
        user_id:1,
        route_id:selectedPilot,
        sender:'Ali Kilic',
        message:{
          type:'location',
          timestamp:Date.now(),
          location:{
            type:'location',
            data:{
              name:'Istanbul',
              latitude:41.0082,
              longitude:28.9784,
              type:'airport'
            }
          }
        }
      };
      socketRef.current.emit('message', newLocation);
    }
  };

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
            <div id={'chatbox'} className="flex-1 overflow-y-auto bg-gray-700 rounded p-2 mb-2">
            {messages.map((msg, index) => (
              <div 
                
                key={index} 
                className={`mb-2 p-2 rounded ${
                  msg.route_id === selectedPilot 
                    ? 'bg-[#3e4a5e] ml-auto' 
                    : 'bg-gray-600'
                }`}
              >
                {
                  msg.message.type === 'text' && <div className="text-sm flex flex-col">
                    <div className='text-blue-300 text-xs text-left mb-2 w-full flex flex-row justify-between items-center'>
                      <span>{msg.sender}</span>
                      <div className="text-xs text-gray-400">
                        {new Date(msg.message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className='text-sm'>{msg.message.text?.data.toString()}</div>
                  </div>
                }
                {
                  msg.message.type === 'command' && <div className="text-sm flex flex-col">
                    <div className='text-blue-300 text-xs text-left mb-2 w-full flex flex-row justify-between items-center'>
                      <span>{msg.sender}</span>
                      <div className="text-xs text-gray-400">
                        {new Date(msg.message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className='flex flex-col text-sm'>
                      <div className='mb-1'><b className='text-green-500'>Command : </b> {msg.message.command?.data.question.toString()}</div>
                      <div className='mb-1'><b className='text-amber-300'>Answers : </b> {msg.message.command?.data.true_answer.toString()} or {msg.message.command?.data.false_answer.toString()}</div>
                    </div>
                    </div>
                }
                {
                  msg.message.type === 'location' && <div className="text-sm flex flex-col">
                    <div className='text-blue-300 text-xs text-left mb-2 w-full flex flex-row justify-between items-center'>
                      <span>{msg.sender}</span>
                      <div className="text-xs text-gray-400">
                        {new Date(msg.message.timestamp).toLocaleTimeString()}
                      </div>
                      </div>
                      <div className='flex flex-col text-sm'>
                        <div className='mb-1'><b className='text-red-400'>Location :</b> {msg.message.location?.data.name.toString()}</div>
                        <div className='mb-1'><span className='text-amber-300 text-xs'>Latitude :</span> {msg.message.location?.data.latitude.toString()}</div>
                        <div className='mb-1'><span className='text-amber-300 text-xs'>Longitude :</span> {msg.message.location?.data.longitude.toString()}</div>
                      </div>
                    </div>
                }
                
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
              <button onClick={handleSendMessage} className='bg-green-800 p-2 rounded text-white'>Send</button>
            </div>
            <div className='flex flex-row justify-between items-center gap-2 mt-2'>
              <button onClick={handleSendCommand} className='bg-green-800 p-2 rounded text-white w-full'>Send Command</button>
              <button onClick={handleSendLocation} className='bg-green-800 p-2 rounded text-white w-full'>Send Location</button>
            </div>
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
