/* 
------------------------------------------------------------------------------------------
Middleware - responsável pela validação dos dados de entrada, 
 se todas as entradas forem inválidas retorna status code 400 e o motivo do erro.
 se houverem dados de entrada válidos, envia os dados para o Controller seguir a execução.
 Autora: Jana Machado
 Data: 08/07/2024
 ------------------------------------------------------------------------------------------
 */ 

import {isValidCPF, isValidCNPJ} from '../utils/routines.js';

function validationGetAuthenticityMiddleware(req, res, next){

    const { numero, codigoControle, dataEmissao, horaEmissao, tipoCertidao } = req.body

    let validData = {};

    const validTipoCertidao = {
        'negativa':'Negativa',
        'positiva com efeitos de negativa':'Positiva com Efeitos de Negativa',
        'positiva':'Positiva'
    }

        // Validar código de controle
    if (!codigoControle || typeof codigoControle !== 'string' || !/^[A-F0-9]{4}\.[A-F0-9]{4}\.[A-F0-9]{4}\.[A-F0-9]{4}$/.test(codigoControle)) {
        return res.status(400).json({ error: 'Código de controle inválido. Deve seguir o formato "XXXX.XXXX.XXXX.XXXX".' });
    }

        // Validar data de emissão
    if (!dataEmissao || typeof dataEmissao !== 'string') {
        return res.status(400).json({ error: 'Data de emissão inválida. Deve ser uma string.' });
    }
    const dataEmissaoRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dataEmissaoRegex.test(dataEmissao)) {
        return res.status(400).json({ error: 'Data de emissão inválida. Deve estar no formato DD/MM/AAAA.' });
    }

        // Validar hora de emissão
    if (!horaEmissao || typeof horaEmissao !== 'string') {
        return res.status(400).json({ error: 'Hora de emissão inválida. Deve ser uma string.' });
    }
    const horaEmissaoRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (!horaEmissaoRegex.test(horaEmissao)) {
        return res.status(400).json({ error: 'Hora de emissão inválida. Deve estar no formato HH:MM:SS.' });
    }

        // Validar Tipo de Certidão
    const tipoCertidaoLower = tipoCertidao.toLowerCase();
    if(!validTipoCertidao[tipoCertidaoLower]){
        return res.status(400).json({
            error: 'Tipo de certidão inválido. As opções válidas são: "Negativa", "Positiva com Efeitos de Negativa", "Positiva".'
        })
    }
    const tipoCertidaoValido = validTipoCertidao[tipoCertidaoLower];

        // Validar documentos
    if (isValidCPF(numero)) {
        validData.tipo = 'CPF'

    } else if (isValidCNPJ(numero)) {
        validData.tipo = 'CNPJ'

    } else {
        
        if (numero.length === 11) {   // CPF
           
            return res.status(400).json({
                status: "Falha",
                certidao: null,
                motivoErro: 'CPF inválido'
            });
            
        } else if (numero.length === 14) {  // CNPJ

            return res.status(400).json({
                status: "Falha",
                certidao: null,
                motivoErro: 'CNPJ inválido'
            });
        } else {

        return res.status(400).json({
          status: "Falha",
          certidao: null,
          motivoErro: 'Número não é CNPJ ou CPF'
        });
      };
    };

    req.body.tipo = validData.tipo;
    req.body.tipoCertidao = tipoCertidaoValido;
	next();
};

export default validationGetAuthenticityMiddleware;