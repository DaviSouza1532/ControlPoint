// js/app.js
// Lógica principal do frontend, atualização de relógio e verificação de conexão Supabase

document.addEventListener('DOMContentLoaded', () => {
    initLucideIcons();
    startClock();
    setupNetworkMonitoring();
    testSupabaseConnection();
    setupActionButtons();
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

        // Tenta consultar a tabela empresa para verificar se o Supabase está respondendo
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

function setupActionButtons() {
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            console.log(`Ação selecionada: ${action}`);
            alert(`Tipo de registro selecionado: ${action}\n(O fluxo de identificação biométrica será o próximo passo)`);
        });
    });
}
