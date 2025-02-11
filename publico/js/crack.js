class AuthManager {
    constructor() {
        this.isLoading = false;
        this.checkDeviceType();
        this.isMobile = window.location.pathname.includes('/app/');
        this.initializeAuth();
        this.startAuthCheck();
    }

    checkDeviceType() {
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isInMobileRoute = window.location.pathname.includes('/app/');
        
        if (isMobileDevice && !isInMobileRoute) {
            window.location.href = '/app/login-app.html';
            return;
        } else if (!isMobileDevice && isInMobileRoute) {
            window.location.href = '/login.html';
            return;
        }
    }

    async initializeAuth() {
        const loading = document.getElementById('loading');
        const loginForm = document.getElementById(this.isMobile ? 'password-form' : 'loginForm');
        
        if (loading) loading.style.display = 'none';
        if (loginForm) {
            loginForm.style.display = 'block';
            this.setupLoginForm();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const password = this.isMobile ? 
            document.getElementById('manual-password').value :
            document.getElementById('password').value;
        const submitButton = this.isMobile ? 
            e.submitter :
            document.getElementById('submitButton');
        const errorMessage = this.isMobile ?
            document.getElementById('status-message') :
            document.getElementById('errorMessage');
        const loading = document.getElementById('loading');
        const loginForm = document.getElementById(this.isMobile ? 'password-form' : 'loginForm');

        try {
            this.isLoading = true;
            if (submitButton) submitButton.disabled = true;
            if (!this.isMobile) {
                loginForm.style.display = 'none';
                loading.style.display = 'block';
                loading.textContent = 'Verificando credenciales...';
            }
            if (errorMessage) errorMessage.style.display = 'none';

            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            if (!this.isMobile) {
                loading.textContent = 'Acceso correcto. Iniciando sesión...';
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.startAuthCheck();
            
            window.location.href = this.isMobile ? '/app/index-app.html' : '/index.html';

        } catch (error) {
            if (!this.isMobile) {
                loading.style.display = 'none';
                loginForm.style.display = 'block';
            }
            if (errorMessage) {
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            }
        } finally {
            this.isLoading = false;
            if (submitButton) submitButton.disabled = false;
        }
    }

    setupLoginForm() {
        const form = document.getElementById(this.isMobile ? 'password-form' : 'loginForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    startAuthCheck() {
        setInterval(async () => {
            try {
                const response = await fetch('/api/auth/check');
                if (!response.ok) {
                    window.location.href = this.isMobile ? 
                        '/app/login-app.html' : 
                        '/login.html';
                }
            } catch (error) {
                console.error('Error verificando autenticación:', error);
                window.location.href = this.isMobile ? 
                    '/app/login-app.html' : 
                    '/login.html';
            }
        }, 10000);
    }

    static init() {
        return new AuthManager();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
});

export default AuthManager; 