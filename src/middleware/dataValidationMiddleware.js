import {isValidCPF, isValidCNPJ} from '../utils/validations.js';

function dataValidationMiddleware(req, res, next){

  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      status: 'falha',
      motivoErro: 'O corpo da requisição deve conter um array de CPFs/CNPJs',
    });
  }

  let invalidIds = [];

  for (const id of ids) {
    if (!isValidCPF(id) && !isValidCNPJ(id)) {
      invalidIds.push(id);
    }
  }

  let validationResults = {};

  for (const id of ids) {
    if (isValidCPF(id)) {
      validationResults[id] = { status: 'Válido', tipo: 'CPF' };
    } else if (isValidCNPJ(id)) {
      validationResults[id] = { status: 'Válido', tipo: 'CNPJ' };
    } else {
      validationResults[id] = { status: 'Inválido', motivoErro: 'Número de CPF/CNPJ inválido' };
    }
  }

  req.validationResults = validationResults;
  next();
}

export default dataValidationMiddleware