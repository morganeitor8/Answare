const crypto = require('crypto');
const winston = require('winston');
const passManager = require('./priv/usd/pass.js');

class KeyManager {
    constructor() {
        // Generar contraseña inicial
        this.ADMIN_PASSWORD = crypto.randomBytes(4).toString('hex');
        this.AUTH_TOKEN = crypto.randomBytes(32).toString('hex');
        this.loginAttempts = new Map();
        this.activeSessions = new Map();
        this.lastPasswordChange = Date.now();
        this.PASSWORD_ROTATION_TIME = 10 * 60 * 1000; // 10 minutos

        // Configurar logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: 'logs/auth.log',
                    maxsize: 5242880,
                    maxFiles: 5
                })
            ]
        });

        // Log de inicio
        this.logger.info('KeyManager iniciado', {
            initialPassword: this.ADMIN_PASSWORD,
            nextRotation: new Date(this.lastPasswordChange + this.PASSWORD_ROTATION_TIME)
        });

        // Mostrar contraseña inicial en consola
        console.log('\x1b[33m%s\x1b[0m', `➜ Contraseña inicial: ${this.ADMIN_PASSWORD}`);

        // Iniciar rotación de contraseña
        this.startPasswordRotation();
    }

    startPasswordRotation() {
        // Limpiar cualquier intervalo existente
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
        }

        // Crear nuevo intervalo
        this.rotationInterval = setInterval(() => {
            this.rotatePassword();
        }, this.PASSWORD_ROTATION_TIME);

        // Asegurar que el intervalo no impida que Node.js se cierre
        this.rotationInterval.unref();
    }

    rotatePassword() {
        const oldPassword = this.ADMIN_PASSWORD;
        this.ADMIN_PASSWORD = crypto.randomBytes(4).toString('hex');
        this.lastPasswordChange = Date.now();
        
        // El AUTH_TOKEN no cambia cuando la contraseña cambia
        // Esto permite que las sesiones existentes sigan siendo válidas
        
        // Log en el archivo
        this.logger.info('Contraseña rotada', {
            oldPassword,
            newPassword: this.ADMIN_PASSWORD,
            timestamp: this.lastPasswordChange,
            nextRotation: new Date(this.lastPasswordChange + this.PASSWORD_ROTATION_TIME)
        });

        console.log('\x1b[33m%s\x1b[0m', `➜ Contraseña cambió a: ${this.ADMIN_PASSWORD}`);
    }

    async handleLogin(req) {
        const { password } = req.body;
        const ip = req.ip;
        const userAgent = req.headers['user-agent'] || '';

        // Verificar intentos fallidos
        const attempts = this.loginAttempts.get(ip) || { count: 0, timestamp: Date.now() };
        
        if (attempts.count >= 5) {
            const timeSinceBlock = Date.now() - attempts.timestamp;
            if (timeSinceBlock < 30 * 60 * 1000) {
                return { 
                    success: false, 
                    error: 'Demasiados intentos fallidos. Intente más tarde.' 
                };
            }
            this.loginAttempts.delete(ip);
        }

        if (password === this.ADMIN_PASSWORD) {
            const deviceId = crypto.randomBytes(8).toString('hex');
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            
            // Crear archivo de dispositivo
            const deviceInfo = {
                id: deviceId,
                file: `${deviceId}.json`,
                type: isMobileDevice ? 'mobile' : 'desktop',
                ip: ip,
                lastConnection: Date.now(),
                isActive: true
            };

            // Datos para el archivo individual del dispositivo
            const deviceData = {
                token: this.AUTH_TOKEN,
                userAgent: userAgent,
                lastConnection: Date.now(),
                isActive: true
            };

            // Guardar tanto en pass.json como el archivo individual
            await passManager.addDevice(deviceInfo);
            await passManager.createDeviceFile(deviceId, deviceData);

            // Mantener el comportamiento existente
            this.activeSessions.set(deviceId, {
                ip: ip,
                lastConnection: Date.now(),
                type: isMobileDevice ? 'mobile' : 'desktop',
                isActive: true,
                userAgent: userAgent
            });

            this.loginAttempts.delete(ip);
            this.logger.info('Login exitoso', { ip, deviceId, deviceType: isMobileDevice ? 'mobile' : 'desktop' });

            return {
                success: true,
                token: this.AUTH_TOKEN,
                deviceId: deviceId
            };
        }

        if (password !== this.ADMIN_PASSWORD) {
            attempts.count++;
            attempts.timestamp = Date.now();
            this.loginAttempts.set(ip, attempts);

            this.logger.warn('Contraseña incorrecta', {
                ip,
                attemptCount: attempts.count
            });

            return {
                success: false,
                error: 'Contraseña incorrecta',
                intentosRestantes: 5 - attempts.count
            };
        }
    }

    getActiveDevices() {
        const devices = [];
        this.activeSessions.forEach((session, deviceId) => {
            devices.push({
                id: deviceId,
                name: `${session.type === 'mobile' ? 'Móvil' : 'PC'} (${session.ip})`,
                type: session.type,
                lastConnection: session.lastConnection,
                isActive: session.isActive
            });
        });
        return devices;
    }

    invalidateDevice(deviceId) {
        if (this.activeSessions.has(deviceId)) {
            const session = this.activeSessions.get(deviceId);
            this.activeSessions.delete(deviceId);
            
            // Generar nuevo token para forzar reautenticación
            const oldToken = this.AUTH_TOKEN;
            this.AUTH_TOKEN = crypto.randomBytes(32).toString('hex');
            
            // Registrar en el log
            this.logger.info('Dispositivo invalidado', {
                deviceId,
                ip: session.ip,
                oldToken,
                newToken: this.AUTH_TOKEN
            });

            return { 
                success: true,
                forceLogout: true
            };
        }
        return { success: false, error: 'Dispositivo no encontrado' };
    }

    getDeviceName(userAgent) {
        // Extraer información útil del user-agent
        return "Dispositivo desconocido";
    }

    getCurrentPassword() {
        return this.ADMIN_PASSWORD;
    }
}

// Asegurar que el proceso se cierre limpiamente
process.on('SIGINT', () => {
    if (KeyManager.instance && KeyManager.instance.rotationInterval) {
        clearInterval(KeyManager.instance.rotationInterval);
    }
    process.exit(0);
});

// Crear una única instancia
const instance = new KeyManager();
module.exports = instance; 