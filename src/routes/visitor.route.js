import express from 'express';
import { trackVisitor } from '../controllers/visitor.controller.js';

const router = express.Router();

router.get('/', trackVisitor);

export default router;
