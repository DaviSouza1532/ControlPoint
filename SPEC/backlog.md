# Backlog de Desenvolvimento - Sistema de Controle de Ponto

## Visão Geral
Este arquivo registra todas as tarefas, funcionalidades implementadas, ajustadas ou alteradas ao longo do ciclo de vida do projeto pelo agente de IA autônomo (Google Jules).

---

## Estrutura do Backlog

### 📋 [Pendente]
- [ ] Configuração do projeto base HTML/CSS/JS (sem dependências npm, usando CDN).
- [ ] Implementação da interface limpa para Desktop/Tablet com Lucide Icons.
- [ ] Integração com o SDK do Supabase JS via CDN (`schema.sql`).
- [ ] Módulo de leitura biométrica (WebAuthn API) e captura de cartão (HID).
- [ ] Registro dos 4 batimentos diários e validação com grade de turno.
- [ ] Modal de justificativa obrigatória para atrasos e saídas antecipadas.
- [ ] Modulo de contingência com aprovação do supervisor e notificação ao RH.
- [ ] Geração do ticket de comprovante (Impressão CSS `@media print` e e-mail via Supabase Edge Function).
- [ ] Configuração do PWA com Service Worker para pré-cache offline.
- [ ] Implementação de armazenamento offline no IndexedDB com UUID.
- [ ] Rotina de sincronização offline com validação de integridade e duplicidade ao reconectar.
- [ ] Banner de notificação visual para queda de conexão e erro de impressora.

### ⏳ [Em Progresso]
- *Nenhuma tarefa em andamento no momento.*

### ✅ [Concluído]
- [x] Elaboração do documento principal de especificação (`SPEC.md`).
- [x] Criação do esquema de banco de dados PostgreSQL/Supabase (`schema.sql`).
- [x] Inicialização da estrutura de backlog (`backlog.md`).
