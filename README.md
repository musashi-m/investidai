# 📈 InvestManager — Gerenciador de Investimentos (Mobile & Web)

Sistema completo para controle de carteira de investimentos (Renda Fixa e Variável) com cotações da B3 em tempo real via **[Brapi](https://brapi.dev)**, cálculo de rentabilidade em dias úteis, simulador mobile e persistência segura em **LocalStorage**.

---

## 🚀 Como Publicar na Netlify (Grátis em 1 minuto)

### Opção 1: Arrastar e Soltar (Sem Git, Instantâneo)
1. Acesse **[app.netlify.com/drop](https://app.netlify.com/drop)**.
2. Arraste a pasta **`frontend/dist`** deste projeto para a página.
3. Pronto! Seu link público estará no ar imediatamente.

### Opção 2: Conectar ao Repositório GitHub
1. Suba esta pasta para um repositório no GitHub.
2. Na Netlify, clique em **"Add new site" > "Import an existing project" > "GitHub"**.
3. O arquivo [`netlify.toml`](file:///c:/Users/Setor%20Fiscal/Downloads/Gerenciador%20de%20Inv/netlify.toml) já configurou tudo automaticamente:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Clique em **Deploy Site**.

---

## 💻 Executar Localmente no Computador

Basta dar um duplo-clique no arquivo:
```cmd
iniciar.bat
```
Ou rodar no terminal dentro da pasta `frontend`:
```bash
npm run dev
```

---

## 📱 Armazenamento Local & Privacidade (LocalStorage)
- Seus dados de investimentos nunca saem do seu aparelho: ficam gravados no **LocalStorage** do seu navegador/celular.
- **Exportar e Restaurar Backup:**
  - Vá em **Configurações** (ícone de engrenagem) e clique em **Exportar Backup** para salvar seu arquivo JSON.
  - Para sincronizar com outro computador ou celular, basta clicar em **Restaurar Backup** e selecionar o arquivo.

---

## ⚡ Principais Funcionalidades

1. **Renda Fixa com Rendimento Automático em Dias Úteis (ANBIMA / B3):**
   - Convenção de 252 dias úteis por ano.
   - Rendimento composto diário para **% do CDI**, **Tesouro Selic**, **Prefixado** e **IPCA+**.
   - Tabela regressiva de IR (22,5% a 15,0%) com saldo bruto e saldo líquido, e isenção para LCI/LCA/CRI/CRA.
   - Cálculo do ganho diário estimado (R$/dia útil).

2. **Renda Variável (B3, FIIs, BDRs, ETFs e Criptos):**
   - Cotações em tempo real via Brapi com logos oficiais e variação do dia.
   - Preço Médio (PM) ponderado automático.
   - Controle de dividendos, JCP e rendimentos de FIIs.

3. **Calculadora & Simulador Mobile-First:**
   - Teclado numérico e botões rápidos de toque para valores, aportes mensais e prazos.
   - Comparativo com a Caderneta de Poupança.
   - Curva gráfica de evolução e botão para transformar a simulação em um ativo real na carteira com 1 toque.
