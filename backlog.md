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
- [X] **2.2. Integração com Biometria WebAuthn (`navigator.credentials`)**
  - Implementar captura de biometria via API WebAuthn.
  - Validar a identificação do colaborador a partir do hash cadastrado.
- [X] **2.3. Registro dos Batimentos no Banco de Dados**
  - Persistir dados do batimento na tabela `registro_ponto`.
  - Vincular colaborador, tipo de batimento, timestamp e método de autenticação (`BIOMETRIA`).

---

## 🛡️ Fase 3: Contingência, Leitor RFID e Validação por Supervisor
- [ ] **3.1. Leitura Transparentemente via RFID/Cartão Magnético (HID)**
  - Escutar eventos globais de teclado para captura de códigos de leitores de cartão RFID.
  - Identificar o colaborador pelo `codigo_cartao`.
- [ ] **3.2. Fluxo de Senha e Validação do Supervisor**
  - Exigir senha e aprovação de um colaborador com perfil `e_supervisor = true` após uso do cartão ou falha biométrica (> 3 tentativas).
  - Registrar no batimento o método `CARTAO_SUPERVISOR` e o ID do supervisor aprovador.
- [ ] **3.3. Alerta de Uso de Contingência**
  - Registrar alerta no sistema/painel do RH sobre marcações efetuadas via contingência.

---

## 📶 Fase 4: Offline-First, IndexedDB e PWA
- [ ] **4.1. Configuração do Service Worker e Cache Estático**
  - Criar `sw.js` e registrar o Service Worker para cache offline de HTML, CSS, JS e Ícones.
  - Garantir carregamento da aplicação sem conectividade de rede.
- [ ] **4.2. Persistência Local via IndexedDB**
  - Estruturar banco local no IndexedDB para armazenamento dos batimentos realizados offline.
  - Gerar IDs UUIDv4 para batimentos offline evitando conflitos de sincronização.
- [ ] **4.3. Detecção e Notificações da Rede (`navigator.onLine`)**
  - Exibir banner/notificação visual de perda de conexão ao ficar offline.
  - Disparar evento de reconexão (`online`) para acionar sincronização.
- [ ] **4.4. Sincronização e Validação Temporal/Duplicidade**
  - Criar rotina de sincronização do lote acumulado no IndexedDB com o Supabase.
  - Executar verificação anti-duplicidade e coerência de timestamps antes da persistência no servidor.

---

## 🧾 Fase 5: Comprovante de Ponto (Ticket) e Envio Digital
- [ ] **5.1. Geração do Ticket de Comprovante**
  - Gerar Hash de Autenticação único para cada batimento.
  - Montar layout do comprovante com dados da Empresa, Colaborador, Turno, Horário e Hash.
  - Salvar histórico na tabela `ticket_comprovante`.
- [ ] **5.2. Impressão Térmica (`window.print()`)**
  - Adicionar folha de estilo CSS `@media print` para formatação em cupons térmicos.
  - Exibir notificação visual em caso de falha de hardware/impressora com opção de tentar novamente.
- [ ] **5.3. Envio por E-mail do Ticket Digital**
  - Integrar opção de envio automático do ticket por e-mail (via Edge Function ou serviço REST).

---

## ⚠️ Fase 6: Gestão de Anomalias, Tolerâncias e Justificativas
- [ ] **6.1. Cálculo de Atrasos e Saídas Antecipadas**
  - Comparar horário do batimento com o turno configurado na tabela `turno`, considerando a tolerância cadastrada (`tolerancia_minutos`).
- [ ] **6.2. Captura de Justificativa Textual**
  - Exibir modal solicitando justificativa quando for detectado atraso ou saída antecipada fora da tolerância.
  - Gravar ocorrência na tabela `justificativa_ocorrencia`.
- [ ] **6.3. Marcação e Anexo de Atestados (Faltas)**
  - Permitir upload de atestados (PDF/Imagem) salvos no Supabase Storage para abono de faltas/atrasos.
  - Agendar/registrar falta automática quando o expediente encerrar sem batimento e sem justificativa.

---

## 📊 Fase 7: Painel do RH / Auditoria
- [ ] **7.1. Visualização de Ocorrências e Relatórios de Ponto**
  - Listar batimentos, divergências, ocorrências e alertas de contingência.
- [ ] **7.2. Aprovação de Justificativas e Atestados**
  - Permitir ao supervisor/RH aprovar justificativas e anexos de atestados.
