import { selectors, simulateHumanInteraction, waitForDownload, downloadPath, delay } from '../utils/routines.js';
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import path from 'path';

puppeteer.use(StealthPlugin());


const getCNPJCertificateService = async (cnpj) => {
    console.log(`[LOG INFO] - ${cnpj}: Inicializando scraping para ${cnpj} às ${new Date().toLocaleString()}`);

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
            console.log(`[LOG INFO] - ${cnpj}: Modal compatível com navegador encontrado. Clicando...`);
            await modalButton.click();
            await simulateHumanInteraction(page);
        }

        await simulateHumanInteraction(page);

        await page.waitForSelector(selectors.cnpjBtn, { delay: 5000 });
        await page.click(selectors.cnpjBtn);

        console.log(`[LOG INFO] - ${cnpj}: Aguardando próxima página.`);

        const secondPage = await browser.waitForTarget(target => target.url() === process.env.SECOND_PAGE_CNPJ);
        page = await secondPage.page();

        await simulateHumanInteraction(page);

        await page.waitForSelector(selectors.input, { timeout: 60000 });
        await page.focus(selectors.input, { delay: 4000 });

        console.log(`[LOG INFO] - ${cnpj}: Digitando CNPJ.`);
        await page.type(selectors.input, cnpj, { delay: 500 });

        await page.keyboard.press('Enter');
        console.log(`[LOG INFO] - ${cnpj}: Consulta enviada.`);
        await delay(3000);

        console.log(`[LOG INFO] - ${cnpj}: Aguardando retorno da consulta.`);
        const queryResult = await queryReturn(page);

        if (queryResult === 'success') {
            return await startDownload(browser, page, cnpj);
        } else if (queryResult === 'modalError') {
            return await handleModalError(browser, page, cnpj);
        } else {
            return await returnTableMessage(browser, page, cnpj);
        }
    } catch (error) {
        console.error(`[LOG ERROR] - ${cnpj}: ${error}`);
        
        return {
            status: false,
            mensagem: "Não foi possível obter a certidão."
        };
    }
};

async function handleModalError(browser, page, cnpj) {
    const errorMessage = await page.$eval(selectors.modalMessage, p => p.innerText.trim());
    console.log(`[LOG ERROR] - ${cnpj}: ${errorMessage}.`);

    if (errorMessage === "CNPJ inválido" || errorMessage === "CNPJ não informado") {
        await page.click(selectors.modalOkBtn, { delay: 2000 });
        await page.focus(selectors.input, { delay: 500 });

        console.log(`[LOG INFO] - ${cnpj}: Limpando consulta.`);
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        console.log(`[LOG INFO] - ${cnpj}: Digitando CNPJ.`);
        await page.type(selectors.input, cnpj, { delay: 500 });
        await page.keyboard.press("Enter");

        console.log(`[LOG INFO] - ${cnpj}: Aguardando retorno da consulta.`);
        const secondResult = await queryReturn(page);

        if (secondResult === 'success') {
            return await startDownload(browser, page, cnpj);
        } else if (secondResult === 'modalError') {
            return await returnModalMessage(browser, page, cnpj);
        } else if (secondResult === 'resultError') {
            return await returnTableMessage(browser, page, cnpj);
        }
    } else {
        return await returnModalMessage(browser, page, cnpj);
    }
};

async function returnModalMessage(browser, page, cnpj) {
    const errorMessage = await page.$eval(selectors.modalMessage, p => p.innerText.trim());
    await browser.close();
    return {
        status: false,
        mensagem: errorMessage
    };
};

async function returnTableMessage(browser, page, cnpj) {
    const tableMessageElement = await page.$(selectors.tableMessage);
    let tableMessage = await page.evaluate(el => el.innerText.trim(), tableMessageElement);

    // Verificar quebra de linha para retorno de mensagem
    const newlineIndex = tableMessage.indexOf('\n');
    if (newlineIndex !== -1) {
        tableMessage = tableMessage.substring(newlineIndex + 1).trim();
    }

    console.log(`[LOG ERROR] - ${cnpj}: ${tableMessage}.`);

    if (tableMessage.includes("A certidão foi emitida com sucesso")) {
        return await startDownload(browser, page, cnpj);
    } else {
        await browser.close();
        return {
            status: false,
            mensagem: tableMessage
        };
    }
};

async function startDownload(browser, page, cnpj) {
    await simulateHumanInteraction(page);
    console.log(`[LOG INFO] - ${cnpj}: Iniciando configurações de download`);

    const client = await page._client();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
    });

    const downloadPromise = waitForDownload(downloadPath);
    console.log(`[LOG INFO] - ${cnpj}: Monitoramento do download iniciado.`);

    await page.click(selectors.anchorCertification, { delay: 2000 });
    console.log(`[LOG INFO] - ${cnpj}: Carregamento completo, iniciando download.`);

    await page.waitForSelector(selectors.tableMessage, { delay: 5000 });
    await delay(8000);
    const queryReturn = await downloadReturn(page);

    if (queryReturn) {
        console.log(`[LOG INFO] - ${cnpj}: Certidão obtida com sucesso`);

        let downloadedFilePath = await downloadPromise;
        downloadedFilePath = downloadedFilePath.replace(".crdownload", "");
        console.log(`[LOG INFO] - ${cnpj}: Download completo: ${downloadedFilePath}`);

        const downloadUrl = `${process.env.BASE_URL}/downloads/${path.basename(downloadedFilePath)}`;
        console.log(`[LOG INFO] - ${cnpj}: URL criada: ${downloadUrl}`);

        await browser.close();
        return {
            status: true,
            mensagem: "Certidão emitida com sucesso",
            certidao: downloadUrl
        };
    } else {
        return await returnTableMessage(browser, page, cnpj);
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

export default getCNPJCertificateService