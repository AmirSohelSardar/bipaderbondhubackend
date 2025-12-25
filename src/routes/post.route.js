import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { create, deletepost, getposts, updatepost } from '../controllers/post.controller.js';
import { getHomePosts } from '../controllers/post.controller.js';
import { getPostBySlug } from '../controllers/post.controller.js';


const router = express.Router();

router.post('/create', verifyToken, create)
router.get('/getposts', getposts)
router.delete('/deletepost/:postId/:userId', verifyToken, deletepost)
router.put('/updatepost/:postId/:userId', verifyToken, updatepost)
router.get('/home', getHomePosts);
router.get('/post/:slug', getPostBySlug);



export default router;