import { getCPFCertificate, getCNPJCertificate } from '../services/accessPgfnService.js';

export const getCertification = async (req, res) =>{

    const { validData, invalidData } = req; 
    console.log(validData)
    console.log(invalidData)


    const scrapingResults = await Promise.all(Object.keys(validData).map(async (id) => {

        let result;

        if (validData[id]?.tipo === 'CPF') {

            console.log("Executando scraping para CPF", id)
            result = await getCPFCertificate(id);

        } else if (validData[id]?.tipo === 'CNPJ') {

            console.log("Executando scraping para CNPJ", id)
            result = await getCNPJCertificate(id);

        }
        return { id, ...result };
    }));

    // console.log("scrapingResults", scrapingResults)
    let validReturn

    scrapingResults.forEach(result => {

        if(result.status){
            validReturn.push(validData[result.id] = {
                status: "Sucesso",
                certidao: result.certidao,
                motivoErro: null
            });
        }else{
            invalidData[result.id] = {
                status: "Falha",
                certidao: null,
                motivoErro: result?.mensagem || "Não foi possível obter a certidão."
            }
        }
    });

    // console.log("Retorno válido do scraping: ", validData)
    // console.log("Retorno inválido do scraping: ", invalidData)
    
    const finalResponse = {
        ...invalidData,
        validReturn
    };
    
    console.log("finalResponse", finalResponse)
    res.status(200).json(finalResponse);
};
    