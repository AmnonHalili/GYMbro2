import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  googleId?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: function(this: any) { 
        return !this.googleId; 
      }
    },
    profilePicture: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    googleId: {
      type: String
    }
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function(next) {
  const user = this as unknown as IUser;
  if (user.isModified('password') && user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const user = this as unknown as IUser;
  console.log('Password comparison:', { 
    hasPassword: !!user.password,
    candidateLength: candidatePassword?.length,
    storedPasswordLength: user.password?.length
  });
  
  if (!user.password) return false;
  
  const isMatch = await bcrypt.compare(candidatePassword, user.password);
  console.log('Password match result:', isMatch);
  return isMatch;
};

export default mongoose.model<IUser>('User', UserSchema); 