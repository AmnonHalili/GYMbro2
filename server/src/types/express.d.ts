// TypeScript declaration file for Express, enhancing Request object
import 'express';

declare global {
  namespace Express {
    interface Request {
      fileData?: {
        image?: string;
        [key: string]: any;
      };
    }
  }
}

// This module must be kept as a module
export {}; 