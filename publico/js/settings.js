import GestorProductos from './web-productos.js';
import GestorTiket from './web-tiket.js';
import GestorKey from './web-key.js';

class GestorSettings {
    constructor() {
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.pages = document.querySelectorAll('.page');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const moduleId = button.dataset.page;
                this.cambiarModulo(moduleId);
            });
        });
    }

    cambiarModulo(moduleId) {
        // Desactivar todos los botones y páginas
        this.navButtons.forEach(btn => btn.classList.remove('active'));
        this.pages.forEach(page => page.classList.remove('active'));

        // Activar el botón y página correspondiente
        const button = document.querySelector(`[data-page="${moduleId}"]`);
        const page = document.getElementById(`${moduleId}-page`);

        if (button && page) {
            button.classList.add('active');
            page.classList.add('active');
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const pages = document.querySelectorAll('.page');
    const navButtons = document.querySelectorAll('.nav-btn');

    // Función para cambiar de página
    function changePage(pageId) {
        // Ocultar todas las páginas
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Desactivar todos los botones
        navButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar la página seleccionada
        const selectedPage = document.getElementById(pageId + '-page');
        if (selectedPage) {
            selectedPage.classList.add('active');
        }

        // Activar el botón correspondiente
        const selectedBtn = document.querySelector(`[data-page="${pageId}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }

        // Actualizar el hash en la URL
        window.location.hash = pageId;
    }

    // Manejar clics en los botones de navegación
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = btn.dataset.page;
            changePage(pageId);
        });
    });

    // Cargar la página según el hash al iniciar o al cambiar el hash
    function loadPageFromHash() {
        const hash = window.location.hash.slice(1) || 'productos';
        changePage(hash);
    }

    // Escuchar cambios en el hash
    window.addEventListener('hashchange', loadPageFromHash);

    // Cargar la página inicial
    loadPageFromHash();
});

// Sistema de notificaciones
class NotificationManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        
        // Agregar listener global para clicks
        document.addEventListener('click', () => {
            // Obtener todas las notificaciones y quitar la clase 'mostrar'
            document.querySelectorAll('.notificacion').forEach(notification => {
                notification.classList.remove('mostrar');
            });
        });
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

        // Obtener la notificación y guardar sus clases originales
        const notification = document.querySelector(`.notificacion.${type}`);
        const baseClasses = ['notificacion', type];
        
        // Resetear a las clases base
        notification.className = baseClasses.join(' ');
        
        const msgElement = notification.querySelector('.mensaje');
        msgElement.textContent = message;

        // Forzar reflow
        notification.offsetHeight;

        // Mostrar notificación
        notification.classList.add('mostrar');

        // Ocultar después de 1.5 segundos
        setTimeout(() => {
            // Quitar solo la clase 'mostrar'
            notification.classList.remove('mostrar');
            
            // Esperar a que termine la transición
            setTimeout(() => this.processQueue(), 300);
        }, 1500);
    }
}

// Crear instancia global
window.notificationManager = new NotificationManager();