# regularidade_fiscal_pgfn

NodeJS, Expressjs, Puppeter

Receber um array de cnpj e/ou cpf
Entrar no site PGFN e obter certidão
Obter retorno de sucesso e/ou falha para cada entrada do array


Tratamento de dados de entrada: arr, str, number

> middleware -> Validação validade CNPJ/CPF
Separar array somente com numeros válidos para scraping -> enviar para scraping
retorna dados do scraping + dados inválidos do middleware

Somente dados válidos:
Scraping
> Identificar CNPJ ou CPF para URL de acesso
> Lidar com retorno inválido
ou
> Obter URL da certidão

retornar
> tipo de dado
> status sucesso/falha
> URL certidão
> Motivo da falha


