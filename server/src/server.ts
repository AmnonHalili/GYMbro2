import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();

// CORS middleware
app.use(cors(corsOptions));

// הגדרת נתיבים סטטיים לקבצי uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log(`תיקיית uploads מוגדרת כסטטית בנתיב: ${path.join(__dirname, '../uploads')}`);

// ... existing code ... 