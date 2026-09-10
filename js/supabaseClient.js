// js/supabaseClient.js
// Configuração e Inicialização da API do Supabase

const SUPABASE_URL = 'https://ddjhrpiojzfzfzohciof.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_YuHXzXPqYsxzp3yGya1EEA_GYExKdil';

let supabaseClient = null;

function initSupabase() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        console.log('Cliente Supabase inicializado com sucesso.');
        return supabaseClient;
    } else {
        console.error('SDK do Supabase não encontrado na janela global (window.supabase).');
        return null;
    }
}

function getSupabaseClient() {
    if (!supabaseClient) {
        return initSupabase();
    }
    return supabaseClient;
}

window.getSupabaseClient = getSupabaseClient;
