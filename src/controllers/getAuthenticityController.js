/* 
------------------------------------------------------------------------------------------
Controller - responsável pelo controle de execução dos Services e retorno das respostas 
da requisição de acordo com seus resultados.
 Autora: Jana Machado
 Data: 08/07/2024
 ------------------------------------------------------------------------------------------
 */ 

import getCPFAuthenticityCertificateService from "../services/getCPFAuthenticityCertificateService.js";
import getCNPJAuthenticityCertificateService from "../services/getCNPJAuthenticityCertificateService.js";

export const getAuthenticityController = async (req, res) => {
	const { numero, codigoControle, dataEmissao, horaEmissao, tipoCertidao, tipo } = req.body;

	let finalResponse = {};
	let result;
	
	if(tipo === "CPF"){
		console.log(`[LOG INFO] - Iniciando scraping para CPF.`);
		result = await getCPFAuthenticityCertificateService(numero, codigoControle, dataEmissao, horaEmissao, tipoCertidao)
	}else if (tipo === "CNPJ"){
		result = await getCNPJAuthenticityCertificateService(numero, codigoControle, dataEmissao, horaEmissao, tipoCertidao);
	}

	if(result.status){
		console.log(`[LOG INFO] - Scraping finalizado com sucesso.`);
		finalResponse = {
			status: "Sucesso",
			certidao: result?.mensagem || "Algum problema para encontrar a data de validade da certidão.",
			motivoErro: null
		}
	}else{
		console.log(`[LOG INFO] - Scraping finalizado com falha.`);
		finalResponse = {
			status: "Falha",
			certidao: null,
			motivoErro: result?.mensagem
		}
	}

    res.status(200).json(finalResponse);
};