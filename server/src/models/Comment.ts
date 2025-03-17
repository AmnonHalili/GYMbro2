import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IPost } from './Post';

export interface IComment extends Document {
  user: IUser['_id'];
  post: IPost['_id'];
  content: string;
}

const CommentSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

// Index for faster queries
CommentSchema.index({ post: 1 });

export default mongoose.model<IComment>('Comment', CommentSchema); 