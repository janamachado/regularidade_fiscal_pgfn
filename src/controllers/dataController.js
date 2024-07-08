import getCPFCertificateService from '../services/cpfAccessPGFNService.js';
import getCNPJCertificateService from '../services/cnpjAccessPGFNService.js';

export const getCertificationController = async (req, res) => {
    let { validData, invalidData } = req;

    let finalResponse = {};

    // const scrapingResults = await Promise.all(validIds.map(async (id) => {
    //     let result;
    //     if (validData[id]?.tipo === 'CPF') {
    //         console.log(`[LOG INFO] - ${id}: Iniciando scraping.`);
    //         result = await getCPFCertificate(id);
    //     } else if (validData[id]?.tipo === 'CNPJ') {
    //         console.log(`[LOG INFO] - ${id}: Iniciando scraping.`);
    //         result = await getCNPJCertificate(id);
    //     }
    //     return { id, ...result };
    // }));

        // Executar scraping somente para dados válidos
    for (const id of Object.keys(validData)) {
        let result;

        if (validData[id]?.tipo === 'CPF') {
            console.log(`[LOG INFO] - ${id}: Iniciando scraping.`);
            result = await getCPFCertificateService(id);

        } else if (validData[id]?.tipo === 'CNPJ') {
            console.log(`[LOG INFO] - ${id}: Iniciando scraping.`);
            result = await getCNPJCertificateService(id);
        }

        if (result.status) {
            console.log(`[LOG INFO] - ${id}: Scraping finalizado com sucesso.`);

            finalResponse[id] = {
                status: "Sucesso",
                certidao: result.certidao || "Algum problema para encontrar a URL.",
                motivoErro: null
            };
        } else {
            console.log(`[LOG INFO] - ${id}: Scraping finalizado com falha.`);

            invalidData[id] = {
                status: "Falha",
                certidao: null,
                motivoErro: result?.mensagem || "Não foi possível obter a certidão."
            };
        }
    }

    // Dados inválidos na resposta final
    Object.keys(invalidData).forEach(id => {
        finalResponse[id] = invalidData[id];
    });

    console.log("finalResponse", finalResponse);
    res.status(200).json(finalResponse);
};