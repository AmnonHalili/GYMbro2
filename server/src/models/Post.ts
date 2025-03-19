import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IPost extends Document {
  user: IUser['_id'];
  content: string;
  image?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String
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