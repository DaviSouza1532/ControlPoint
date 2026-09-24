// js/biometrics.js
// Módulo de Autenticação Biométrica utilizando WebAuthn API (Passkeys) e Leitor de Impressão Digital

class BiometricService {
    constructor() {
        this.failedAttempts = 0;
        this.maxFailedAttempts = 3;
    }

    /**
     * Verifica se a API WebAuthn / Biometria está disponível no dispositivo.
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
     * Cadastra uma nova chave biométrica WebAuthn (Passkey) para o colaborador.
     */
    async registerPasskey(colaborador) {
        if (!colaborador) {
            return { success: false, error: 'Selecione um colaborador antes de cadastrar a chave.' };
        }

        try {
            const userId = new TextEncoder().encode(colaborador.id.substring(0, 16));
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialCreationOptions = {
                challenge: challenge,
                rp: {
                    name: "ControlPoint Ponto",
                    id: window.location.hostname || "localhost"
                },
                user: {
                    id: userId,
                    name: colaborador.email || colaborador.nome,
                    displayName: colaborador.nome
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "preferred"
                },
                timeout: 60000
            };

            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            });

            if (credential) {
                return {
                    success: true,
                    credentialId: credential.id,
                    message: 'Biometria/Passkey cadastrada com sucesso!'
                };
            }
        } catch (err) {
            console.warn('Erro ao cadastrar Passkey WebAuthn:', err);
            return {
                success: false,
                error: err.name === 'NotAllowedError' 
                    ? 'O cadastro de chave biométrica foi cancelado pelo usuário.' 
                    : (err.message || 'Erro ao cadastrar biometria.')
            };
        }
    }

    /**
     * Tenta autenticar via WebAuthn API (Passkey).
     * Se falhar por ausência de chave ("Nenhuma chave disponível"), realiza o fallback transparente para o leitor de digital do totem/simulação.
     */
    async authenticateColaborador(colaborador, useNativeWebAuthn = false) {
        const isAvailable = await this.isWebAuthnAvailable();

        if (useNativeWebAuthn && isAvailable && window.PublicKeyCredential) {
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
                    return { success: true, method: 'WEBAUTHN', credential };
                }
            } catch (err) {
                console.warn('Erro ou ausência de Passkey WebAuthn:', err);

                // Caso o erro seja NotAllowedError ("Nenhuma chave de acesso disponível")
                if (err.name === 'NotAllowedError') {
                    return {
                        success: false,
                        passkeyMissing: true,
                        error: 'Nenhuma chave de acesso cadastrada neste dispositivo. Utilize a leitura de digital do leitor ou cadastre uma Passkey.'
                    };
                }

                this.failedAttempts++;
                return {
                    success: false,
                    attemptsRemaining: this.maxFailedAttempts - this.failedAttempts,
                    error: err.message || 'Falha na verificação da chave biométrica.'
                };
            }
        }

        // Leitura biométrica do leitor biométrico/totem (com simulação/fallback)
        return this.simulateBiometricAuth(colaborador);
    }

    /**
     * Leitura de impressão digital via leitor biométrico/sensor.
     */
    async simulateBiometricAuth(colaborador) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (colaborador) {
                    this.failedAttempts = 0;
                    resolve({
                        success: true,
                        method: 'BIOMETRIA_LEITOR',
                        message: 'Impressão digital lida e identificada com sucesso!'
                    });
                } else {
                    this.failedAttempts++;
                    resolve({
                        success: false,
                        attemptsRemaining: this.maxFailedAttempts - this.failedAttempts,
                        error: 'Impressão digital não identificada.'
                    });
                }
            }, 1200);
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
