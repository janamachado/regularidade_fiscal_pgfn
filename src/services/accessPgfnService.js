// import puppeteer from "puppeteer-core";
import puppeteer from "puppeteer";

//hcaptch - data-sitekey='4a65992d-58fc-4812-8b87-789f7e7c4c4b'



const getCPFCertificate = async (cpf) =>{
    
    try {

        const browser = await puppeteer.launch({
            // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless: true,
            defaultViewport: null,
            devtools: true,
            args: ['--start-maximized', '--disable-setuid-sandbox']
        });

        let page = await browser.newPage();
        await page.setRequestInterception(true);

            //Fechar guia em branco
        // const pages = await browser.pages();
        // if (pages.length > 1) {
        //     await pages[0].close();
        // }
    
        console.log("Iniciando busca da certidão para:", cpf)
        
        // INICIO
        
        page.on('request', (request) => {
            const headers = request.headers();
            const url = request.url()
            
            //Interceptar scripts hcaptcha
            if (url.includes('barra-governo') || url.includes('barra') || url.includes('captcha')|| url.includes('hcaptcha') || url.includes('recaptchacompat')) {
                console.log('Interceptando requisição para:', request.url());
                request.abort();
                // request.continue();
                return;
            }

            // Excluir headers 
            delete headers['sec-ch-ua-platform'];
            delete headers['pragma'];
            delete headers['sec-ch-ua'];
            delete headers['user-agent'];
            
            // Add novos headers
            headers['sec-ch-ua-platform'] = 'Windows';
            headers['pragma'] = 'no-cache';
            headers['sec-ch-ua'] = 'Google Chrome";v="124", "Not-A.Brand";v="99';
            headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0';
            
            request.continue({ headers });
        });

        //TENTATIVA SCRAPING PRIMEIRA PÁGINA
        // await page.goto("https://www.regularize.pgfn.gov.br/",{ waitUntil: 'networkidle0' })

        // await page.waitForSelector('.btn.btn-primary.btn-one', {delay: 2000})
        // await page.click('.btn.btn-primary.btn-one')

        // console.log("Aguardando próxima página.")

        // const newTarget = await browser.waitForTarget(target => target.url() === 'https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PF/EmitirPGFN');
        // page = await newTarget.page();
        //MUDANÇA PARA OUTRA PÀGINA
        
        //TENTATIVA SCRAPING DIRETO NA SEGUNDA PÁGINA
        await page.goto(process.env.URL_CPF,{ waitUntil: 'networkidle0' })

        await page.waitForSelector("#NI", { timeout: 60000 })
        await page.focus("#NI", { delay: 4000 })
        await page.type("#NI", cpf, { delay: 500 })
        await page.keyboard.press('Enter')
        // await page.click('#validar', {delay: 1000})

        const errorMessage = await page.waitForSelector('#mensagem', { visible: true, timeout: 5000 });
        let message
        if(errorMessage){
            message = await page.$eval("#mensagem", p => p.innerText)
            console.log('Elemento #mensagem encontrado na página.');

            if(message == "CPF inválido"){
                await page.click(".ui-dialog-buttonset > button", { delay: 2000 })
                await page.focus("#NI", { delay: 500 })

                await page.keyboard.down('Control')
                await page.keyboard.press('A')
                await page.keyboard.up('Control')
                await page.keyboard.press('Backspace')

                await page.type("#NI", cpf, { delay: 500 })
                await page.keyboard.press("Enter")

                await page.waitForSelector('#mensagem', { visible: true, timeout: 5000 })
                message = await page.$eval("#mensagem", p => p.innerText)
            }

            const invalidAcces = {
                status: false,
                mensagem: message
            }
            await browser.close()
            return invalidAcces

        }
        
        await page.waitForSelector("#FrmSelecao")

        await browser.close()

        return {
            status: true,
            certidao: "https://url.com"
        };

    } catch (error) {
        console.error(error)
        return {
            status: false,
            mensagem: "Erro ao obter certidão CPF"
          };
    }
}

const getCNPJCertificate = async (cnpj) =>{
    const invalidAcces = {
        status: false,
        mensagem: "Não foi possível realizar a consulta. Tente mais tarde"
    }

    return invalidAcces

}

export { getCPFCertificate, getCNPJCertificate }
