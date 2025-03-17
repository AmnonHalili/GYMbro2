import express from 'express';
import { authenticateToken } from '../middleware/auth';
import * as searchController from '../controllers/searchController';

const router = express.Router();

// Search users
router.get('/users', authenticateToken, searchController.searchUsers);

// Search posts
router.get('/posts', authenticateToken, searchController.searchPosts);

// Combined search (users and posts)
router.get('/', authenticateToken, searchController.combinedSearch);

export default router; 