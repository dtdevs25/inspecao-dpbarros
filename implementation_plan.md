# Plano de Implementação: Checklist Diário (Obra 601) - Por Etapas

Vamos dividir o desenvolvimento em etapas para garantir que cada parte do relatório fique perfeita e com os dados corretos.

> [!IMPORTANT]
> **Aprovação Necessária**
> Revise a proposta para a Etapa 1 (Capa do Relatório) e veja se faz sentido a forma como vamos coletar as informações.

## Etapa 1: A Capa do Relatório

O objetivo inicial é replicar com exatidão a primeira página (Capa) do seu anexo.

### De onde vamos coletar os dados para a Capa?

Você perguntou onde podemos coletar essas informações (se na hora de gerar ou em cadastros). A melhor prática é uma mistura dos dois:

1. **Dados Fixos da Obra (Nome e Endereço):**
   - **Onde coletar:** No cadastro do sistema.
   - **Como:** O InspecPRO já possui o cadastro de **"Filiais" (Units)**. Vamos cadastrar a "Obra 601" como uma Filial no sistema. O banco de dados já possui os campos `name` (Obra 601) e `address` (Endereço). Na hora de gerar o PDF, o sistema puxa do banco automaticamente.

2. **Nomes dos Responsáveis (Geraldo, Anderson, José):**
   - **Onde coletar:** No cadastro ou no código.
   - **Como:** Se esses nomes forem fixos para esta obra, podemos vinculá-los à Filial. O Técnico de Segurança (ex: José Bispo) pode ser simplesmente o nome do usuário que está logado no sistema e preenchendo o checklist no dia.

3. **Data de Emissão e Revisão:**
   - **Onde coletar:** Gerados automaticamente.
   - **Como:** A data de emissão será a data em que o técnico está preenchendo o formulário. A revisão pode ser um número sequencial automático ou fixo (ex: 02).

4. **Foto da Entrada da Obra:**
   - **Onde coletar:** No momento do preenchimento diário.
   - **Como:** Na tela nova do aplicativo onde o técnico vai preencher o "Checklist Diário", colocaremos um campo no início: **"Foto de Entrada da Obra do Dia"**. O técnico tira a foto na hora (ou sobe da galeria), e o sistema usa essa foto específica para gerar a capa do relatório daquele dia.

5. **Logos (SESMT) e Textos de Cabeçalho:**
   - **Onde coletar:** Arquivos estáticos do servidor.
   - **Como:** Vamos pegar a imagem `DPBARROS/logos/sesmt.png` que você enviou e deixá-la salva no backend.

### Como vamos gerar a Capa tecnicamente?

Usaremos a biblioteca `pdf-lib` (que já é usada no InspecPRO).
Podemos desenhar as linhas da tabela, escrever os textos (ex: "VISITA TÉCNICA") e colar a imagem da logo e a foto da obra através de coordenadas (X, Y) programaticamente. Isso garante que fique idêntico ao seu modelo, mantendo a paginação dinâmica ("Página 1 de XX").

---

## Próximas Etapas (Visão Geral)

* **Etapa 2:** Criação da tabela no banco de dados (`DailyChecklist`) para salvar o checklist diário e a nova tela no aplicativo para o técnico bater a foto e marcar os itens (C, NC, NA).
* **Etapa 3:** Geração das páginas subsequentes do PDF (desenhando as tabelas com os itens 18.0, 19.0, etc., e preenchendo com "X" de acordo com o que o técnico marcou).
* **Etapa 4:** Rotina automática (Cron Job) para enviar o PDF por e-mail no final do dia.

### B. Backend (Node.js/Express)
#### [MODIFY] `server/routes.ts`
- Criar rotas CRUD para a nova tabela (ex: `POST /data/daily_checklists` e `GET /data/daily_checklists`).
#### [NEW] `server/reports/DailyChecklistService.ts`
- Um novo serviço gerador de PDF. Ele vai pegar um PDF "em branco" do relatório 601 como template e vai injetar os textos (data, responsável) e os "X" (marcações C, NC, NA) nas coordenadas mapeadas com base no `answers (Json)`.
#### [MODIFY] `server/cron.ts`
- Adicionar uma regra ao agendador. Ao final do dia (horário configurado na empresa/unidade), ele busca o checklist preenchido no dia, gera o PDF usando o `DailyChecklistService` e envia por e-mail para a lista de distribuição.

### C. Frontend (React/Vite)
#### [NEW] `src/components/DailyChecklist.tsx`
- Uma nova tela acessível via menu lateral, contendo as perguntas do checklist agrupadas por seção (ex: 18.0 Frente de Serviço, 19.0 Alojamento).
- Terá opções C, NC, NA para cada item e um campo para observações finais.
#### [MODIFY] `src/App.tsx` e `src/components/Layout.tsx`
- Adicionar a nova rota e o item de menu "Checklists Diários" para que o usuário possa acessar a funcionalidade.

## 3. Plano de Verificação

1. **Teste do Formulário:** Preencher o novo formulário de checklist no frontend e verificar se os dados (respostas em JSON) são salvos corretamente no banco de dados.
2. **Teste de Geração de PDF:** Criar uma rota de teste provisória para acionar a geração do PDF do checklist e validar visualmente se os "X" estão caindo nas posições corretas do template (Conforme, Não Conforme, Não se Aplica).
3. **Teste do Cron Job:** Simular o horário de disparo (ex: alterando a hora de teste) e verificar se o e-mail chega na caixa de entrada com o PDF preenchido anexo.
