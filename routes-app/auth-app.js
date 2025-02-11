class CameraManager {
    constructor() {
        this.hasPermission = false;
        this.qrScanner = null;
        this.initializeUI();
    }

    initializeUI() {
        // Elementos UI
        this.btnScan = document.getElementById('btn-scan');
        this.toggleManual = document.getElementById('toggle-manual');
        this.passwordForm = document.getElementById('password-form');
        this.statusMessage = document.getElementById('status-message');
        this.scanArea = document.querySelector('.scan-area');
        this.videoElem = document.getElementById('qr-video');
        
        let isFormVisible = false;

        // Toggle del formulario manual
        this.toggleManual.addEventListener('click', () => {
            isFormVisible = !isFormVisible;
            this.passwordForm.className = isFormVisible ? 'password-form active' : 'password-form';
            
            // Si el scanner está activo, detenerlo
            if (this.qrScanner) {
                this.qrScanner.stop();
            }
        });

        // Bind eventos
        this.btnScan.addEventListener('click', () => this.startScanning());
    }

    async startScanning() {
        try {
            if (!this.qrScanner) {
                // Verificar si QrScanner está disponible
                if (typeof QrScanner === 'undefined') {
                    throw new Error('QR Scanner no está cargado correctamente');
                }

                // Solicitar permiso de cámara explícitamente primero
                this.statusMessage.textContent = 'Solicitando acceso a la cámara...';
                try {
                    await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment'
                        }
                    });
                } catch (permissionError) {
                    if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
                        throw new Error('Necesitamos acceso a tu cámara para escanear el QR');
                    }
                    throw permissionError;
                }

                // Una vez que tenemos permiso, crear el scanner
                this.qrScanner = new QrScanner(
                    this.videoElem,
                    result => {
                        // Procesar el resultado del QR
                        let password = result;
                        
                        // Si result es un objeto (algunas versiones de QrScanner devuelven un objeto)
                        if (typeof result === 'object' && result.data) {
                            password = result.data;
                        }

                        // Limpiar la contraseña de posibles espacios o caracteres extra
                        password = password.trim();
                        
                        console.log('QR escaneado (raw):', result);
                        console.log('Contraseña procesada:', password);

                        // Asignar al input
                        const passwordInput = document.getElementById('manual-password');
                        passwordInput.value = password;
                        
                        // Verificar que se asignó correctamente
                        console.log('Valor final en input:', passwordInput.value);

                        // Disparar el evento submit
                        this.passwordForm.dispatchEvent(new Event('submit'));
                        this.qrScanner.stop();
                        this.scanArea.classList.remove('active');
                    },
                    {
                        preferredCamera: 'environment',
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                        maxScansPerSecond: 5,
                        returnDetailedScanResult: true  // Para obtener más información del escaneo
                    }
                );

                // Verificar si hay cámaras disponibles
                const hasCamera = await QrScanner.hasCamera();
                if (!hasCamera) {
                    throw new Error('No se detectó ninguna cámara');
                }
            }

            // Mostrar área de escaneo
            this.scanArea.classList.add('active');
            
            // Ocultar formulario manual si está visible
            this.passwordForm.classList.remove('active');

            await this.qrScanner.start();
            this.statusMessage.textContent = 'Escaneando...';

        } catch (error) {
            console.error('Error detallado:', error);
            this.statusMessage.textContent = `Error: ${error.message}`;
            this.scanArea.classList.remove('active');
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const cameraManager = new CameraManager();
});

export const cameraManager = new CameraManager(); 