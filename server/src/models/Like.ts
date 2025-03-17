import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IPost } from './Post';

export interface ILike extends Document {
  user: IUser['_id'];
  post: IPost['_id'];
}

const LikeSchema: Schema = new Schema(
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
    }
  },
  { timestamps: true }
);

// Compound index to ensure a user can only like a post once
LikeSchema.index({ user: 1, post: 1 }, { unique: true });

export default mongoose.model<ILike>('Like', LikeSchema); 