# Backlog do Projeto - Sistema de Controle de Ponto

Este documento detalha as etapas, requisitos e sub-tarefas para o desenvolvimento do **Sistema de Controle de Ponto** (PWA Offline-First), organizado em ordem lógica de implementação.

---

## 📌 Legenda de Status
- [ ] **Pendente**: Tarefa ainda não iniciada.
- [/] **Em Progresso**: Tarefa em desenvolvimento.
- [X] **Concluído**: Tarefa desenvolvida e testada com sucesso.

---

## 🚀 Fase 1: Setup Inicial e Conectividade Base
- [X] **1.1. Detalhamento do Backlog (`backlog.md`)**
  - Mapear e dividir os requisitos em sub-tarefas pequenas e testáveis.
- [X] **1.2. Configuração do Cliente Supabase (`js/supabaseClient.js`)**
  - Importar o SDK `@supabase/supabase-js@2` via CDN.
  - Configurar URL da API (`https://ddjhrpiojzfzfzohciof.supabase.co`) e Publishable Key.
- [X] **1.3. Interface Base HTML/CSS (Desktop / Tablet Landscape)**
  - Criar `index.html`, `css/styles.css` e `js/app.js`.
  - Definir layout responsivo direcionado para resoluções >= 1024x768 (Tablets em modo Paisagem e Desktops).
  - Incluir CDN da biblioteca **Lucide Icons** (proibido o uso de emojis na UI).
- [X] **1.4. Teste de Conexão com o Supabase**
  - Implementar verificação automática de conexão com o banco Supabase na inicialização.
  - Exibir indicador visual do status de conexão na interface (Online/Offline/Conectado ao Banco).

---

## 🔐 Fase 2: Autenticação de Colaborador e Registro de Batimento
- [X] **2.1. Interface do Relógio de Ponto**
  - Exibir relógio em tempo real com data, hora e fuso horário.
  - Apresentar opções para os 4 tipos de batimentos diários:
    1. Entrada no Expediente
    2. Saída para Intervalo/Almoço
    3. Retorno do Intervalo/Almoço
    4. Saída do Expediente
- [X] **2.2. Integração com Biometria WebAuthn (`navigator.credentials`) e Sensor Biométrico**
  - Implementar captura e cadastro de biometria via WebAuthn e simulação de leitor biométrico.
  - Validar a identificação do colaborador.
- [/] **2.3. Autenticação por PIS/CPF + Senha (Desktop / Estações de Trabalho)**
  - Implementar aba/fluxo de login por PIS + Senha na interface de registro.
  - Validar credenciais na tabela `colaborador`.
- [X] **2.4. Registro dos Batimentos no Banco de Dados**
  - Persistir dados do batimento na tabela `registro_ponto`.
  - Vincular colaborador, tipo de batimento, timestamp e método de autenticação.

---

## 🧾 Fase 3: Ticket Virtual (Comprovante) e Impressão Térmica
- [/] **3.1. Modal do Ticket Virtual de Ponto**
  - Exibir comprovante em modal logo após o batimento.
  - Incluir dados da Empresa (Razão Social, CNPJ, Endereço), Colaborador (Nome, PIS, Cargo, Função), Turno, Horário do Batimento, Batimentos do dia e Hash de integridade.
- [/] **3.2. Ações do Comprovante (Imprimir, Enviar por E-mail, Salvar)**
  - Implementar impressão física via `window.print()` estilizado com CSS `@media print` para cupom de 80mm.
  - Opção de envio digital por e-mail e download/salvamento do comprovante.
  - Gravar dados na tabela `ticket_comprovante`.

---

## ⚠️ Fase 4: Anomalias, Tolerâncias de Turno e Justificativas
- [/] **4.1. Cálculo de Tolerância de Turno**
  - Comparar horário do batimento com o turno cadastrado (`horario_entrada`, `horario_saida`, etc.) considerando `tolerancia_minutos`.
- [/] **4.2. Captura Obrigatoria de Justificativa**
  - Exibir modal exigindo justificativa textual ao detectar atraso ou saída antecipada fora da tolerância.
  - Salvar ocorrência na tabela `justificativa_ocorrencia`.

---

## 📶 Fase 5: Offline-First, IndexedDB e Service Worker PWA
- [/] **5.1. Armazenamento Local via IndexedDB (`js/offlineStore.js`)**
  - Guardar batimentos offline localmente no IndexedDB utilizando UUIDv4.
- [/] **5.2. Service Worker e Cache Estático (`sw.js`)**
  - Pré-cachear arquivos estáticos (`index.html`, `styles.css`, `js/*.js`) para funcionamento offline total.
- [/] **5.3. Sincronização Automática ao Reconectar**
  - Monitorar evento `online` para sincronizar lote offline com o Supabase com validação anti-duplicidade.

---

## 🛡️ Fase 6: Contingência e Leitor RFID
- [ ] **6.1. Captura de Cartão RFID/Magnético (HID)**
  - Eventos de teclado para captura transparente de cartão magnético.
- [ ] **6.2. Aprovação por Supervisor**
  - Exigir validação por supervisor após falhas consecutivas ou uso de contingência.

---

## 📊 Fase 7: Painel do RH e Auditoria
- [ ] **7.1. Visualização de Ocorrências e Relatórios de Ponto**
  - Painel com relatório de registros, atrasos e justificativas.
