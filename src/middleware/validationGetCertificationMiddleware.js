/*  
------------------------------------------------------------------------------------------
Middleware - responsável pela validação dos dados de entrada, 
 se todas as entradas forem inválidas retorna status code 400 e o motivo do erro.
 se houverem dados de entrada válidos, envia os dados para o Controller seguir a execução.
 Autora: Jana Machado
 Data: 08/07/2024
	------------------------------------------------------------------------------------------
 */ 

import { isValidCPF, isValidCNPJ, removeMask } from '../utils/routines.js';

function validationGetCertificationMiddleware(req, res, next){

	let { data } = req.body

	if(!data || data  == ""){
		return res.status(400).json({ status: 'falha', motivoErro: 'O corpo da requisição deve conter um array de números ou um número de documento.' });
	}

		// converte entrada str ou number para array
	if (typeof data === 'string' || typeof data === 'number') {
		data = [data];
	}

		// verifica se entrada é um array
	if (!Array.isArray(data)) {
		return res.status(400).json({ status: 'falha', motivoErro: 'O corpo da requisição deve conter um array, string ou número de documentos.' });
	}

		// converte todas as entradas para str e sem máscara
	data = data.map(String).map(removeMask);
	data = Array.from(new Set(data));   // mantém itens únicos

	let invalidData = {};
	let validData = {};

	for (const id of data) {
		if (isValidCPF(id)) {

			validData[id] = { tipo: 'CPF' };

		} else if (isValidCNPJ(id)) {

			validData[id] = { tipo: 'CNPJ' };

		} else {

			if (id.length === 11) {   // CPF
				
				invalidData[id] = {
					status: "Falha",
					certidao: null,
					motivoErro: 'CPF inválido'
				};
			} else if (id.length === 14) {  // CNPJ
				invalidData[id] = {
					status: "Falha",
					certidao: null,
					motivoErro: 'CNPJ inválido'
				};
			} else {
				invalidData[id] = {
					status: "Falha",
					certidao: null,
					motivoErro: 'Número não é CNPJ ou CPF'
				};
			}
		}
	}

	req.invalidData = invalidData;
	req.validData = validData;
	next();
}

export default validationGetCertificationMiddleware