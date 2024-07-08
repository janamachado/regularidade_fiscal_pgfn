import { selectors, simulateHumanInteraction, waitForDownload, downloadPath, delay } from '../utils/routines.js';
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import path from 'path';

puppeteer.use(StealthPlugin());

const getCPFCertificateService = async (cpf) => {
    console.log(`[LOG INFO] - ${cpf}: Inicializando scraping para ${cpf} às ${new Date().toLocaleString()}`);

    try {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });

        let page = await browser.newPage();
        await page.setUserAgent(new UserAgent().toString());
        await page.setCacheEnabled(false);
        
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const headers = request.headers();
            delete headers['sec-ch-ua-platform'];
            delete headers['pragma'];
            delete headers['sec-ch-ua'];
            delete headers['user-agent'];
            headers['sec-ch-ua-platform'] = 'Windows';
            headers['pragma'] = 'no-cache';
            headers['sec-ch-ua'] = 'Google Chrome";v="124", "Not-A.Brand";v="99';
            request.continue({ headers });
        });

        await page.goto(process.env.MAIN_URL, { waitUntil: 'networkidle0' });

        const modalButton = await page.$(selectors.modalCompatibleBrowser);
        if (modalButton) {
            console.log(`[LOG INFO] - ${cpf}: Modal compatível com navegador encontrado. Clicando...`);
            await modalButton.click();
            await simulateHumanInteraction(page);
        }

        await simulateHumanInteraction(page);

        await page.waitForSelector(selectors.cpfBtn, { delay: 5000 });
        await page.click(selectors.cpfBtn);

        console.log(`[LOG INFO] - ${cpf}: Aguardando próxima página.`);

        const secondPage = await browser.waitForTarget(target => target.url() === process.env.SECOND_PAGE_CPF);
        page = await secondPage.page();

        await simulateHumanInteraction(page);

        await page.waitForSelector(selectors.input, { timeout: 60000 });
        await page.focus(selectors.input, { delay: 4000 });

        console.log(`[LOG INFO] - ${cpf}: Digitando CPF.`);
        await page.type(selectors.input, cpf, { delay: 500 });

        await page.keyboard.press('Enter');
        console.log(`[LOG INFO] - ${cpf}: Consulta enviada.`);
        await delay(3000);

        console.log(`[LOG INFO] - ${cpf}: Aguardando retorno da consulta.`);
        const queryResult = await queryReturn(page);

        if (queryResult === 'success') {
            return await startDownload(browser, page, cpf);
        } else if (queryResult === 'modalError') {
            return await handleModalError(browser, page, cpf);
        } else {
            return await returnTableMessage(browser, page, cpf);
        }
    } catch (error) {
        console.error(`[LOG ERROR] - ${cpf}: ${error}`);
        
        return {
            status: false,
            mensagem: "Não foi possível obter a certidão."
        };
    }
};

async function handleModalError(browser, page, cpf) {
    const errorMessage = await page.$eval(selectors.modalMessage, p => p.innerText.trim());
    console.log(`[LOG ERROR] - ${cpf}: ${errorMessage}.`);

    if (errorMessage === "CPF inválido" || errorMessage === "CPF não informado") {
        await page.click(selectors.modalOkBtn, { delay: 2000 });
        await page.focus(selectors.input, { delay: 500 });

        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        await page.type(selectors.input, cpf, { delay: 500 });
        await page.keyboard.press("Enter");

        const secondResult = await queryReturn(page);

        if (secondResult === 'success') {
            return await startDownload(browser, page, cpf);
        } else if (secondResult === 'modalError') {
            return await returnModalMessage(browser, page, cpf);
        } else if (secondResult === 'resultError') {
            return await returnTableMessage(browser, page, cpf);
        }
    } else {
        return await returnModalMessage(browser, page, cpf);
    }
};

async function returnModalMessage(browser, page, cpf) {
    const errorMessage = await page.$eval(selectors.modalMessage, p => p.innerText.trim());
    await browser.close();
    return {
        status: false,
        mensagem: errorMessage
    };
};

async function returnTableMessage(browser, page, cpf) {
    const tableMessageElement = await page.$(selectors.tableMessage);
    let tableMessage = await page.evaluate(el => el.innerText.trim(), tableMessageElement);

    // Verificar quebra de linha para retorno de mensagem
    const newlineIndex = tableMessage.indexOf('\n');
    if (newlineIndex !== -1) {
        tableMessage = tableMessage.substring(newlineIndex + 1).trim();
    }
    
    console.log(`[LOG ERROR] - ${cpf}: ${tableMessage}.`);

    if (tableMessage.includes("A certidão foi emitida com sucesso")) {
        return await startDownload(browser, page, cpf);
    } else {
        await browser.close();
        return {
            status: false,
            mensagem: tableMessage
        };
    }
};

async function startDownload(browser, page, cpf) {
    await simulateHumanInteraction(page);
    console.log(`[LOG INFO] - ${cpf}: Iniciando configurações de download`);

    const client = await page._client();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
    });

    const downloadPromise = waitForDownload(downloadPath);
    console.log(`[LOG INFO] - ${cpf}: Monitoramento do download iniciado.`);

    await page.click(selectors.anchorCertification, { delay: 2000 });
    console.log(`[LOG INFO] - ${cpf}: Carregamento completo, iniciando download.`);

    await page.waitForSelector(selectors.tableMessage, { delay: 5000 });
    await delay(8000);
    const queryReturn = await downloadReturn(page);
    console.log(`[LOG INFO]: ${queryReturn}`);

    if (queryReturn) {
        console.log(`[LOG INFO] - ${cpf}: Certidão obtida com sucesso`);

        let downloadedFilePath = await downloadPromise;
        downloadedFilePath = downloadedFilePath.replace(".crdownload", "");
        console.log(`[LOG INFO] - ${cpf}: Download completo: ${downloadedFilePath}`);

        const downloadUrl = `${process.env.BASE_URL}/downloads/${path.basename(downloadedFilePath)}`;
        console.log(`[LOG INFO] - ${cpf}: URL criada: ${downloadUrl}`);

        await browser.close();
        return {
            status: true,
            mensagem: "Certidão emitida com sucesso",
            certidao: downloadUrl
        };
    } else {
        return await returnTableMessage(browser, page, cpf);
    }
};

async function queryReturn(page) {
    return Promise.race([
        page.waitForSelector(selectors.formSelecao, { visible: true }).then(() => 'success'),
        page.waitForSelector(selectors.modalMessage, { visible: true }).then(() => 'modalError'),
        page.waitForFunction(
            tableResult => document.querySelector(tableResult).innerText.includes("O número informado não consta"), { visible: true }, selectors.tableMessage
        ).then(() => 'resultError')
    ]);
};

async function downloadReturn(page) {
    return Promise.race([
        page.waitForFunction(
            tableResult => document.querySelector(tableResult).innerText.includes("A certidão foi emitida com sucesso"), { visible: true }, selectors.tableMessage
        ).then(() => true),
        page.waitForFunction(
            tableResult => document.querySelector(tableResult).innerText.includes("Não foi possível concluir a ação"), { visible: true }, selectors.tableMessage
        ).then(() => false),
        page.waitForFunction(
            tableResult => !document.querySelector(tableResult).innerText.includes("Consulta em processamento."), { visible: true }, selectors.tableMessage
        ).then(() => false)
    ]);
};

export default getCPFCertificateService;

// --------------------------------------------------------------------------

// import { selectors, simulateHumanInteraction, waitForDownload, downloadPath, delay } from '../utils/routines.js';

// import puppeteer from "puppeteer-extra";
// import StealthPlugin from "puppeteer-extra-plugin-stealth";
// import UserAgent from "user-agents";
// import path from 'path';

// puppeteer.use(StealthPlugin());

// const getCPFCertificateService = async (cpf) => {
//     console.log(`[LOG INFO] - ${cpf}: Inicializando scraping para ${cpf} às ${new Date().toLocaleString()}`)

//     try {
//         const browser = await puppeteer.launch({
//             headless: false,
//             defaultViewport: null,
//             args: ['--start-maximized']
//         });

//         let page = await browser.newPage();
//         await page.setUserAgent(new UserAgent().toString());
//         await page.setCacheEnabled(false);
        
//         await page.setRequestInterception(true);
//         page.on('request', (request) => {
//             const headers = request.headers();
//             delete headers['sec-ch-ua-platform'];
//             delete headers['pragma'];
//             delete headers['sec-ch-ua'];
//             delete headers['user-agent'];
//             headers['sec-ch-ua-platform'] = 'Windows';
//             headers['pragma'] = 'no-cache';
//             headers['sec-ch-ua'] = 'Google Chrome";v="124", "Not-A.Brand";v="99';
//             request.continue({ headers });
//         });

//         await page.goto(process.env.MAIN_URL, { waitUntil: 'networkidle0' });

//         await simulateHumanInteraction(page);

//         await page.waitForSelector(selectors.cpfBtn, { delay: 5000 });
//         await page.click(selectors.cpfBtn);

//         console.log(`[LOG INFO] - ${cpf}: Aguardando próxima página.`);

//         const secondPage = await browser.waitForTarget(target => target.url() === process.env.SECOND_PAGE_CPF);
//         page = await secondPage.page();

//         await simulateHumanInteraction(page);

//         await page.waitForSelector(selectors.input, { timeout: 60000 });
//         await page.focus(selectors.input, { delay: 4000 });

//         console.log(`[LOG INFO] - ${cpf}: Digitando CPF.`)
//         await page.type(selectors.input, cpf, { delay: 500 });

//         await page.keyboard.press('Enter');
//         console.log(`[LOG INFO] - ${cpf}: Consulta enviada.`);
//         await delay(3000)

//         console.log(`[LOG INFO] - ${cpf}: Aguardando retorno da consulta.`);
//         const queryResult = await queryReturn(page)

//             // Se retorno de sucesso cliar em iniciar download
//         if(queryResult === 'success'){
//             await startDownload(browser, page)
//         };

//             // Modal de mensagem com erro ao consultar número
//         if (queryResult === 'modalError') {
//             const errorMessage = await page.$eval(selectors.modalMessage, p => p.innerText);
//             console.log(`[LOG ERROR] - ${cpf}: ${errorMessage}.`);

//             if (errorMessage === "CPF inválido" || errorMessage === "CPF não informado") {
//                 console.log(`[LOG ERROR] - ${cpf}: ${errorMessage}.`)
//                 await page.click(selectors.cpfOkBtn, { delay: 2000 });
//                 await page.focus(selectors.input, { delay: 500 });

//                 await page.keyboard.down('Control');
//                 await page.keyboard.press('A');
//                 await page.keyboard.up('Control');
//                 await page.keyboard.press('Backspace');

//                 await page.type(selectors.input, cpf, { delay: 500 });
//                 await page.keyboard.press("Enter");

//                 const secondResult = queryReturn(page);

//                     // Se retorno de sucesso cliar em iniciar download
//                 if(secondResult === 'success'){
//                     await startDownload(browser, page)
//                 };
//                     // Encerra execução e retorna mensagem do modal
//                 if (secondResult === 'modalError') {
//                     await returnModalMessage(browser, page)
//                 };
//                     // Encerra execução e retorna mensagem da table
//                 if(secondResult === 'resultError'){
//                     await returnTableMessage(browser, page)
//                 };

//             } else {
//                 await returnModalMessage(browser, page)
//             }
//         };
//         if (queryResult === 'resultError'){
//             await returnTableMessage(browser, page)
//         }
//     } catch (error) {
//         console.error(`[LOG ERROR] - ${cpf}: ${error}`);
        
//         return {
//             status: false,
//             mensagem: "Não foi possível obter a certidão."
//         };
//     }
// };

// export default getCPFCertificateService;

// async function returnModalMessage (browser, page) {
//     const errorMessage = await page.$eval(selectors.message, p => p.innerText.trim());
//     await browser.close()
//     return {
//         status: false,
//         mensagem: errorMessage
//     };
// };

// async function returnTableMessage (browser, page) {
//     const tableMessage = await page.$eval(selectors.cpfTableMessage, el => el.innerText.trim());
//     if(tableMessage.includes("A certidão foi emitida com sucesso")){
//         startDownload(page)
//     }else{
//         await browser.close()
//         return {
//             status: false,
//             mensagem: tableMessage
//         };
//     }
// };

// async function startDownload (browser, page){
//     await simulateHumanInteraction(page);
//     console.log(`[LOG INFO] - ${cpf}: Iniciando configurações de download`)

//         // Permissão de download
//     const client = await page._client();
//     await client.send('Page.setDownloadBehavior', {
//         behavior: 'allow',
//         downloadPath: downloadPath
//     });
//         // Inicia monitoramento do download
//     const downloadPromise = waitForDownload(downloadPath);
//     console.log(`[LOG INFO] - ${cpf}: Monitoramento do download iniciado.`);

//         // Clicar botão 'segunda via' para iniciar download
//     await page.click(selectors.cpfACertification, { delay: 2000 });
//     console.log(`[LOG INFO] - ${cpf}: Carregamento completo, iniciando download.`)

//         // Tratamento retornos da consulta
//     await page.waitForSelector(selectors.cpfTableMessage, {delay: 5000});
//     await delay(8000)
//     const queryReturn = await downloadReturn(page);
//     console.log(`[LOG INFO] - ${cpf}: ${queryReturn}`)

//     if(queryReturn){
//         console.log(`[LOG INFO] -  ${cpf}: Certidão obtida com sucesso`);

//             // Aguardar o download completar e obter o caminho do arquivo
//         let downloadedFilePath = await downloadPromise;
//         downloadedFilePath = downloadedFilePath.replace(".crdownload", "")
//         console.log(`[LOG INFO] - ${cpf}: Download completo: ${downloadedFilePath}`);

//         const downloadUrl = `${process.env.BASE_URL}/downloads/${path.basename(downloadedFilePath)}`;
//         console.log(`[LOG INFO] - ${cpf}: URL criada: ${downloadUrl}`);

//         await browser.close()
//         return {
//             status: true,
//             mensagem: "Certidão emitida com sucesso",
//             certidao: downloadUrl
//         };
//     }else{
//         returnTableMessage(browser, page)
//     };
// };

// async function queryReturn(page){
//     return Promise.race([
//         page.waitForSelector(selectors.message, { visible: true }).then(() => 'modalError'),
//         page.waitForFunction(
//             tableResult => !document.querySelector(tableResult).innerText.includes("Consulta em processamento."), { visible: true }, selectors.cpfTableMessage
//         ).then(()=> 'resultError'),
//         page.waitForSelector(selectors.cpfFormSelecao, { visible: true }).then(() => 'success')
//     ])
// };

// async function downloadReturn(page){
//     return Promise.race([
//         page.waitForFunction(
//             tableResult => document.querySelector(tableResult).innerText.includes("A certidão foi emitida com sucesso"), { visible: true }, selectors.cpfTableMessage
//         ).then(()=> true),
//         page.waitForFunction(
//             tableResult => document.querySelector(tableResult).innerText.includes("Não foi possível concluir a ação"), { visible: true }, selectors.cpfTableMessage
//         ).then(()=> false),
//         page.waitForFunction(
//             tableResult => !document.querySelector(tableResult).innerText.includes("Consulta em processamento."), { visible: true }, selectors.cpfTableMessage
//         ).then(()=> false)
//     ])
// };



// -------------------------------------------------------------------------------

// import puppeteer from "puppeteer-extra";
// import StealthPlugin from "puppeteer-extra-plugin-stealth";
// import UserAgent from "user-agents";
// import fs from 'fs';
// import path from 'path';

// import { selectors } from '../utils/selectors.js';

// puppeteer.use(StealthPlugin());

// const simulateHumanInteraction = async (page) => {
//     // Movimentos aleatórios do mouse
//     for (let i = 0; i < 10; i++) {
//         await page.mouse.move(Math.random() * 1000, Math.random() * 1000, {delay: 3000});
//     }

//     // Rolagem aleatória
//     for (let i = 0; i < 5; i++) {
//         await page.evaluate(() => {
//             window.scrollBy(0, Math.random() * 1000);
//         });
//     }
// };

// function waitForDownload(downloadPath) {
//     return new Promise((resolve, reject) => {
//         fs.watch(downloadPath, (eventType, filename) => {
//             if (eventType === 'rename' && filename) {
//                 resolve(path.resolve(downloadPath, filename));
//             }
//         });
//     });
// }

// function delay(time) {
//     return new Promise(function(resolve) { 
//         setTimeout(resolve, time)
//     });
//  }

// const downloadPath = path.resolve('./downloads');

// const getCPFCertificateService = async (cpf) => {
//     console.log(`[LOG INFO] - ${cpf}: Inicializando scraping para ${cpf} às ${new Date().toLocaleString()}`)

//     try {
//         const browser = await puppeteer.launch({
//             headless: false,
//             defaultViewport: null,
//             args: ['--start-maximized']
//         });

//         let page = await browser.newPage();
//         await page.setUserAgent(new UserAgent().toString());
//         await page.setCacheEnabled(false);
        
//         await page.setRequestInterception(true);
//         page.on('request', (request) => {
//             const headers = request.headers();
//             delete headers['sec-ch-ua-platform'];
//             delete headers['pragma'];
//             delete headers['sec-ch-ua'];
//             delete headers['user-agent'];
//             headers['sec-ch-ua-platform'] = 'Windows';
//             headers['pragma'] = 'no-cache';
//             headers['sec-ch-ua'] = 'Google Chrome";v="124", "Not-A.Brand";v="99';
//             request.continue({ headers });
//         });

//         await page.goto(process.env.MAIN_URL, { waitUntil: 'networkidle0' });

//         await simulateHumanInteraction(page);

//         await page.waitForSelector(selectors.cpfBtn, { delay: 5000 });
//         await page.click(selectors.cpfBtn);

//         console.log(`[LOG INFO] - ${cpf}: Aguardando próxima página.`);

//         const secondPage = await browser.waitForTarget(target => target.url() === process.env.SECOND_PAGE_CPF);
//         page = await secondPage.page();

//         await simulateHumanInteraction(page);

//         await page.waitForSelector(selectors.input, { timeout: 60000 });
//         await page.focus(selectors.input, { delay: 4000 });

//         console.log(`[LOG INFO] - ${cpf}: Digitando CPF.`)
//         await page.type(selectors.input, cpf, { delay: 500 });

//         await page.keyboard.press('Enter');
//         console.log(`[LOG INFO] - ${cpf}: Consulta enviada.`);
//         await delay(3000)

//         // Esperar por erro ou sucesso

//         // const result = await Promise.race([
//         //     page.waitForSelector(selectors.message, { visible: true }).then(() => 'modalError'),
//         //     page.waitForSelector(selectors.cpfTableMessage, { visible: true }).then(() => 'resultError'),

//         //     page.waitForSelector(selectors.cpfFormSelecao, { visible: true }).then(() => 'success')
//         // ]);

//         console.log(`[LOG INFO] - ${cpf}: Aguardando retorno da consulta.`);
//         const queryResult = await Promise.race([
//             page.waitForSelector(selectors.message, { visible: true }).then(() => 'modalError'),
//             page.waitForFunction(
//                 tableResult => !document.querySelector(tableResult).innerText.includes("Consulta em processamento."), {}, selectors.cpfTableMessage
//             ).then(()=> 'resultError'),
//             page.waitForSelector(selectors.cpfFormSelecao, { visible: true }).then(() => 'success')
//         ])
//         // await delay(4000)

//         // Mensagem de erro ao consultar número
//         if (queryResult === 'modalError') {
//             const errorMessage = await page.$eval(selectors.message, p => p.innerText);
//             console.log(`[LOG ERROR] - ${cpf}: ${errorMessage}.`);

//             if (errorMessage === "CPF inválido") {
//                 console.log(`[LOG ERROR] - ${cpf}: ${errorMessage}.`)
//                 await page.click(selectors.cpfOkBtn, { delay: 2000 });
//                 await page.focus(selectors.input, { delay: 500 });

//                 await page.keyboard.down('Control');
//                 await page.keyboard.press('A');
//                 await page.keyboard.up('Control');
//                 await page.keyboard.press('Backspace');

//                 await page.type(selectors.input, cpf, { delay: 500 });
//                 await page.keyboard.press("Enter");

//                 const secondResult = await Promise.race([
//                     page.waitForSelector(selectors.message, { visible: true }).then(() => 'error'),
//                     page.waitForFunction(
//                         tableResult => !document.querySelector(tableResult).innerText.includes("Consulta em processamento."), {}, selectors.cpfTableMessage
//                     ).then(()=> 'resultError'),
//                     page.waitForSelector(selectors.cpfFormSelecao, { visible: true }).then(() => 'success')
//                 ]);
//                 if(secondResult === 'success'){

//                 }
//                 if (secondResult === 'error') {
//                     const errorMessage = await page.$eval(selectors.message, p => p.innerText);
//                     await browser.close()

//                     return {
//                         status: false,
//                         mensagem: errorMessage
//                     };
//                 }
//                 if(secondResult === 'resultError'){
//                     const errorMessage = await page.$eval(selectors.cpfTableMessage, el => el.innerText.trim());
//                     await browser.close()
//                     return {
//                         status: false,
//                         mensagem: errorMessage
//                     };
//                 }
//             } else {
//                 await browser.close()
//                 return {
//                     status: false,
//                     mensagem: errorMessage
//                 };
//             }
//         }
//         if (queryResult === 'resultError'){
//             const errorMessage = await page.$eval(selectors.cpfTableMessage, el => el.innerText.trim());
//             if(errorMessage.includes("O número informado não consta do cadastro CPF.")){
//                 await browser.close()
//                 return {
//                     status: false,
//                     mensagem: errorMessage
//                 };
//             }
//         }

//             //Aguardar botão 'segunda via'
//         await page.waitForSelector(selectors.cpfFormSelecao, { delay: 2000 });

//         await simulateHumanInteraction(page);

//         console.log(`[LOG INFO] - ${cpf}: Iniciando configurações de download`)

//             // Permissão de download
//         const client = await page._client();
//         await client.send('Page.setDownloadBehavior', {
//             behavior: 'allow',
//             downloadPath: path.resolve('./downloads')
//         });

//             // Inicia monitoramento do download
//         const downloadPromise = waitForDownload(downloadPath);
//         console.log(`[LOG INFO] - ${cpf}: Monitoramento do download iniciado.`);

//             // Clicar botão 'segunda via' para iniciar download
//         await page.click(selectors.cpfACertification, { delay: 2000 });
//         console.log(`[LOG INFO] - ${cpf}: Carregamento completo, iniciando download.`)

//             // Tratamento retornos da consulta
//         await page.waitForSelector(selectors.cpfTableMessage, {delay: 5000});
//         await delay(8000)
//         const queryReturn = await page.$eval(selectors.cpfTableMessage, el => el.innerText.trim());
//         console.log(`[LOG INFO] - ${cpf}: ${queryReturn}`)

//         if(queryReturn.includes("A certidão foi emitida com sucesso")){
//             console.log(`[LOG INFO] -  ${cpf}: Certidão obtida com sucesso`);

//                 // Aguardar o download completar e obter o caminho do arquivo
//             let downloadedFilePath = await downloadPromise;
//             downloadedFilePath = downloadedFilePath.replace(".crdownload", "")
//             console.log(`[LOG INFO] - ${cpf}: Download completo: ${downloadedFilePath}`);

//             const downloadUrl = `${process.env.BASE_URL}/downloads/${path.basename(downloadedFilePath)}`;
//             console.log(`[LOG INFO] - ${cpf}: URL criada: ${downloadUrl}`);

//             await browser.close()

//             return {
//                 status: true,
//                 mensagem: "Certidão emitida com sucesso",
//                 certidao: downloadUrl
//             };
//         }

//         // Retornos da consulta inválidos
//         if (queryReturn.includes("Consulta em processamento")) {

//             console.log(`[LOG INFO] - ${cpf}: ${queryReturn}`);
            
//             // Aguardar 5 segundos antes de verificar novamente
//             await delay(4000)

//             console.log(`[LOG INFO] - ${cpf}: Aguardando retorno completo.`);
    
//             // Verificar novamente o retorno da consulta
//             const updatedTextError = await page.$eval(selectors.cpfTableMessage, el => el.innerText);
    
//             if (updatedTextError.includes("Não foi possível concluir a ação")) {
//                 const message = "Não foi possível concluir a ação para o contribuinte informado. Por favor, tente novamente dentro de alguns minutos.";
//                 console.log(`[LOG ERROR]: Retorno da consulta: ${message}`);
                
//                 await browser.close()
//                 return {
//                     status: false,
//                     mensagem: message
//                 };
//             } else if(queryReturn.includes("A certidão foi emitida com sucesso")){
//                 console.log(`[LOG INFO] -  ${cpf}: Certidão obtida com sucesso`);
    
//                 // Aguardar o download completar e obter o caminho do arquivo
//                 let downloadedFilePath = await downloadPromise;
//                 downloadedFilePath = downloadedFilePath.replace(".crdownload", "")
//                 console.log(`[LOG INFO] - ${cpf}: Download completo: ${downloadedFilePath}`);
    
//                 const downloadUrl = `${process.env.BASE_URL}/downloads/${path.basename(downloadedFilePath)}`;
//                 console.log(`[LOG INFO] - ${cpf}: URL criada: ${downloadUrl}`);

//                 await browser.close()
//                 return {
//                     status: true,
//                     mensagem: "Certidão emitida com sucesso",
//                     certidao: downloadUrl
//                 };
//             }else{
//                 const messageError = await page.$eval(selectors.cpfTableMessage, el => el.innerText);
//                 console.log(`[LOG ERROR]: Retorno da consulta: ${messageError}`);

//                 await browser.close()
//                 return {
//                     status: false,
//                     mensagem: "Não foi possível obter a certidão."
//                 };
//             }
//         }else if(queryReturn.includes("Não foi possível concluir a ação")){
//             message = "Não foi possível concluir a ação para o contribuinte informado. Por favor, tente novamente dentro de alguns minutos.";
//             console.log(`[LOG ERROR] - ${cpf}: Retorno da consulta: ${message}`);

//             await browser.close()
//             return {
//                 status: false,
//                 mensagem: message
//             };
//         }
//     } catch (error) {
//         console.error(`[LOG ERROR] - ${cpf}: ${error}`);
        
//         return {
//             status: false,
//             mensagem: "Não foi possível obter a certidão."
//         };
//     }
// };

// export default getCPFCertificateService;
//