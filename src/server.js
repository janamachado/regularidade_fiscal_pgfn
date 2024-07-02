import express from 'express'
import bodyParser from 'body-parser';

import dataValidationMiddleware from'./middleware/dataValidationMiddleware.js';

const app = express();
const port = 3001;

app.use(bodyParser.json());

app.post('/validate', dataValidationMiddleware, (req, res) => {
    res.json(req.validationResults);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
