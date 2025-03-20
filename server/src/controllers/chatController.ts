import { Request, Response } from 'express';
import Message from '../models/Message';
import User from '../models/User';

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { userId, otherUserId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('sender', 'username profileImage')
    .populate('receiver', 'username profileImage');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בטעינת היסטוריית הצ\'אט' });
  }
};

export const getContacts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const users = await User.find({ _id: { $ne: userId } }, 'username profileImage');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בטעינת אנשי הקשר' });
  }
};

export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const { userId, otherUserId } = req.params;
    await Message.updateMany(
      {
        receiver: userId,
        sender: otherUserId,
        read: false
      },
      { read: true }
    );
    res.json({ message: 'הודעות סומנו כנקראו' });
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בסימון ההודעות כנקראו' });
  }
}; 