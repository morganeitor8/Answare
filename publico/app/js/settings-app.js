class SettingsAppController {
    constructor() {
        this.initElements();
        this.initEvents();
        this.loadInitialPage();
    }

    initElements() {
        // Elementos de navegación
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.pages = document.querySelectorAll('.page');
        this.btnVolver = document.getElementById('btn-volver');
    }

    initEvents() {
        // Eventos de navegación
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const pageId = btn.dataset.page;
                this.cambiarPagina(pageId);
            });
        });

        // Evento para volver
        if (this.btnVolver) {
            this.btnVolver.addEventListener('click', () => {
                window.location.href = '/app';
            });
        }

        // Gestos touch para navegación
        let touchstartX = 0;
        document.addEventListener('touchstart', e => {
            touchstartX = e.touches[0].clientX;
        });

        document.addEventListener('touchend', e => {
            const touchendX = e.changedTouches[0].clientX;
            const diff = touchendX - touchstartX;
            
            if (Math.abs(diff) > 100) { // Mínimo 100px de deslizamiento
                const currentPage = this.getCurrentPage();
                const pages = ['productos', 'remitos', 'key'];
                const currentIndex = pages.indexOf(currentPage);
                
                if (diff > 0 && currentIndex > 0) {
                    // Deslizar a la derecha -> página anterior
                    this.cambiarPagina(pages[currentIndex - 1]);
                } else if (diff < 0 && currentIndex < pages.length - 1) {
                    // Deslizar a la izquierda -> página siguiente
                    this.cambiarPagina(pages[currentIndex + 1]);
                }
            }
        });
    }

    loadInitialPage() {
        // Cargar página desde hash o usar 'productos' por defecto
        const hash = window.location.hash.slice(1) || 'productos';
        this.cambiarPagina(hash);
    }

    cambiarPagina(pageId) {
        // Desactivar todos los botones y páginas
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.pages.forEach(page => page.classList.remove('active'));

        // Activar el botón y página correspondiente
        const button = document.querySelector(`[data-page="${pageId}"]`);
        const page = document.getElementById(`${pageId}-page`);

        if (button && page) {
            button.classList.add('active');
            page.classList.add('active');
            window.location.hash = pageId;
        }
    }

    getCurrentPage() {
        const activePage = document.querySelector('.page.active');
        return activePage ? activePage.id.replace('-page', '') : 'productos';
    }
}

// Sistema de notificaciones
class NotificationManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    addNotification(type, message) {
        this.queue.push({ type, message });
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const { type, message } = this.queue.shift();
        
        // Buscar la notificación correcta
        const notification = document.querySelector(`.notificacion.${type}`);
        if (!notification) {
            console.error('Elemento de notificación no encontrado:', type);
            this.processQueue(); // Continuar con la siguiente
            return;
        }
        
        const mensajeElement = notification.querySelector('.mensaje');
        if (!mensajeElement) {
            console.error('Elemento mensaje no encontrado en la notificación');
            this.processQueue(); // Continuar con la siguiente
            return;
        }

        mensajeElement.textContent = message;
        notification.classList.add('mostrar');

        await new Promise(resolve => setTimeout(resolve, 2000));
        notification.classList.remove('mostrar');
        
        // Esperar a que termine la animación
        await new Promise(resolve => setTimeout(resolve, 300));
        this.processQueue();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.settingsApp = new SettingsAppController();
    window.notificationManager = new NotificationManager();
});

export { SettingsAppController }; 