class GestorKey {
    constructor() {
        if (!document.getElementById('key-page')) return;
        
        this.keyPage = document.getElementById('key-page');
        this.keyContainer = this.keyPage.querySelector('.estadisticas-contenido');
        this.currentFilter = 'all';
        this.updateInterval = null;
        
        this.init();
        this.bindEvents();
        this.startAutoUpdate();
        this.startAuthCheck();
    }

    startAutoUpdate() {
        // Actualización inicial
        this.cargarDispositivos();
        
        // Configurar intervalo de actualización
        this.updateInterval = setInterval(() => {
            this.cargarDispositivos();
        }, 10000); // 10 segundos
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    startAuthCheck() {
        // Verificar autenticación cada 10 segundos
        this.authCheckInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/auth/check');
                if (!response.ok) {
                    // Redirigir según el tipo de dispositivo
                    const isMobileRoute = window.location.pathname.includes('/app/');
                    window.location.href = isMobileRoute ? '/app/login-app.html' : '/login.html';
                }
            } catch (error) {
                console.error('Error verificando autenticación:', error);
            }
        }, 10000);
    }

    destructor() {
        this.stopAutoUpdate();
        if (this.authCheckInterval) {
            clearInterval(this.authCheckInterval);
        }
    }

    bindEvents() {
        // Evento para nueva conexión
        this.keyContainer.addEventListener('click', (e) => {
            if (e.target.closest('.btn-nueva-conexion')) {
                this.mostrarModalNuevaConexion();
            }
        });

        // Evento para eliminar dispositivo
        this.keyContainer.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.action-btn.delete');
            if (deleteBtn) {
                const deviceId = deleteBtn.dataset.id;
                if (await this.confirmarEliminacion(deviceId)) {
                    await this.eliminarDispositivo(deviceId);
                }
            }
        });

        // Evento para los filtros
        this.keyContainer.addEventListener('click', (e) => {
            const filterBtn = e.target.closest('.filter-btn');
            if (filterBtn) {
                const filter = filterBtn.dataset.filter;
                this.aplicarFiltro(filter);
            }
        });
    }

    aplicarFiltro(filter) {
        // Actualizar botones
        const buttons = this.keyContainer.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.currentFilter = filter;
        this.actualizarTabla(); // Actualizar tabla con el filtro actual
    }

    async init() {
        try {
            this.keyContainer.innerHTML = `
                <div class="key-dashboard">
                    <!-- Panel de estadísticas -->
                    <div class="key-stats">
                        <div class="stat-card">
                            <div class="stat-icon">📱💻</div>
                            <div class="stat-info">
                                <h3>Dispositivos</h3>
                                <span class="stat-value">0</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🔌</div>
                            <div class="stat-info">
                                <h3>Conectados</h3>
                                <span class="stat-value">0</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">⚡</div>
                            <div class="stat-info">
                                <h3>Activos hoy</h3>
                                <span class="stat-value">0</span>
                            </div>
                        </div>
                    </div>

                    <!-- Sección de acciones -->
                    <div class="key-actions">
                        <button class="btn-nueva-conexion">
                            <img src="assets/agregar.png" alt="Nueva conexión">
                            Nueva Conexión
                        </button>
                        <div class="actions-info">
                            <span class="info-text">Escanea el código QR desde la app móvil</span>
                        </div>
                    </div>

                    <!-- Lista de conexiones -->
                    <div class="key-list">
                        <div class="list-header">
                            <h3>Dispositivos conectados</h3>
                            <div class="list-filters">
                                <button class="filter-btn active" data-filter="all">Todos</button>
                                <button class="filter-btn" data-filter="active">Activos</button>
                                <button class="filter-btn" data-filter="inactive">Inactivos</button>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Dispositivo</th>
                                    <th>Estado</th>
                                    <th>Última conexión</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="conexiones-tbody">
                                <tr>
                                    <td colspan="4" class="no-conexiones">
                                        Cargando dispositivos...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error al inicializar la página de conexiones:', error);
        }
    }

    async cargarDispositivos() {
        try {
            // Obtener todos los dispositivos con cookies de autenticación activas
            const response = await fetch('/api/devices');
            const devices = await response.json();
            this.devices = devices; // Guardar dispositivos

            // Actualizar estadísticas y tabla
            this.actualizarEstadisticas(devices);
            this.actualizarTabla();

            console.log('Dispositivos activos:', devices); // Debug
        } catch (error) {
            console.error('Error al cargar dispositivos:', error);
            const tbody = document.getElementById('conexiones-tbody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-conexiones error">
                        Error al cargar dispositivos
                    </td>
                </tr>
            `;
        }
    }

    actualizarEstadisticas(devices) {
        const activos = devices.filter(d => d.isActive).length;
        const total = devices.length;
        const activosHoy = devices.filter(d => {
            const ultimaConexion = new Date(d.lastConnection);
            const hoy = new Date();
            return ultimaConexion.toDateString() === hoy.toDateString();
        }).length;
        
        this.keyContainer.querySelector('.stat-card:nth-child(1) .stat-value').textContent = total;
        this.keyContainer.querySelector('.stat-card:nth-child(2) .stat-value').textContent = activos;
        this.keyContainer.querySelector('.stat-card:nth-child(3) .stat-value').textContent = activosHoy;
    }

    actualizarTabla() {
        if (!this.devices) return;

        // Filtrar dispositivos según el filtro actual
        const dispositivosFiltrados = this.devices.filter(device => {
            switch (this.currentFilter) {
                case 'active':
                    return device.isActive;
                case 'inactive':
                    return !device.isActive;
                default:
                    return true;
            }
        });

        const tbody = document.getElementById('conexiones-tbody');
        tbody.innerHTML = dispositivosFiltrados.length ? dispositivosFiltrados.map(device => `
            <tr class="conexion-row ${device.isCurrent ? 'current-device' : ''}">
                <td class="device-info">
                    <span class="device-icon">${device.type === 'mobile' ? '📱' : '💻'}</span>
                    <span class="device-name">
                        ${device.name}
                        ${device.isCurrent ? '<span class="current-badge">(Este dispositivo)</span>' : ''}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${device.isActive ? 'active' : 'inactive'}">
                        ${device.isActive ? 'Conectado' : 'Desconectado'}
                    </span>
                </td>
                <td class="last-connection">
                    ${this.formatearTiempo(device.lastConnection)}
                </td>
                <td class="actions">
                    ${!device.isCurrent ? `
                        <button class="action-btn delete" title="Eliminar conexión" data-id="${device.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('') : `
            <tr>
                <td colspan="4" class="no-conexiones">
                    No hay dispositivos ${this.currentFilter === 'active' ? 'activos' : 
                                      this.currentFilter === 'inactive' ? 'inactivos' : 
                                      'conectados'}
                </td>
            </tr>
        `;
    }

    formatearTiempo(timestamp) {
        const fecha = new Date(timestamp);
        const ahora = new Date();
        const diferencia = ahora - fecha;
        
        if (diferencia < 60000) return 'Hace un momento';
        if (diferencia < 3600000) return `Hace ${Math.floor(diferencia/60000)} minutos`;
        if (diferencia < 86400000) return `Hace ${Math.floor(diferencia/3600000)} horas`;
        return fecha.toLocaleDateString();
    }

    async mostrarModalNuevaConexion() {
        const modal = document.getElementById('modal-nueva-conexion');
        const qrContainer = modal.querySelector('.qr-container');
        modal.classList.add('active');

        // Mostrar estado de carga
        qrContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Generando código QR...</p>
            </div>
        `;

        try {
            // Obtener contraseña actual
            const response = await fetch('/api/auth/current-password');
            const data = await response.json();
            console.log('Contraseña recibida:', data);

            // Limpiar contenedor
            qrContainer.innerHTML = '';
            
            // Generar QR usando QRCode.js
            new QRCode(qrContainer, {
                text: data.password,
                width: 256,
                height: 256,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });

            // Agregar la contraseña debajo del QR
            qrContainer.insertAdjacentHTML('afterend', `
                <div class="password-info">
                    <p>Contraseña actual:</p>
                    <code>${data.password}</code>
                </div>
            `);

            // Manejar cierre del modal
            const btnCancelar = modal.querySelector('.btn-cancelar');
            btnCancelar.onclick = () => {
                modal.classList.remove('active');
                qrContainer.innerHTML = ''; // Limpiar QR al cerrar
                // Limpiar también la info de la contraseña
                const passwordInfo = modal.querySelector('.password-info');
                if (passwordInfo) passwordInfo.remove();
            };

        } catch (error) {
            console.error('Error completo:', error);
            qrContainer.innerHTML = `
                <div class="error-message">
                    Error al generar código QR. 
                    Intente de nuevo más tarde.
                </div>
            `;
        }
    }

    async confirmarEliminacion(deviceId) {
        const modal = document.getElementById('modal-eliminar-conexion');
        modal.classList.add('active');
        
        return new Promise((resolve) => {
            const confirmar = modal.querySelector('.btn-confirmar');
            const cancelar = modal.querySelector('.btn-cancelar');
            
            const cleanup = () => {
                modal.classList.remove('active');
                confirmar.removeEventListener('click', handleConfirm);
                cancelar.removeEventListener('click', handleCancel);
            };
            
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            confirmar.addEventListener('click', handleConfirm);
            cancelar.addEventListener('click', handleCancel);
        });
    }

    async eliminarDispositivo(deviceId) {
        try {
            const response = await fetch('/api/devices/invalidate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ deviceId })
            });
            
            if (response.ok) {
                await this.cargarDispositivos(); // Recargar lista
            }
        } catch (error) {
            console.error('Error al eliminar dispositivo:', error);
        }
    }
}

// Inicializar y manejar limpieza
document.addEventListener('DOMContentLoaded', () => {
    const gestor = new GestorKey();
    
    // Limpiar al cambiar de página
    window.addEventListener('beforeunload', () => {
        gestor.destructor();
    });
});

export default GestorKey;
