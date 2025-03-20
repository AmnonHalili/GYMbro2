import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './Chat.css';

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    profilePicture: string;
  };
  receiver: {
    _id: string;
    username: string;
    profilePicture: string;
  };
  content: string;
  timestamp: string;
  read: boolean;
}

interface Contact {
  _id: string;
  username: string;
  profilePicture: string;
}

interface ChatProps {
  targetUserId?: string;
}

const Chat: React.FC<ChatProps> = ({ targetUserId }) => {
  const { authState } = useAuth();
  const { user } = authState;
  const [socket, setSocket] = useState<any>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
      setSocket(newSocket);

      newSocket.emit('user_connected', user._id);

      newSocket.on('receive_message', (message: Message) => {
        if (selectedContact && (message.sender._id === selectedContact._id || message.receiver._id === selectedContact._id)) {
          setMessages(prev => [...prev, message]);
        }
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const fetchContacts = async () => {
        try {
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/chat/contacts/${user._id}`);
          setContacts(response.data);
          
          // אם יש targetUserId, נבחר אותו אוטומטית
          if (targetUserId) {
            const targetContact = response.data.find((contact: Contact) => contact._id === targetUserId);
            if (targetContact) {
              setSelectedContact(targetContact);
            }
          }
        } catch (error) {
          console.error('שגיאה בטעינת אנשי הקשר:', error);
        }
      };

      fetchContacts();
    }
  }, [user, targetUserId]);

  useEffect(() => {
    if (user && selectedContact) {
      const fetchMessages = async () => {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/chat/history/${user._id}/${selectedContact._id}`
          );
          setMessages(response.data);
          await axios.put(
            `${process.env.REACT_APP_API_URL}/api/chat/read/${user._id}/${selectedContact._id}`
          );
        } catch (error) {
          console.error('שגיאה בטעינת הודעות:', error);
        }
      };

      fetchMessages();
    }
  }, [user, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !selectedContact || !user) return;

    const messageData = {
      sender: user._id,
      receiver: selectedContact._id,
      content: newMessage
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  return (
    <div className="chat-container">
      {!targetUserId && (
        <div className="contacts-list">
          <h2>אנשי קשר</h2>
          {contacts.map(contact => (
            <div
              key={contact._id}
              className={`contact-item ${selectedContact?._id === contact._id ? 'selected' : ''}`}
              onClick={() => setSelectedContact(contact)}
            >
              <img
                src={contact.profilePicture || '/default-avatar.png'}
                alt={contact.username}
                className="contact-avatar"
              />
              <span className="contact-name">{contact.username}</span>
            </div>
          ))}
        </div>
      )}

      <div className="chat-main">
        {selectedContact ? (
          <>
            <div className="chat-header">
              <img
                src={selectedContact.profilePicture || '/default-avatar.png'}
                alt={selectedContact.username}
                className="chat-avatar"
              />
              <h3>{selectedContact.username}</h3>
            </div>

            <div className="messages-container">
              {messages.map(message => (
                <div
                  key={message._id}
                  className={`message ${
                    message.sender._id === user?._id ? 'sent' : 'received'
                  }`}
                >
                  <div className="message-content">{message.content}</div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="הקלד הודעה..."
              />
              <button type="submit">שלח</button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <p>בחר איש קשר כדי להתחיל בשיחה</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat; 