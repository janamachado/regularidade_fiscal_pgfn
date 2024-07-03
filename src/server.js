import express from 'express'
import bodyParser from 'body-parser';

import dataValidationMiddleware from'./middleware/dataValidationMiddleware.js';
import { getCertification } from './controllers/dataController.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/validate', dataValidationMiddleware, getCertification, (req, res) => {

    res.json(req.validationResults);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
