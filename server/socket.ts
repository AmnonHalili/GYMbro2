import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { saveMessage } from './controllers/chatController';

const connectedUsers = new Map();

export const initializeSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('משתמש התחבר:', socket.id);

    // כשמשתמש מתחבר
    socket.on('user_connected', (userId: string) => {
      connectedUsers.set(userId, socket.id);
      console.log('משתמש התחבר:', userId);
    });

    // כששולחים הודעה
    socket.on('send_message', async (messageData) => {
      try {
        const savedMessage = await saveMessage(messageData);
        const receiverSocketId = connectedUsers.get(messageData.receiver);

        // שליחת ההודעה למקבל אם הוא מחובר
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', savedMessage);
        }

        // שליחת אישור לשולח
        socket.emit('message_sent', savedMessage);
      } catch (error) {
        console.error('שגיאה בשליחת הודעה:', error);
        socket.emit('message_error', { message: 'שגיאה בשליחת ההודעה' });
      }
    });

    // כשמשתמש מתנתק
    socket.on('disconnect', () => {
      const userId = [...connectedUsers.entries()]
        .find(([_, socketId]) => socketId === socket.id)?.[0];
      
      if (userId) {
        connectedUsers.delete(userId);
        console.log('משתמש התנתק:', userId);
      }
    });
  });

  return io;
}; 