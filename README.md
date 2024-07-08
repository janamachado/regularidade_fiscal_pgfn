# Sistema de Geração de Certidões de Regularidade Fiscal

## Objetivo
Este sistema, desenvolvido com NodeJS, ExpressJS e Puppeteer, gera certidões de regularidade fiscal na PGFN. Ele é capaz de validar os números de entrada para CPF e CNPJ, realizar a consulta e baixar as certidões do site [Regularize PGFN](https://www.regularize.pgfn.gov.br/), retornando a URL local para acesso ao arquivo baixado.

# Endpoint: /certification

## Método: POST

### Descrição
Este endpoint recebe um número ou uma lista de números (CPF ou CNPJ) e retorna a certidão correspondente, se disponível.

### Corpo da Requisição
O corpo da requisição deve conter uma chave `data`, que pode ser um array de strings ou números, ou apenas uma string ou número.

#### Exemplos de Corpo da Requisição:

**Array com um único número:**
```json
{
  "data": ["67093683000120"]
}
```

Array com múltiplos números:

```json

{
  "data": ["12345678912345", "12356", 12345678900]
}
```

Uma única string:

```json

{
  "data": "12345678900"
}
```

Um único número:

```json

{
  "data": 12345678900
}
```

### Resposta de Sucesso

A resposta será um objeto onde cada chave é o número consultado e o valor é um objeto com o status da consulta, a URL da certidão (se houver) e o motivo do erro (se houver).
Exemplo de Resposta:

```json

{
  "1515": {
    "status": "Falha",
    "certidao": null,
    "motivoErro": "Número não é CNPJ ou CPF"
  },
  "12345": {
    "status": "Falha",
    "certidao": null,
    "motivoErro": "Número não é CNPJ ou CPF"
  },
  "12345678900": {
    "status": "Sucesso",
    "certidao": "http://localhost:3001/downloads/Certidao-12345678900.pdf",
    "motivoErro": null
  },
  "98765432100": {
    "status": "Sucesso",
    "certidao": "http://localhost:3001/downloads/Certidao-98765432100.pdf",
    "motivoErro": null
  },
  "12378945600": {
    "status": "Sucesso",
    "certidao": "http://localhost:3001/downloads/Certidao-12378945600.pdf",
    "motivoErro": null
  }
}
```

### Mensagens de Erro

    "Número não é CNPJ ou CPF" - Número recebido não é um documento válido
    "CNPJ inválido" - Documento inválido
    "CPF inválido" - Documento inválido
    "Não foi possível obter a certidão." - Dificuldade para encontrar a certidão para esse documento.
    "Não foi possível realizar a consulta. Tente mais tarde." - Dificuldade para encontrar a certidão para esse documento.
    "O número informado não consta do cadastro CNPJ." - Documento não cadastrado no PGFN
    "O número informado não consta do cadastro CPF." - Documento não cadastrado no PGFN

### Configuração e Execução
#### Pré-requisitos

    Node.js instalado
    Puppeteer instalado

#### Instalação
Clone o repositório:
```
     git clone https://github.com/janamachado/regularidade_fiscal_pgfn.git
```


#### Navegue até o diretório do projeto:
```
    cd regularidade_fiscal_pgfn
```

#### Instale as dependências:
```
    npm install
```

### Execução

Para iniciar o servidor, execute:
```
  node app.js
```

O servidor estará disponível em:
```
  http://localhost:3001
```
