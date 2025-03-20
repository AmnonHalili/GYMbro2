import { Server, Socket } from 'socket.io';
import Message from '../models/Message';
import { Server as HttpServer } from 'http';

interface UserSocket {
  userId: string;
  socketId: string;
}

const connectedUsers: UserSocket[] = [];

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('משתמש התחבר:', socket.id);

    socket.on('user_connected', (userId: string) => {
      connectedUsers.push({ userId, socketId: socket.id });
      io.emit('users_online', connectedUsers.map(user => user.userId));
    });

    socket.on('send_message', async (data: { sender: string; receiver: string; content: string }) => {
      try {
        const message = new Message({
          sender: data.sender,
          receiver: data.receiver,
          content: data.content
        });
        await message.save();

        const receiverSocket = connectedUsers.find(user => user.userId === data.receiver);
        if (receiverSocket) {
          io.to(receiverSocket.socketId).emit('receive_message', message);
        }

        socket.emit('message_sent', message);
      } catch (error) {
        console.error('שגיאה בשליחת הודעה:', error);
        socket.emit('message_error', { message: 'שגיאה בשליחת ההודעה' });
      }
    });

    socket.on('disconnect', () => {
      const index = connectedUsers.findIndex(user => user.socketId === socket.id);
      if (index !== -1) {
        connectedUsers.splice(index, 1);
        io.emit('users_online', connectedUsers.map(user => user.userId));
      }
      console.log('משתמש התנתק:', socket.id);
    });
  });

  return io;
}; 