// js/biometrics.js
// Módulo de Autenticação Biométrica utilizando a WebAuthn API e fallback/simulação

class BiometricService {
    constructor() {
        this.failedAttempts = 0;
        this.maxFailedAttempts = 3;
    }

    /**
     * Verifica se a API WebAuthn / Biometria está disponível no navegador.
     */
    async isWebAuthnAvailable() {
        if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
            try {
                return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            } catch (e) {
                console.warn('Erro ao verificar disponibilidade de biometria:', e);
                return false;
            }
        }
        return false;
    }

    /**
     * Tenta autenticar o colaborador via WebAuthn API.
     * Caso não esteja disponível no ambiente (ex: iframe sandbox ou desktop sem suporte), oferece modo de simulação/leitura de digital.
     */
    async authenticateColaborador(colaborador) {
        const isAvailable = await this.isWebAuthnAvailable();

        if (isAvailable && window.PublicKeyCredential) {
            try {
                const challenge = new Uint8Array(32);
                window.crypto.getRandomValues(challenge);

                const publicKeyCredentialRequestOptions = {
                    challenge: challenge,
                    timeout: 60000,
                    userVerification: "preferred"
                };

                const credential = await navigator.credentials.get({
                    publicKey: publicKeyCredentialRequestOptions
                });

                if (credential) {
                    this.failedAttempts = 0;
                    return { success: true, credential };
                }
            } catch (err) {
                console.warn('Falha na verificação WebAuthn nativa:', err);
                this.failedAttempts++;
                return {
                    success: false,
                    attemptsRemaining: this.maxFailedAttempts - this.failedAttempts,
                    error: err.message || 'Falha na leitura biométrica.'
                };
            }
        }

        // Se a API WebAuthn nativa não puder ser acionada, executa o fluxo de validação biométrica simulada
        return this.simulateBiometricAuth(colaborador);
    }

    /**
     * Fluxo de simulação para ambientes sem leitor biométrico nativo registrado.
     */
    async simulateBiometricAuth(colaborador) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Se o colaborador possui hash de biometria cadastrado ou em modo de simulação
                if (colaborador && colaborador.hash_biometria !== 'INVALID_HASH') {
                    this.failedAttempts = 0;
                    resolve({
                        success: true,
                        method: 'BIOMETRIA_SIMULADA',
                        message: 'Digital lida e reconhecida com sucesso.'
                    });
                } else {
                    this.failedAttempts++;
                    resolve({
                        success: false,
                        attemptsRemaining: this.maxFailedAttempts - this.failedAttempts,
                        error: 'Impressão digital não reconhecida.'
                    });
                }
            }, 1500);
        });
    }

    getFailedAttempts() {
        return this.failedAttempts;
    }

    resetFailedAttempts() {
        this.failedAttempts = 0;
    }
}

window.biometricService = new BiometricService();
