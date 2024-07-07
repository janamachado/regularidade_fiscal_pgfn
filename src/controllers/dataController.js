import getCPFCertificate from '../services/cpfAccessPGFNService.js';
import getCNPJCertificate from '../services/cnpjAccessPGFNService.js';

export const getCertificationController = async (req, res) => {
    let { validData, invalidData } = req;

    let finalResponse = {};

    // Processar os IDs válidos um por um
    for (const id of Object.keys(validData)) {
        let result;

        if (validData[id]?.tipo === 'CPF') {
            console.log(`[LOG INFO] - ${id}: Iniciando scraping.`);
            result = await getCPFCertificate(id);
        } else if (validData[id]?.tipo === 'CNPJ') {
            console.log(`[LOG INFO] - ${id}: Iniciando scraping.`);
            result = await getCNPJCertificate(id);
        }

        if (result.status) {
            finalResponse[id] = {
                status: "Sucesso",
                certidao: result.certidao || "url",
                motivoErro: null
            };
        } else {
            invalidData[id] = {
                status: "Falha",
                certidao: null,
                motivoErro: result?.mensagem || "Não foi possível obter a certidão."
            };
        }
    }

    // Adicionar dados inválidos no finalResponse
    Object.keys(invalidData).forEach(id => {
        finalResponse[id] = invalidData[id];
    });

    console.log("finalResponse", finalResponse);
    res.status(200).json(finalResponse);
};

// ------------------------------------------------------------------------------------

// import getCPFCertificate from '../services/cpfAccessPGFNService.js';
// import getCNPJCertificate from '../services/cnpjAccessPGFNService.js';

// export const getCertificationController = async (req, res) => {

//     let { validData, invalidData } = req;

//     // Obter IDs válidos para scraping
//     const validIds = Object.keys(validData);

//     // Realizar o scraping para os IDs válidos
//     const scrapingResults = await Promise.all(validIds.map(async (id) => {
//         let result;
//         if (validData[id]?.tipo === 'CPF') {
//             console.log(`[LOG INFO] - ${id}: Iniciando scraping.`);
//             result = await getCPFCertificate(id);
//         } else if (validData[id]?.tipo === 'CNPJ') {
//             console.log(`[LOG INFO] - ${id}: Iniciando scraping.`);
//             result = await getCNPJCertificate(id);
//         }
//         return { id, ...result };
//     }));

//     let finalResponse = {};

//     // Atualizar os dados válidos e inválidos com os resultados do scraping
//     scrapingResults.forEach(result => {
//         if (result.status) {
//             finalResponse[result.id] = {
//                 status: "Sucesso",
//                 certidao: result.url || "url",
//                 motivoErro: null
//             };
//         } else {
//             invalidData[result.id] = {
//                 status: "Falha",
//                 certidao: null,
//                 motivoErro: result.mensagem || "Não foi possível obter a certidão."
//             };
//         }
//     });

//     // Adicionar dados inválidos no finalResponse
//     Object.keys(invalidData).forEach(id => {
//         finalResponse[id] = invalidData[id];
//     });

//     console.log("finalResponse", finalResponse);
//     res.status(200).json(finalResponse);
// };

// ------------------------------------------------------------------------------------

// import getCPFCertificate from '../services/cpfAccessPGFNService.js';
// import getCNPJCertificate from '../services/cnpjAccessPGFNService.js';


// export const getCertificationController = async (req, res) =>{

//     let { validData, invalidData } = req;

//     const scrapingResults = await Promise.all(Object.keys(validData).map(async (id) => {

//         let result;

//         if (validData[id]?.tipo === 'CPF') {

//             console.log(`[LOG INFO] - ${id}: Iniciando scraping.`)
//             result = await getCPFCertificate(id);

//         } else if (validData[id]?.tipo === 'CNPJ') {

//             console.log(`[LOG INFO] - ${id}: Iniciando scraping.`)
//             result = await getCNPJCertificate(id);

//         }
//         return { id, ...result };
//     }));

//     let finalResponse = {};

//     scrapingResults.forEach(result => {

//         if(result.status){

//             validData[result.id] = {
//                 status: "Sucesso",
//                 certidao: result.certidao || "url",
//                 motivoErro: null
//             };

//         }else{
//             console.log("invalidData1", invalidData)
//             invalidData[result.id] = {
//                 status: "Falha",
//                 certidao: null,
//                 motivoErro: result?.mensagem || "Não foi possível obter a certidão."
//             }
//         }
//         console.log("invalidData", invalidData)
//         console.log("validData", validData)
//         console.log("invalidData", Object.keys(invalidData).length)
//         console.log("validData", Object.keys(validData).length)

//         if(Object.keys(invalidData).length > 0 && Object.keys(validData).length > 0){
//             console.log("Entrei 1")
//             finalResponse = {
//                 ...invalidData,
//                 ...validData
//             }
//         }
//         if(Object.keys(invalidData).length > 0 && Object.keys(validData).length === 0){
//             console.log("Entrei 2")
//             finalResponse = {
//                 ...invalidData
//             }
//         }
//         if(Object.keys(invalidData).length === 0 && Object.keys(validData).length > 0){
//             console.log("Entrei 3")
//             finalResponse ={
//                 ...validData
//             }
//         }
//     });
    
//     console.log("finalResponse", finalResponse)
//     res.status(200).json(finalResponse);
// };
    