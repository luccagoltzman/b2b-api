import { Router } from 'express';
import { IAController } from '../controllers/ia.controller';

const router = Router();
const iaController = new IAController();

router.post('/proposta-por-prompt', iaController.propostaPorPrompt);

export default router;
