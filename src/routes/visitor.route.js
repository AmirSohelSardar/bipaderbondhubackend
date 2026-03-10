import express from 'express';
import { trackVisitor } from '../controllers/visitor.controller.js';

const router = express.Router();

router.get('/', trackVisitor);
router.post('/', trackVisitor);

export default router;
