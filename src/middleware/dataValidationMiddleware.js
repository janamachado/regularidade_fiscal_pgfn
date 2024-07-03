import {isValidCPF, isValidCNPJ} from '../utils/validations.js';

function dataValidationMiddleware(req, res, next){

  let { data } = req.body

  if(!data || data  == ""){
      return res.status(400).json({ status: 'falha', motivoErro: 'O corpo da requisição deve conter um array de números ou um número de documento.' });
  }

    // Converte entrada string ou número para array
  if (typeof data === 'string' || typeof data === 'number') {
      data = [data];
  }

    // Verifica se entrada é um array
  if (!Array.isArray(data)) {
    return res.status(400).json({ status: 'falha', motivoErro: 'O corpo da requisição deve conter um array, string ou número de documentos.' });
  }

    // todas as entradas para Str
  data = data.map(String);

  let invalidData = {};
  let validData = {};

  for (const id of data) {

    if (isValidCPF(id)) {
      validData[id] = { tipo: 'CPF', status: "válido" };
    } else if (isValidCNPJ(id)) {
      validData[id] = { tipo: 'CNPJ', status: "válido" };
    } else {
      if (id.length === 11) { // CPF
        invalidData[id] = {
          status: "Falha",
          motivoErro: 'CPF inválido'
        };
      } else if (id.length === 14) { // CNPJ
        invalidData[id] = {
          tipo: "CNPJ",
          status: "Falha",
          motivoErro: 'CNPJ inválido'
        };
      } else {
        invalidData[id] = {
          status: "inválido",
          motivoErro: 'Número de CPF/CNPJ inválido'
        };
      }
    }
  }

  req.invalidData = invalidData;
  req.validData = validData;
  next();
}

export default dataValidationMiddleware