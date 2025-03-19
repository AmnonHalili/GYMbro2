import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import apiRoutes from './routes';
import passport from 'passport';
import './config/passport';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(passport.initialize());

// Helper function to verify uploads directory
const verifyUploadsDirectory = () => {
  const uploadsPath = path.join(__dirname, '../uploads');
  console.log('[Server] Checking uploads directory:', uploadsPath);
  
  if (!fs.existsSync(uploadsPath)) {
    console.error('[Server] CRITICAL ERROR: Uploads directory does not exist!');
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log('[Server] Created missing uploads directory');
  } else {
    console.log('[Server] Uploads directory exists');
    
    // Check posts directory
    const postsPath = path.join(uploadsPath, 'posts');
    if (!fs.existsSync(postsPath)) {
      console.error('[Server] Posts directory does not exist!');
      fs.mkdirSync(postsPath, { recursive: true });
      console.log('[Server] Created missing posts directory');
    } else {
      // List some files to verify content
      try {
        const files = fs.readdirSync(postsPath);
        console.log(`[Server] Found ${files.length} files in posts directory`);
        if (files.length > 0) {
          console.log('[Server] Sample files:', files.slice(0, 5));
        }
      } catch (err) {
        console.error('[Server] Error reading posts directory:', err);
      }
    }
  }
  
  return uploadsPath;
};

// Serve uploaded files with improved logging
const uploadsDir = verifyUploadsDirectory();
app.use('/uploads', express.static(uploadsDir));
console.log(`[Server] Static files middleware configured for path: ${uploadsDir}`);

// API routes
app.get('/', (req: Request, res: Response) => {
  res.send('GYMbro2 API is running');
});

// Use API routes
app.use('/api', apiRoutes);

// Connect to MongoDB
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || '';
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// API Documentation
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.error('Swagger documentation error:', error);
}

// Start server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

export default app; 