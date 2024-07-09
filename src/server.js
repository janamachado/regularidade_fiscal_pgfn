/* 
------------------------------------------------------------------------------------------
Server - Desenvolvido na arquitetura MVC, é responsável pelo roteamento de rotas HTTP e disponibilização de arquivos estáticos.
Segue arquitetura 
Receberá a requisição e enviará para o Middleware responsável pela validação dos dados.
 Autora: Jana Machado
 Data: 08/07/2024
 ------------------------------------------------------------------------------------------
 */ 

import express from 'express'
import bodyParser from 'body-parser';

import validationGetCertificationMiddleware from'./middleware/validationGetCertificationMiddleware.js';
import validationGetAuthenticityMiddleware from './middleware/validationGetAuthenticityMiddleware.js';
import { getCertificationController } from './controllers/getCertificationController.js';
import { getAuthenticityController } from './controllers/getAuthenticityController.js';

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json());

app.use('/downloads', express.static('downloads'));

app.post('/certification', validationGetCertificationMiddleware, getCertificationController, (req, res) => {});

app.post('/authenticity', validationGetAuthenticityMiddleware, getAuthenticityController, (req, res)=>{})


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
