import express from 'express'
import bodyParser from 'body-parser';

import dataCertificationValidationMiddleware from'./middleware/dataCertificationValidationMiddleware.js';
import { getCertificationController } from './controllers/dataController.js';
import dataValidateCertificationMiddleware from './middleware/dataValidateCertificationMiddleware.js';

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json());

app.use('/downloads', express.static('downloads'));

app.post('/certification', dataCertificationValidationMiddleware, getCertificationController, (req, res) => {});

app.post('/validate', dataValidateCertificationMiddleware, (req, res)=>{})


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
