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