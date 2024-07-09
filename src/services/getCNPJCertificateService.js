/* 
------------------------------------------------------------------------------------------
Services - responsável pela execução do web scraping e retorno para o Controller com sucesso ou falha
relacionada às respostas do navegador.
 Autora: Jana Machado
 Data: 08/07/2024
 ------------------------------------------------------------------------------------------
 */ 

 import { 
    selectors,
    simulateHumanInteraction,
    delay,
    handleModalError,
    returnTableMessage,
    startDownload,
    queryReturn
} from '../utils/routines.js';

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import path from 'path';

puppeteer.use(StealthPlugin());


const getCNPJCertificateService = async (cnpj) => {
    console.log(`[LOG INFO] - ${cnpj}: Inicializando scraping para ${cnpj} às ${new Date().toLocaleString()}`);

        // Início do Browser
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    try {
            // Criação de página e configurações do navegador
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

            // Navegador
        await page.goto(process.env.MAIN_URL, { waitUntil: 'networkidle0' });

        const modalIncompatibleBrowser = await page.$(selectors.modalCompatibleBrowser);
        if (modalIncompatibleBrowser) {
            console.log(`[LOG INFO] - ${cnpj}: Modal compatível com navegador encontrado. Clicando...`);
            await modalIncompatibleBrowser.click();
            await simulateHumanInteraction(page);
        }

        await simulateHumanInteraction(page);

            // Inicia tela para consulta
        await page.waitForSelector(selectors.cnpjBtn);
        await page.click(selectors.cnpjBtn);

        console.log(`[LOG INFO] - ${cnpj}: Aguardando próxima página.`);

        const secondPage = await browser.waitForTarget(target => target.url() === process.env.SECOND_PAGE_CNPJ);
        page = await secondPage.page();

        await simulateHumanInteraction(page);
        console.log(`[LOG INFO] - ${cnpj}: Iniciando consulta.`);

        await page.waitForSelector(selectors.input, { timeout: 60000 });
        await page.focus(selectors.input, { delay: 4000 });

        console.log(`[LOG INFO] - ${cnpj}: Digitando CNPJ.`);
        await page.type(selectors.input, cnpj, { delay: 100 });

            // Início da consulta
        await page.keyboard.press('Enter');
        console.log(`[LOG INFO] - ${cnpj}: Consulta enviada.`);
        const queryResult = await queryReturn(browser, page, cnpj);
        console.log(`[LOG INFO] - ${cnpj}: Aguardando retorno da consulta.`);
        await delay(3000);

            // Processamentos da consulta
        if (queryResult === 'success') {
            return await startDownload(browser, page, cnpj);
        } else if (queryResult === 'modalError') {
            return await handleModalError(browser, page, cnpj);
        } else {
            return await returnTableMessage(browser, page, cnpj);
        }
    } catch (error) {
        console.error(`[LOG ERROR] - ${cnpj}: ${error}`);
        await browser.close()
        return {
            status: false,
            mensagem: "Não foi possível obter a certidão."
        };
    }
};

export default getCNPJCertificateService;