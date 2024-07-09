/* 
------------------------------------------------------------------------------------------
Services - responsável pela execução do web scraping e retorno para o Controller com sucesso ou falha
relacionada às respostas do navegador.
 Autora: Jana Machado
 Data: 08/07/2024
 ------------------------------------------------------------------------------------------
 */ 

import { selectors, simulateHumanInteraction, delay } from '../utils/routines.js';
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";

puppeteer.use(StealthPlugin());

const getCNPJAuthenticityCertificateService = async (numero, codigoControle, dataEmissao, horaEmissao, tipoCertidao) => {
	console.log("Dados no Service:", numero, codigoControle, dataEmissao, horaEmissao, tipoCertidao)
	console.log(`[LOG INFO] - ${numero}: Inicializando scraping para ${numero} às ${new Date().toLocaleString()}`);

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
			console.log(`[LOG INFO] - ${numero}: Modal compatível com navegador encontrado. Clicando...`);
			await modalButton.click();
			await simulateHumanInteraction(page);
		}

		await simulateHumanInteraction(page);

		await page.waitForSelector(selectors.authenticityCNPJBtn, { delay: 5000 });
		await page.click(selectors.authenticityCNPJBtn);
		
		console.log(`[LOG INFO] - ${numero}: Aguardando próxima página.`);
		
		const secondPage = await browser.waitForTarget(target => target.url() === "https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/AutenticidadePGFN/Confirmar");
		page = await secondPage.page();
		
		await simulateHumanInteraction(page);
		
		await page.waitForSelector(selectors.input, { timeout: 60000 });
		await page.focus(selectors.input);
		await delay(2000)

		console.log(`[LOG INFO] - ${numero}: Digitando CNPJ.`);
		await page.type(selectors.input, numero, { delay: 100 });
		await delay(2000)

		console.log(`[LOG INFO] - ${numero}: Digitando Código de Controle ${codigoControle}.`);
		await page.type(selectors.inputControleCertidao, codigoControle, { delay: 100 });
		await delay(2000)

		console.log(`[LOG INFO] - ${numero}: Digitando Data de Emissão ${dataEmissao}.`);
		await page.type(selectors.inputDataEmissao, dataEmissao, { delay: 100 });
		await delay(2000)

		console.log(`[LOG INFO] - ${numero}: Digitando Hora de Emissão ${horaEmissao}.`);
		await page.type(selectors.inputHoraEmissao, horaEmissao, { delay: 100 });
		await delay(2000)

		console.log(`[LOG INFO] - ${numero}: Selecionando Tipo de Certidão ${tipoCertidao}.`);
		await page.focus(selectors.selectTipoCertidao);
		const optionValue = await page.evaluate((tipoCertidao) => {
			const options = Array.from(document.querySelectorAll('#TipoCertidaoStr option'));
			const option = options.find(opt => opt.textContent === tipoCertidao);
			return option ? option.value : '';
		}, tipoCertidao);

		if (optionValue) {
			await page.select(selectors.selectTipoCertidao, optionValue);
		} else {
			console.log(`[LOG ERROR] - Opção "${tipoCertidao}" não encontrada.`);
		}
		await delay(2000)

		await page.keyboard.press('Enter');
		console.log(`[LOG INFO] - ${numero}: Consulta enviada.`);
		await delay(3000);

		console.log(`[LOG INFO] - ${numero}: Aguardando retorno da consulta.`);
		const queryResult = await queryReturn(page);

		if (queryResult === 'success') {
			return await returnSuccess(browser, page, numero)
		} else if (queryResult === 'modalError') {
			return await handleModalError(browser, page, numero);
		} else if (queryResult === 'error'){
			return await returnTableMessage(browser, page, numero);
		}
	} catch (error) {
		console.error(`[LOG ERROR] - ${numero}: ${error}`);
		
		return {
			status: false,
			mensagem: "Não foi possível validar a autenticidade da certidão."
		};
	}
};

async function handleModalError(browser, page, numero) {
	const errorMessage = await page.$eval(selectors.modalMessage, p => p.innerText.trim());
	console.log(`[LOG ERROR] - ${numero}: ${errorMessage}.`);

	if (errorMessage === "CNPJ inválido" || errorMessage === "CNPJ não informado") {
		await page.click(selectors.modalOkBtn, { delay: 2000 });
		await page.focus(selectors.input);

        console.log(`[LOG INFO] - ${numero}: Limpando consulta.`);
        console.log(`[LOG INFO] - ${numero}: Digitando CNPJ.`);
		await page.type(selectors.input, numero, { delay: 100 });
		await page.keyboard.press("Enter");

        console.log(`[LOG INFO] - ${numero}: Aguardando retorno da consulta.`);
		const secondResult = await queryReturn(page);

		if (secondResult === 'success') {
			return await returnSuccess(browser, page, numero)
		} else if (secondResult === 'modalError') {
			return await returnModalMessage(browser, page, numero);
		} else if (secondResult === 'error') {
			return await returnTableMessage(browser, page, numero);
		}
	} else {
		return await returnModalMessage(browser, page, numero);
	}
};

async function returnSuccess(browser, page, numero){
	console.log(`[LOG INFO]: ${numero}: Certidão autentica.`)
	const tableMessageElement = await page.$(selectors.tableMessage);
	let tableMessage = await page.evaluate(el => el.innerText.trim(), tableMessageElement);
	
    // Extrair a linha com retorno necessário
    const lines = tableMessage.split('\n').map(line => line.trim());
    let relevantLine = "";

    for (const line of lines) {
        if (line.includes("com validade até") || line.includes("A Certidão não é autêntica.")) {
            relevantLine = line;
            break;
        }
    }

	await browser.close();
    return {
        status: true,
        mensagem: relevantLine,
    };
};

async function returnModalMessage(browser, page) {
	const errorMessage = await page.$eval(selectors.modalMessage, p => p.innerText.trim());
	await browser.close();
	return {
		status: false,
		mensagem: errorMessage
	};
};

async function returnTableMessage(browser, page, numero) {
	console.log(`[LOG INFO]: ${numero}: Certidão autentica.`)
	const tableMessageElement = await page.$(selectors.tableMessage);
	let tableMessage = await page.evaluate(el => el.innerText.trim(), tableMessageElement);
	
    	// Extrair a linha com retorno necessário
    const lines = tableMessage.split('\n').map(line => line.trim());
    let relevantLine = "";

    for (const line of lines) {
        if (line.includes("com validade até") || line.includes("A Certidão não é autêntica.")) {
            relevantLine = line;
            break;
        }
    }

	await browser.close();
    return {
        status: false,
        mensagem: relevantLine,
    };
};

async function queryReturn(page) {
	return Promise.race([
		page.waitForSelector(selectors.modalMessage, { visible: true }).then(() => 'modalError'),
		page.waitForFunction(
			tableResult => document.querySelector(tableResult).innerText.includes("validade até"), { visible: true }, selectors.tableMessage
		).then(() => 'success'),
		page.waitForFunction(
			tableResult => document.querySelector(tableResult).innerText.includes("A Certidão não é autêntica"), { visible: true }, selectors.tableMessage
		).then(() => 'error')
	]);
};

export default getCNPJAuthenticityCertificateService;