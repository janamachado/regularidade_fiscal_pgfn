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
	// Movimentos aleatórios do mouse
	for (let i = 0; i < 10; i++) {
		await page.mouse.move(Math.random() * 1000, Math.random() * 1000, {delay: 3000});
	}

	// Rolagem aleatória
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