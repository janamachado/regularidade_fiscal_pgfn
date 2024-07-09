/* 
------------------------------------------------------------------------------------------
Routines - Funções de rotinas repetitivas para auxiliar em toda a aplicação.
 Autora: Jana Machado
 Data: 08/07/2024
 ------------------------------------------------------------------------------------------
 */ 

import fs from 'fs';
import path from 'path';

export const selectors = {
	input: '#NI',
	modalMessage: '#mensagem',
	modalCompatibleBrowser: "body > modal-container > div.modal-dialog > div > app-modal > div.modal-header.navegador-nao-compativel > button",
	modalOkBtn: '.ui-dialog-buttonset > button',
	tableMessage: '#main-container > div > table > tbody > tr > td',
	anchorCertification: '#FrmSelecao > a:nth-child(6)',
	formSelecao: '#FrmSelecao',
	
	cpfBtn: '#conEdital-2 > div.cel-content > a.btn.btn-primary.btn-one',
	cnpjBtn: '#conEdital-3 > div.cel-content > a.btn.btn-primary.btn-one',

	authenticityCPFBtn: "#conEdital-2 > div.cel-content > a.btn.btn-primary.btn-two",
	authenticityCNPJBtn: "#conEdital-3 > div.cel-content > a.btn.btn-primary.btn-two",

	inputControleCertidao: "#NumControleCertidao",
	inputDataEmissao: "#DtEmissaoCertidao",
	inputHoraEmissao: "#HoEmissaoCertidao",
	selectTipoCertidao: "#TipoCertidaoStr"
};

	// Manipulação de erros com modal
export async function handleModalError(browser, page, documentNumber) {
	const errorMessage = await page.$eval(selectors.modalMessage, p => p.innerText.trim());
	console.log(`[LOG ERROR] - ${documentNumber}: ${errorMessage}.`);

	if (errorMessage === "CPF inválido" || errorMessage === "CPF não informado") {
		await page.click(selectors.modalOkBtn, { delay: 2000 });
		await page.focus(selectors.input, { delay: 500 });

			//Segunda tentativa
		console.log(`[LOG INFO] - ${documentNumber}: Limpando consulta.`);
		await page.keyboard.down('Control');
		await page.keyboard.press('A');
		await page.keyboard.up('Control');
		await page.keyboard.press('Backspace');

		console.log(`[LOG INFO] - ${documentNumber}: Digitando CPF, segunda tentativa.`);
		await page.type(selectors.input, documentNumber, { delay: 500 });
		await page.keyboard.press("Enter");

		console.log(`[LOG INFO] - ${documentNumber}: Aguardando retorno da consulta.`);
		const secondResult = await queryReturn(page);
		
			// Processamentos da consulta
		if (secondResult === 'success') {
			return await startDownload(browser, page, documentNumber);
		} else if (secondResult === 'modalError') {
			return await returnModalMessage(browser, page, documentNumber);
		} else if (secondResult === 'resultError') {
			return await returnTableMessage(browser, page, documentNumber);
		}
	} else {
		return await returnModalMessage(browser, page, documentNumber);
	}
};
	
	// Encerra e retorna erros referentes ao modal
export async function returnModalMessage(browser, page) {
	const errorMessage = await page.$eval(selectors.modalMessage, p => p.innerText.trim());
	await browser.close();
	return {
		status: false,
		mensagem: errorMessage
	};
};
	
	// Encerra e retorna erros referentes a table
export async function returnTableMessage(browser, page, documentNumber) {
	const tableMessageElement = await page.$(selectors.tableMessage);
	let tableMessage = await page.evaluate(el => el.innerText.trim(), tableMessageElement);

	// Verificar quebra de linha para retorno de mensagem
	const newlineIndex = tableMessage.indexOf('\n');
	if (newlineIndex !== -1) {
		tableMessage = tableMessage.substring(newlineIndex + 1).trim();
	}
	
	console.log(`[LOG ERROR] - ${documentNumber}: ${tableMessage}.`);

	if (tableMessage.includes("A certidão foi emitida com sucesso")) {
		return await startDownload(browser, page, documentNumber);
	} else {
		await browser.close();
		return {
			status: false,
			mensagem: tableMessage
		};
	}
};
	// Início do download e retorno
export async function startDownload(browser, page, documentNumber) {
	try {
		await simulateHumanInteraction(page);
		console.log(`[LOG INFO] - ${documentNumber}: Iniciando configurações de download`);
	
		const client = await page._client();
		await client.send('Page.setDownloadBehavior', {
			behavior: 'allow',
			downloadPath: downloadPath
		});
	
		const downloadPromise = waitForDownload(downloadPath);
		console.log(`[LOG INFO] - ${documentNumber}: Monitoramento do download iniciado.`);
	
		await page.click(selectors.anchorCertification, { delay: 2000 });
		console.log(`[LOG INFO] - ${documentNumber}: Carregamento completo, iniciando download.`);
	
		await page.waitForSelector(selectors.tableMessage, { delay: 5000 });
		await delay(8000);
	
			// Retorno e tratamento do download
		const isDownloaded = await downloadQueryReturn(browser, page);
	
		if (isDownloaded) {
			console.log(`[LOG INFO] - ${documentNumber}: Certidão obtida com sucesso`);
	
			let downloadedFilePath = await downloadPromise;
			downloadedFilePath = downloadedFilePath.replace(".crdownload", "");
			console.log(`[LOG INFO] - ${documentNumber}: Download completo: ${downloadedFilePath}`);
	
			const downloadUrl = `${process.env.BASE_URL}/downloads/${path.basename(downloadedFilePath)}`;
			console.log(`[LOG INFO] - ${documentNumber}: URL criada: ${downloadUrl}`);
	
			await browser.close();
			return {
				status: true,
				mensagem: "Certidão emitida com sucesso",
				certidao: downloadUrl
			};
		} else {
			return await returnTableMessage(browser, page, documentNumber);
		}
		
	} catch (error) {
		console.error(`[LOG ERROR]: ${documentNumber}: ${error}`)
		await browser.close()
		return {
			status: false,
			mensagem: "Erro no download da certidão"
		};
	}
};

	// Manipulação de possíveis respostas da consulta
export async function queryReturn(browser, page, documentNumber) {
	try {
		return Promise.race([
			page.waitForSelector(selectors.formSelecao, { visible: true }).then(() => 'success'),
			page.waitForSelector(selectors.modalMessage, { visible: true }).then(() => 'modalError'),
			page.waitForFunction(
				tableResult => document.querySelector(tableResult).innerText.includes("O número informado não consta"), { visible: true }, selectors.tableMessage
			).then(() => 'resultError')
		]);
	} catch (error) {
		console.error(`[LOG ERROR]: ${documentNumber}: ${error}`)
		await browser.close()
		return {
			status: false,
			mensagem: "Erro na consulta do documento"
		};
	}
};

	// Manipulação de possíveis respostas do download do arquivo
export async function downloadQueryReturn(browser, page, documentNumber) {
	try {
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
	} catch (error) {
		console.error(`[LOG ERROR]: ${documentNumber}: ${error}`)
		await browser.close()
		return {
			status: false,
			mensagem: "Erro no download da certidão"
		};
	}
};

export function isValidCPF(cpf) {
	cpf = cpf.replace(/[^\d]+/g, '');
	if (cpf.length !== 11) return false;

	let sum = 0;
	let remainder;
	for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
	remainder = (sum * 10) % 11;
	if (remainder === 10 || remainder === 11) remainder = 0;
	if (remainder !== parseInt(cpf.substring(9, 10))) return false;

	sum = 0;
	for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
	remainder = (sum * 10) % 11;
	if (remainder === 10 || remainder === 11) remainder = 0;
	if (remainder !== parseInt(cpf.substring(10, 11))) return false;
	return true;
};

export function isValidCNPJ(cnpj) {
	cnpj = cnpj.replace(/[^\d]+/g, '');
	if (cnpj.length !== 14) return false;

	let length = cnpj.length - 2;
	let numbers = cnpj.substring(0, length);
	let digits = cnpj.substring(length);
	let sum = 0;
	let pos = length - 7;
	for (let i = length; i >= 1; i--) {
		sum += numbers.charAt(length - i) * pos--;
		if (pos < 2) pos = 9;
	}
	let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
	if (result !== parseInt(digits.charAt(0))) return false;

	length += 1;
	numbers = cnpj.substring(0, length);
	sum = 0;
	pos = length - 7;
	for (let i = length; i >= 1; i--) {
		sum += numbers.charAt(length - i) * pos--;
		if (pos < 2) pos = 9;
	}
	result = sum % 11 < 2 ? 0 : 11 - sum % 11;
	if (result !== parseInt(digits.charAt(1))) return false;
	return true;
};

export function removeMask(number) {
	return number.replace(/[^\d]/g, '');
};

export const simulateHumanInteraction = async (page) => {
	for (let i = 0; i < 10; i++) {
		await page.mouse.move(Math.random() * 1000, Math.random() * 1000, {delay: 3000});
	}

	for (let i = 0; i < 5; i++) {
		await page.evaluate(() => {
			window.scrollBy(0, Math.random() * 1000);
		});
	}
};

export function waitForDownload(downloadPath) {
	return new Promise((resolve, reject) => {
		fs.watch(downloadPath, (eventType, filename) => {
			if (eventType === 'rename' && filename) {
				resolve(path.resolve(downloadPath, filename));
			}
		});
	});
};

export const downloadPath = path.resolve('./downloads');

export function delay(time) {
	return new Promise(function(resolve) { 
		setTimeout(resolve, time)
	});
}