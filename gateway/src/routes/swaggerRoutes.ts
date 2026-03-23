import type { Request, Response } from 'express';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger';

const router = Router();

router.get('/json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true, // THis option is used to persist the authorization header when the swagger page reloads
  },
};

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

export default router;
