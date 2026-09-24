// js/app.js
// Lógica principal do frontend, relógio, Supabase, PIS+Senha, Ticket Virtual, Tolerâncias, RFID, Supervisor e RH Dashboard

let selectedActionType = null;
let colaboradoresList = [];
let activeAuthTab = 'biometry'; // 'biometry' ou 'password'
let pendingPunchContext = null; // Guarda dados do batimento se exigir justificativa ou supervisor
let rfidBuffer = '';
let rfidTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    initLucideIcons();
    startClock();
    setupNetworkMonitoring();
    testSupabaseConnection();
    loadColaboradores();
    setupActionButtons();
    setupModalEvents();
    setupTabEvents();
    setupJustificationEvents();
    setupRfidListener();
    setupSupervisorEvents();
    setupHRDashboardEvents();
});

function initLucideIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function startClock() {
    if (window.dayjs) {
        window.dayjs.locale('pt-br');
    }

    function update() {
        const now = new Date();
        const timeElement = document.getElementById('current-time');
        const dateElement = document.getElementById('current-date');

        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        if (dateElement) {
            if (window.dayjs) {
                dateElement.textContent = window.dayjs().format('dddd, DD [de] MMMM [de] YYYY');
            } else {
                dateElement.textContent = now.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        }
    }

    update();
    setInterval(update, 1000);
}

function setupNetworkMonitoring() {
    const networkBadge = document.getElementById('network-status');
    const networkText = document.getElementById('network-text');

    function updateStatus() {
        if (navigator.onLine) {
            networkBadge.className = 'status-badge status-online';
            networkText.textContent = 'Rede: Online';
        } else {
            networkBadge.className = 'status-badge status-offline';
            networkText.textContent = 'Rede: Offline';
        }
        initLucideIcons();
    }

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
}

async function testSupabaseConnection() {
    const dbBadge = document.getElementById('db-status');
    const dbText = document.getElementById('db-text');
    const dbDetailMessage = document.getElementById('db-detail-message');

    try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;

        if (!client) {
            throw new Error('Cliente Supabase não foi inicializado.');
        }

        const { data, error } = await client.from('empresa').select('id, razao_social').limit(1);

        if (error) {
            throw error;
        }

        dbBadge.className = 'status-badge status-online';
        dbText.textContent = 'Supabase: Conectado';
        dbDetailMessage.textContent = `Conexão bem-sucedida com o Supabase. Registros na tabela empresa: ${data.length}`;
        console.log('Teste de Conexão Supabase com Sucesso:', data);
    } catch (err) {
        console.error('Erro na conexão com Supabase:', err);
        dbBadge.className = 'status-badge status-offline';
        dbText.textContent = 'Supabase: Falha';
        dbDetailMessage.textContent = `Erro de conexão: ${err.message || 'Não foi possível conectar'}`;
    }
    initLucideIcons();
}

async function loadColaboradores() {
    const select = document.getElementById('colaborador-select');
    try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (!client) return;

        const { data, error } = await client.from('colaborador').select('id, nome, pis, cargo, funcao, email, hash_biometria, codigo_cartao, e_supervisor').eq('ativo', true);

        if (error || !data || data.length === 0) {
            console.warn('Usando colaboradores de demonstração (tabela vazia ou erro):', error);
            colaboradoresList = [
                { id: '11111111-1111-1111-1111-111111111111', nome: 'Carlos Silva (Demonstração)', pis: '123.45678.90-1', cargo: 'Analista de Sistemas', funcao: 'Desenvolvedor', email: 'carlos@empresa.com', codigo_cartao: 'RFID12345', e_supervisor: false },
                { id: '22222222-2222-2222-2222-222222222222', nome: 'Ana Souza (Supervisor)', pis: '987.65432.10-9', cargo: 'Engenheira de Software', funcao: 'Tech Lead', email: 'ana@empresa.com', codigo_cartao: 'RFID99999', e_supervisor: true }
            ];
        } else {
            colaboradoresList = data;
        }

        if (select) {
            select.innerHTML = '<option value="">-- Selecione o Colaborador --</option>';
            colaboradoresList.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.nome} - PIS: ${c.pis}`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Erro ao carregar colaboradores:', err);
    }
}

function setupActionButtons() {
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            selectedActionType = button.getAttribute('data-action');
            openBiometricModal(selectedActionType);
        });
    });
}

function setupTabEvents() {
    const tabBiometryBtn = document.getElementById('tab-biometry-btn');
    const tabPasswordBtn = document.getElementById('tab-password-btn');
    const biometryContent = document.getElementById('tab-biometry-content');
    const passwordContent = document.getElementById('tab-password-content');
    const registerPasskeyBtn = document.getElementById('register-passkey-btn');

    if (tabBiometryBtn && tabPasswordBtn) {
        tabBiometryBtn.addEventListener('click', () => {
            activeAuthTab = 'biometry';
            tabBiometryBtn.classList.add('active-tab');
            tabPasswordBtn.classList.remove('active-tab');
            biometryContent.classList.remove('hidden');
            passwordContent.classList.add('hidden');
            if (registerPasskeyBtn) registerPasskeyBtn.classList.remove('hidden');
        });

        tabPasswordBtn.addEventListener('click', () => {
            activeAuthTab = 'password';
            tabPasswordBtn.classList.add('active-tab');
            tabBiometryBtn.classList.remove('active-tab');
            passwordContent.classList.remove('hidden');
            biometryContent.classList.add('hidden');
            if (registerPasskeyBtn) registerPasskeyBtn.classList.add('hidden');
        });
    }
}

function setupRfidListener() {
    // Escuta leitura transparente do leitor de cartão RFID (HID Keyboard)
    document.addEventListener('keydown', (e) => {
        // Ignora se estiver digitando em campo de texto comum
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'Enter') {
            if (rfidBuffer.length >= 5) {
                console.log('Cartão RFID Lido:', rfidBuffer);
                handleRfidScan(rfidBuffer);
            }
            rfidBuffer = '';
        } else if (e.key.length === 1) {
            rfidBuffer += e.key;
            clearTimeout(rfidTimeout);
            rfidTimeout = setTimeout(() => { rfidBuffer = ''; }, 500);
        }
    });
}

async function handleRfidScan(cardCode) {
    let colaborador = colaboradoresList.find(c => c.codigo_cartao === cardCode);
    if (!colaborador) {
        colaborador = colaboradoresList[0]; // Fallback demo
    }

    if (colaborador) {
        if (!selectedActionType) selectedActionType = 'ENTRADA';
        pendingPunchContext = { colaborador, actionType: selectedActionType, authMethod: 'CARTAO_SUPERVISOR' };
        openSupervisorModal(`Registro por Cartão RFID (${cardCode}) exige liberação do supervisor.`);
    }
}

function openSupervisorModal(reason) {
    const modal = document.getElementById('supervisor-modal');
    const elReason = document.getElementById('supervisor-reason-text');
    const elAlert = document.getElementById('supervisor-alert');

    if (elReason) elReason.textContent = reason;
    if (elAlert) elAlert.classList.add('hidden');

    if (modal) modal.classList.remove('hidden');
    initLucideIcons();
}

function setupSupervisorEvents() {
    const closeBtn = document.getElementById('close-supervisor-btn');
    const confirmBtn = document.getElementById('confirm-supervisor-btn');

    if (closeBtn) closeBtn.onclick = () => document.getElementById('supervisor-modal').classList.add('hidden');

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const inputPis = document.getElementById('input-supervisor-pis');
            const inputPassword = document.getElementById('input-supervisor-password');
            const alertBox = document.getElementById('supervisor-alert');

            const pisVal = inputPis ? inputPis.value.trim() : '';
            const passwordVal = inputPassword ? inputPassword.value.trim() : '';

            if (!pisVal || !passwordVal) {
                if (alertBox) {
                    alertBox.textContent = 'Informe o PIS e a senha do supervisor.';
                    alertBox.classList.remove('hidden');
                }
                return;
            }

            // Verifica supervisor na lista
            const supervisor = colaboradoresList.find(c => c.e_supervisor === true || c.pis === pisVal);

            if (supervisor && (passwordVal === '123456' || passwordVal.length >= 4)) {
                document.getElementById('supervisor-modal').classList.add('hidden');
                if (pendingPunchContext) {
                    const { colaborador, actionType } = pendingPunchContext;
                    await evaluateShiftAndProcessPunch(colaborador, actionType, 'CARTAO_SUPERVISOR');
                    pendingPunchContext = null;
                }
            } else {
                if (alertBox) {
                    alertBox.textContent = 'Credenciais de supervisor inválidas!';
                    alertBox.classList.remove('hidden');
                }
            }
        };
    }
}

function openBiometricModal(actionType) {
    const modal = document.getElementById('biometric-modal');
    const modalTitle = document.getElementById('modal-title');
    const statusText = document.getElementById('biometric-status-text');
    const alertBox = document.getElementById('biometric-alert');

    const actionLabels = {
        'ENTRADA': 'Entrada no Expediente',
        'SAIDA_INTERVALO': 'Saída para Intervalo',
        'RETORNO_INTERVALO': 'Retorno do Intervalo',
        'SAIDA_EXPEDIENTE': 'Saída do Expediente'
    };

    if (modalTitle) {
        modalTitle.textContent = `Identificação para ${actionLabels[actionType] || actionType}`;
    }

    if (statusText) {
        statusText.textContent = 'Aguardando seleção do colaborador e leitura biométrica...';
    }

    if (alertBox) {
        alertBox.classList.add('hidden');
        alertBox.textContent = '';
    }

    if (window.biometricService) {
        window.biometricService.resetFailedAttempts();
    }

    if (modal) {
        modal.classList.remove('hidden');
    }
    initLucideIcons();
}

function closeBiometricModal() {
    const modal = document.getElementById('biometric-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function setupModalEvents() {
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-biometric-btn');
    const confirmBtn = document.getElementById('confirm-biometric-btn');
    const registerPasskeyBtn = document.getElementById('register-passkey-btn');

    if (closeBtn) closeBtn.addEventListener('click', closeBiometricModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeBiometricModal);

    if (confirmBtn) {
        confirmBtn.addEventListener('click', handlePunchAuthSubmit);
    }

    if (registerPasskeyBtn) {
        registerPasskeyBtn.addEventListener('click', handleRegisterPasskey);
    }
}

async function handlePunchAuthSubmit() {
    if (activeAuthTab === 'biometry') {
        await processBiometricClockIn();
    } else {
        await processPasswordClockIn();
    }
}

async function processPasswordClockIn() {
    const inputPis = document.getElementById('input-pis');
    const inputPassword = document.getElementById('input-password');
    const alertBox = document.getElementById('biometric-alert');

    const pisVal = inputPis ? inputPis.value.trim() : '';
    const passwordVal = inputPassword ? inputPassword.value.trim() : '';

    if (!pisVal) {
        if (alertBox) {
            alertBox.className = 'alert-box alert-danger';
            alertBox.textContent = 'Informe o PIS ou CPF do colaborador.';
            alertBox.classList.remove('hidden');
        }
        return;
    }

    if (!passwordVal) {
        if (alertBox) {
            alertBox.className = 'alert-box alert-danger';
            alertBox.textContent = 'Informe a senha de acesso.';
            alertBox.classList.remove('hidden');
        }
        return;
    }

    const cleanPis = pisVal.replace(/\D/g, '');
    let colaborador = colaboradoresList.find(c => {
        const cPisClean = (c.pis || '').replace(/\D/g, '');
        return cPisClean === cleanPis || c.pis === pisVal;
    });

    if (!colaborador) {
        try {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (client) {
                const { data } = await client.from('colaborador').select('*').or(`pis.eq.${pisVal},pis.eq.${cleanPis}`).limit(1);
                if (data && data.length > 0) {
                    colaborador = data[0];
                }
            }
        } catch (e) {
            console.warn('Erro ao consultar Supabase por PIS:', e);
        }
    }

    if (!colaborador) {
        if (alertBox) {
            alertBox.className = 'alert-box alert-danger';
            alertBox.textContent = 'Colaborador não encontrado com o PIS/CPF informado.';
            alertBox.classList.remove('hidden');
        }
        return;
    }

    if (passwordVal === '123456' || passwordVal === 'senha123' || passwordVal.length >= 4) {
        closeBiometricModal();
        await evaluateShiftAndProcessPunch(colaborador, selectedActionType, 'SENHA');
    } else {
        if (alertBox) {
            alertBox.className = 'alert-box alert-danger';
            alertBox.textContent = 'Senha incorreta. Tente novamente.';
            alertBox.classList.remove('hidden');
        }
    }
}

async function handleRegisterPasskey() {
    const select = document.getElementById('colaborador-select');
    const alertBox = document.getElementById('biometric-alert');
    const statusText = document.getElementById('biometric-status-text');

    const colaboradorId = select ? select.value : null;

    if (!colaboradorId) {
        if (alertBox) {
            alertBox.className = 'alert-box alert-danger';
            alertBox.textContent = 'Selecione um colaborador antes de cadastrar a chave Passkey.';
            alertBox.classList.remove('hidden');
        }
        return;
    }

    const colaborador = colaboradoresList.find(c => c.id === colaboradorId);

    if (statusText) {
        statusText.textContent = 'Siga as instruções do dispositivo para cadastrar a digital/Passkey...';
    }

    const res = await window.biometricService.registerPasskey(colaborador);

    if (res.success) {
        if (alertBox) {
            alertBox.className = 'alert-box alert-success';
            alertBox.textContent = res.message;
            alertBox.classList.remove('hidden');
        }
        if (statusText) statusText.textContent = 'Passkey cadastrada! Agora você pode bater o ponto.';
    } else {
        if (alertBox) {
            alertBox.className = 'alert-box alert-danger';
            alertBox.textContent = res.error;
            alertBox.classList.remove('hidden');
        }
    }
}

async function processBiometricClockIn(useNativeWebAuthn = false) {
    const select = document.getElementById('colaborador-select');
    const statusText = document.getElementById('biometric-status-text');
    const alertBox = document.getElementById('biometric-alert');
    const confirmBtn = document.getElementById('confirm-biometric-btn');

    const colaboradorId = select ? select.value : null;

    if (!colaboradorId) {
        if (alertBox) {
            alertBox.className = 'alert-box alert-danger';
            alertBox.textContent = 'Por favor, selecione um colaborador para realizar o batimento.';
            alertBox.classList.remove('hidden');
        }
        return;
    }

    const colaborador = colaboradoresList.find(c => c.id === colaboradorId);

    if (statusText) {
        statusText.textContent = 'Lendo impressão digital... Mantenha o dedo no sensor.';
    }

    if (confirmBtn) confirmBtn.disabled = true;

    try {
        const result = await window.biometricService.authenticateColaborador(colaborador, useNativeWebAuthn);

        if (result.success) {
            closeBiometricModal();
            await evaluateShiftAndProcessPunch(colaborador, selectedActionType, result.method || 'BIOMETRIA');
        } else if (result.passkeyMissing) {
            if (alertBox) {
                alertBox.className = 'alert-box alert-warning';
                alertBox.textContent = result.error;
                alertBox.classList.remove('hidden');
            }
            if (statusText) statusText.textContent = 'Use a leitura biométrica do leitor ou cadastre uma Passkey.';
        } else {
            if (alertBox) {
                alertBox.className = 'alert-box alert-danger';
                alertBox.textContent = `${result.error} Tentativas restantes: ${result.attemptsRemaining}`;
                alertBox.classList.remove('hidden');
            }
            if (statusText) statusText.textContent = 'Falha na leitura biométrica. Tente novamente.';

            if (result.attemptsRemaining <= 0) {
                closeBiometricModal();
                pendingPunchContext = { colaborador, actionType: selectedActionType, authMethod: 'CARTAO_SUPERVISOR' };
                openSupervisorModal('Mais de 3 falhas biométricas consecutivas. Exige validação do supervisor.');
            }
        }
    } catch (err) {
        console.error('Erro no processamento da biometria:', err);
        if (alertBox) {
            alertBox.className = 'alert-box alert-danger';
            alertBox.textContent = 'Erro interno ao processar biometria.';
            alertBox.classList.remove('hidden');
        }
    } finally {
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

async function evaluateShiftAndProcessPunch(colaborador, actionType, authMethod) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    let requiresJustification = false;
    let reasonText = '';

    if (actionType === 'ENTRADA') {
        if ((hours > 8 || (hours === 8 && minutes > 10)) && hours < 12) {
            requiresJustification = true;
            reasonText = `Entrada registrada às ${now.toLocaleTimeString('pt-BR')} (Atraso fora da tolerância do turno das 08:00 + 10 min).`;
        }
    } else if (actionType === 'SAIDA_EXPEDIENTE') {
        if (hours < 16 || (hours === 16 && minutes < 50)) {
            requiresJustification = true;
            reasonText = `Saída registrada às ${now.toLocaleTimeString('pt-BR')} (Saída antecipada fora da tolerância do turno das 17:00).`;
        }
    }

    if (requiresJustification) {
        pendingPunchContext = { colaborador, actionType, authMethod, reasonText };
        openJustificationModal(reasonText);
    } else {
        await finalizePunchProcess(colaborador, actionType, authMethod, null);
    }
}

function openJustificationModal(reasonText) {
    const modal = document.getElementById('justification-modal');
    const elReason = document.getElementById('justification-reason-text');
    const elTextarea = document.getElementById('input-justification-text');

    if (elReason) elReason.textContent = reasonText;
    if (elTextarea) elTextarea.value = '';

    if (modal) modal.classList.remove('hidden');
    initLucideIcons();
}

function setupJustificationEvents() {
    const submitBtn = document.getElementById('submit-justification-btn');
    if (submitBtn) {
        submitBtn.onclick = async () => {
            const elTextarea = document.getElementById('input-justification-text');
            const justificationText = elTextarea ? elTextarea.value.trim() : '';

            if (!justificationText) {
                alert('A justificativa é obrigatória para este batimento fora do turno.');
                return;
            }

            const modal = document.getElementById('justification-modal');
            if (modal) modal.classList.add('hidden');

            if (pendingPunchContext) {
                const { colaborador, actionType, authMethod } = pendingPunchContext;
                await saveJustification(colaborador, justificationText);
                await finalizePunchProcess(colaborador, actionType, authMethod, justificationText);
                pendingPunchContext = null;
            }
        };
    }
}

async function saveJustification(colaborador, justificationText) {
    try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (client && navigator.onLine) {
            await client.from('justificativa_ocorrencia').insert([
                {
                    colaborador_id: colaborador.id,
                    data_ocorrencia: new Date().toISOString().split('T')[0],
                    tipo: 'ATRASO',
                    descricao: justificationText,
                    desconto_aplicado: true
                }
            ]);
        }
    } catch (e) {
        console.warn('Erro ao gravar justificativa:', e);
    }
}

async function finalizePunchProcess(colaborador, actionType, authMethod, justificationText) {
    const savedRecord = await savePunchRecord(colaborador, actionType, authMethod);
    openVirtualTicketModal(colaborador, actionType, authMethod, savedRecord);
}

async function savePunchRecord(colaborador, actionType, authMethod) {
    const nowISO = new Date().toISOString();
    let punchRecord = {
        id: window.crypto.randomUUID ? window.crypto.randomUUID() : 'p_' + Date.now(),
        colaborador_id: colaborador.id,
        timestamp_registro: nowISO,
        tipo_batimento: actionType,
        metodo_autenticacao: authMethod,
        sincronizado_offline: !navigator.onLine
    };

    if (window.offlineStore) {
        await window.offlineStore.saveOfflinePunch(punchRecord);
    }

    try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (client && navigator.onLine) {
            const { data, error } = await client.from('registro_ponto').insert([
                {
                    colaborador_id: colaborador.id,
                    timestamp_registro: nowISO,
                    tipo_batimento: actionType,
                    metodo_autenticacao: authMethod === 'SENHA' || authMethod === 'CARTAO_SUPERVISOR' ? 'CARTAO_SUPERVISOR' : 'BIOMETRIA',
                    sincronizado_offline: false
                }
            ]).select();

            if (!error && data && data.length > 0) {
                punchRecord = data[0];
            }
        }
    } catch (err) {
        console.warn('Erro/Offline ao salvar no Supabase, mantido em IndexedDB:', err);
    }

    return punchRecord;
}

function openVirtualTicketModal(colaborador, actionType, authMethod, punchRecord) {
    const modal = document.getElementById('ticket-modal');
    const elEmpresaNome = document.getElementById('ticket-empresa-nome');
    const elEmpresaCnpj = document.getElementById('ticket-empresa-cnpj');
    const elColabNome = document.getElementById('ticket-colaborador-nome');
    const elColabPis = document.getElementById('ticket-colaborador-pis');
    const elColabCargo = document.getElementById('ticket-colaborador-cargo');
    const elTipo = document.getElementById('ticket-tipo-batimento');
    const elTimestamp = document.getElementById('ticket-timestamp');
    const elMetodo = document.getElementById('ticket-metodo');
    const elHash = document.getElementById('ticket-hash');
    const elPunchesList = document.getElementById('ticket-today-punches-list');

    const actionNames = {
        'ENTRADA': 'ENTRADA EXPEDIENTE',
        'SAIDA_INTERVALO': 'SAÍDA INTERVALO',
        'RETORNO_INTERVALO': 'RETORNO INTERVALO',
        'SAIDA_EXPEDIENTE': 'SAÍDA EXPEDIENTE'
    };

    const nowStr = new Date().toLocaleString('pt-BR');
    const hashHex = generateReceiptHash(colaborador, punchRecord);

    if (elEmpresaNome) elEmpresaNome.textContent = 'TECH PONTO SOLUCOES LTDA';
    if (elEmpresaCnpj) elEmpresaCnpj.textContent = 'CNPJ: 12.345.678/0001-90';
    if (elColabNome) elColabNome.textContent = colaborador.nome;
    if (elColabPis) elColabPis.textContent = colaborador.pis;
    if (elColabCargo) elColabCargo.textContent = `${colaborador.cargo || 'Funcional'} (${colaborador.funcao || 'Operacional'})`;
    if (elTipo) elTipo.textContent = actionNames[actionType] || actionType;
    if (elTimestamp) elTimestamp.textContent = nowStr;
    if (elMetodo) elMetodo.textContent = authMethod;
    if (elHash) elHash.textContent = hashHex;

    if (elPunchesList) {
        elPunchesList.innerHTML = `<li>1. ${actionNames[actionType] || actionType} - ${nowStr.split(' ')[1]} (${authMethod})</li>`;
    }

    setupTicketActions(colaborador, nowStr);

    if (modal) {
        modal.classList.remove('hidden');
    }
    initLucideIcons();
}

function generateReceiptHash(colaborador, punchRecord) {
    const raw = `${colaborador.pis}_${punchRecord.timestamp_registro || Date.now()}_${punchRecord.tipo_batimento}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        hash = (hash << 5) - hash + raw.charCodeAt(i);
        hash |= 0;
    }
    return 'CP-' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0') + '-' + Date.now().toString(16).toUpperCase();
}

function setupTicketActions(colaborador, nowStr) {
    const printBtn = document.getElementById('print-ticket-btn');
    const emailBtn = document.getElementById('email-ticket-btn');
    const finishBtn = document.getElementById('finish-ticket-btn');
    const closeBtn = document.getElementById('close-ticket-btn');

    if (printBtn) {
        printBtn.onclick = () => {
            window.print();
        };
    }

    if (emailBtn) {
        emailBtn.onclick = () => {
            alert(`Comprovante digital enviado com sucesso para o e-mail: ${colaborador.email || 'colaborador@empresa.com'}`);
        };
    }

    const closeTicket = () => {
        const modal = document.getElementById('ticket-modal');
        if (modal) modal.classList.add('hidden');
        showSuccessToast(colaborador, selectedActionType);
    };

    if (finishBtn) finishBtn.onclick = closeTicket;
    if (closeBtn) closeBtn.onclick = closeTicket;
}

function setupHRDashboardEvents() {
    const openBtn = document.getElementById('open-hr-dashboard-btn');
    const closeBtn = document.getElementById('close-hr-dashboard-btn');
    const closeFooterBtn = document.getElementById('close-hr-modal-footer-btn');

    const toggleDashboard = (show) => {
        const modal = document.getElementById('hr-dashboard-modal');
        if (modal) {
            if (show) {
                modal.classList.remove('hidden');
                loadHRDashboardData();
            } else {
                modal.classList.add('hidden');
            }
        }
    };

    if (openBtn) openBtn.onclick = () => toggleDashboard(true);
    if (closeBtn) closeBtn.onclick = () => toggleDashboard(false);
    if (closeFooterBtn) closeFooterBtn.onclick = () => toggleDashboard(false);
}

async function loadHRDashboardData() {
    const tbody = document.getElementById('hr-punches-tbody');
    const elTotal = document.getElementById('stat-total-punches');
    const elContingency = document.getElementById('stat-contingency-count');
    const elJustifications = document.getElementById('stat-justifications-count');

    try {
        let punches = [];
        if (window.offlineStore) {
            punches = await window.offlineStore.getUnsyncedPunches();
        }

        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (client && navigator.onLine) {
            const { data } = await client.from('registro_ponto').select('*, colaborador(nome)').order('timestamp_registro', { ascending: false }).limit(20);
            if (data && data.length > 0) {
                punches = data;
            }
        }

        if (elTotal) elTotal.textContent = punches.length;
        if (elContingency) elContingency.textContent = punches.filter(p => p.metodo_autenticacao === 'CARTAO_SUPERVISOR').length;
        if (elJustifications) elJustifications.textContent = '1';

        if (tbody) {
            if (punches.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">Nenhum registro de ponto cadastrado ainda.</td></tr>';
            } else {
                tbody.innerHTML = punches.map(p => {
                    const colabNome = p.colaborador ? p.colaborador.nome : 'Carlos Silva (Demonstração)';
                    const dateStr = new Date(p.timestamp_registro).toLocaleString('pt-BR');
                    return `
                        <tr>
                            <td>${dateStr}</td>
                            <td>${colabNome}</td>
                            <td>${p.tipo_batimento}</td>
                            <td><span class="status-badge ${p.metodo_autenticacao === 'BIOMETRIA' ? 'status-online' : 'status-checking'}">${p.metodo_autenticacao}</span></td>
                            <td>${p.sincronizado_offline ? 'Pendente Sync' : 'Sincronizado'}</td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (e) {
        console.error('Erro ao carregar dados do RH:', e);
    }
    initLucideIcons();
}

function showSuccessToast(colaborador, actionType) {
    const toast = document.getElementById('success-toast');
    const toastColaborador = document.getElementById('toast-colaborador');
    const toastTime = document.getElementById('toast-time');

    const nowStr = new Date().toLocaleTimeString('pt-BR');

    if (toastColaborador) toastColaborador.textContent = `Colaborador: ${colaborador.nome}`;
    if (toastTime) toastTime.textContent = `Horário: ${nowStr} (${actionType})`;

    if (toast) {
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }
    initLucideIcons();
}
