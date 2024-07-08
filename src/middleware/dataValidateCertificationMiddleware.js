import {isValidCPF, isValidCNPJ} from '../utils/routines.js';

function dataValidateCertificationMiddleware(req, res, next){
  const { numero, codigoControle, dataEmissao, horaEmissao, tipoCertidao } = req.body

  console.log(numero, codigoControle, dataEmissao, horaEmissao, tipoCertidao)

    let invalidData = {};
    let validData = {};

    if (isValidCPF(numero)) {
        console.log("Entrei")

    //   validData[id] = { tipo: 'CPF' };

    } else if (isValidCNPJ(numero)) {
        
    } else {
        console.log("Entrei 1")
        
        if (numero.length === 11) {   // CPF
            console.log("Entrei 2")
            
            return res.status(400).json({
                status: "Falha",
                certidao: null,
                motivoErro: 'CPF inválido'
            });
            
        } else if (numero.length === 14) {  // CNPJ
            console.log("Entrei 3")
            return res.status(400).json({
                status: "Falha",
                certidao: null,
                motivoErro: 'CNPJ inválido'
            });
        } else {
          console.log("Entrei 4")
        return res.status(400).json({
          status: "Falha",
          certidao: null,
          motivoErro: 'Número não é CNPJ ou CPF'
        });
      }
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

}

export default dataValidateCertificationMiddleware;