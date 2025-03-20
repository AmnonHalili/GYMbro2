import { Request, Response } from 'express';
import Message from '../models/Message';
import User from '../models/User';
import mongoose from 'mongoose';

// קבלת רשימת אנשי קשר (כל המשתמשים במערכת חוץ מהמשתמש הנוכחי)
export const getContacts = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const contacts = await User.find(
      { _id: { $ne: userId } },
      'username profilePicture'
    );
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בטעינת אנשי הקשר' });
  }
};

// קבלת היסטוריית הודעות בין שני משתמשים
export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { userId, targetId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: targetId },
        { sender: targetId, receiver: userId }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('sender', 'username profilePicture')
    .populate('receiver', 'username profilePicture');
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בטעינת היסטוריית הצ\'אט' });
  }
};

// סימון הודעות כנקראו
export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const { userId, targetId } = req.params;
    await Message.updateMany(
      {
        sender: targetId,
        receiver: userId,
        read: false
      },
      {
        $set: { read: true }
      }
    );
    res.json({ message: 'הודעות סומנו כנקראו' });
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בסימון הודעות כנקראו' });
  }
};

// שמירת הודעה חדשה
export const saveMessage = async (message: any) => {
  try {
    const newMessage = new Message({
      sender: message.sender,
      receiver: message.receiver,
      content: message.content
    });
    const savedMessage = await newMessage.save();
    return await Message.findById(savedMessage._id)
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture');
  } catch (error) {
    console.error('שגיאה בשמירת הודעה:', error);
    throw error;
  }
}; 