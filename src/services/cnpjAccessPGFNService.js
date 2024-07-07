import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";

import { selectors } from '../utils/selectors.js';


const getCNPJCertificate = async (cnpj) => {
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

        await simulateHumanInteraction(page);

        await page.waitForSelector(cnpjBTn, { delay: 5000 });
        await page.click(cnpjBTn);

        console.log("Aguardando próxima página.");
        const secondPage = await browser.waitForTarget(target => target.url() === process.env.SECOND_PAGE_CNPJ);
        page = await secondPage.page();

        await simulateHumanInteraction(page);

        await page.waitForSelector(input, { timeout: 60000 });
        await page.focus(input, { delay: 4000 });
        await page.type(input, cnpj, { delay: 500 });
        await page.keyboard.press('Enter');

        const errorMessage = await page.waitForSelector('#mensagem', { visible: true, timeout: 5000 });
        let message;
        if (errorMessage) {
            message = await page.$eval("#mensagem", p => p.innerText);
            console.log('Elemento #mensagem encontrado na página.');

            if (message == "CNPJ inválido") {
                await page.click(".ui-dialog-buttonset > button", { delay: 2000 });
                await page.focus(input, { delay: 500 });

                await page.keyboard.down('Control');
                await page.keyboard.press('A');
                await page.keyboard.up('Control');
                await page.keyboard.press('Backspace');

                await page.type(input, cpf, { delay: 500 });
                await page.keyboard.press("Enter");

                await page.waitForSelector('#mensagem', { visible: true, timeout: 5000 });
                message = await page.$eval("#mensagem", p => p.innerText);
            }

            const invalidAcces = {
                status: false,
                mensagem: message
            };
            return invalidAcces;
        }

        console.log("Aguardando próxima página.");
        const thirdPage = await browser.waitForTarget(target => target.url() === process.env.THIRD_PAGE_CNPJ);
        page = await thirdPage.page();

        await page.waitForSelector("#FrmSelecao");
        if(textError.includes('Não foi possível concluir a ação')){
            message = "Não foi possível concluir a ação para o contribuinte informado. Por favor, tente novamente dentro de alguns minutos."
            const invalidAcces = {
                status: false,
                mensagem: message
            };
            return invalidAcces;
        }

        return {
            status: true,
            certidao: "https://url.com"
        };

    } catch (error) {
        console.error(error);
        return {
            status: false,
            mensagem: "Erro ao obter certidão CPF"
        };
    }
};

export default getCNPJCertificate