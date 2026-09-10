// js/app.js
// Lógica principal do frontend, atualização de relógio e verificação de conexão Supabase

let selectedActionType = null;
let colaboradoresList = [];

document.addEventListener('DOMContentLoaded', () => {
    initLucideIcons();
    startClock();
    setupNetworkMonitoring();
    testSupabaseConnection();
    loadColaboradores();
    setupActionButtons();
    setupModalEvents();
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

        const { data, error } = await client.from('colaborador').select('id, nome, pis, cargo, hash_biometria').eq('ativo', true);

        if (error) {
            console.warn('Não foi possível carregar colaboradores do Supabase:', error);
            // Dados fallback para teste visual caso banco esteja vazio
            colaboradoresList = [
                { id: '11111111-1111-1111-1111-111111111111', nome: 'Carlos Silva (Demonstração)', pis: '123.45678.90-1', cargo: 'Analista', hash_biometria: 'HASH_DEMO_1' }
            ];
        } else if (data && data.length > 0) {
            colaboradoresList = data;
        } else {
            colaboradoresList = [
                { id: '11111111-1111-1111-1111-111111111111', nome: 'Carlos Silva (Demonstração)', pis: '123.45678.90-1', cargo: 'Analista', hash_biometria: 'HASH_DEMO_1' }
            ];
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
        modalTitle.textContent = `Identificação Biométrica - ${actionLabels[actionType] || actionType}`;
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

    if (closeBtn) closeBtn.addEventListener('click', closeBiometricModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeBiometricModal);

    if (confirmBtn) {
        confirmBtn.addEventListener('click', processBiometricClockIn);
    }
}

async function processBiometricClockIn() {
    const select = document.getElementById('colaborador-select');
    const statusText = document.getElementById('biometric-status-text');
    const alertBox = document.getElementById('biometric-alert');
    const confirmBtn = document.getElementById('confirm-biometric-btn');

    const colaboradorId = select ? select.value : null;

    if (!colaboradorId) {
        if (alertBox) {
            alertBox.className = 'alert-box alert-danger';
            alertBox.textContent = 'Por favor, selecione um colaborador para a leitura.';
            alertBox.classList.remove('hidden');
        }
        return;
    }

    const colaborador = colaboradoresList.find(c => c.id === colaboradorId);

    if (statusText) {
        statusText.textContent = 'Lendo impressão digital... Mantenha o dedo no leitor.';
    }

    if (confirmBtn) confirmBtn.disabled = true;

    try {
        const result = await window.biometricService.authenticateColaborador(colaborador);

        if (result.success) {
            if (statusText) statusText.textContent = 'Biometria confirmada! Salvando batimento...';

            // Registra o batimento no Supabase
            await savePunchRecord(colaborador, selectedActionType, 'BIOMETRIA');

            closeBiometricModal();
            showSuccessToast(colaborador, selectedActionType);
        } else {
            if (alertBox) {
                alertBox.className = 'alert-box alert-danger';
                alertBox.textContent = `${result.error} Tentativas restantes: ${result.attemptsRemaining}`;
                alertBox.classList.remove('hidden');
            }
            if (statusText) statusText.textContent = 'Falha na leitura. Tente novamente.';

            if (result.attemptsRemaining <= 0) {
                alertBox.textContent = 'Limite de tentativas excedido! Contingência via cartão/supervisor recomendada.';
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

async function savePunchRecord(colaborador, actionType, authMethod) {
    const nowISO = new Date().toISOString();
    try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (client) {
            const { data, error } = await client.from('registro_ponto').insert([
                {
                    colaborador_id: colaborador.id,
                    timestamp_registro: nowISO,
                    tipo_batimento: actionType,
                    metodo_autenticacao: authMethod,
                    sincronizado_offline: false
                }
            ]);

            if (error) {
                console.warn('Aviso ao salvar registro no Supabase:', error);
            } else {
                console.log('Registro salvo no Supabase com sucesso:', data);
            }
        }
    } catch (err) {
        console.error('Erro ao salvar batimento:', err);
    }
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
