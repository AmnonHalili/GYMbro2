import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IPost extends Document {
  content: string;
  image?: string;
  user: IUser['_id'];
  comments: number;
  likes: number;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    image: {
      type: String,
      default: null
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    likesCount: {
      type: Number,
      default: 0
    },
    commentsCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default mongoose.model<IPost>('Post', PostSchema); 