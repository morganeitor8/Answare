class SportivoApp {
    constructor() {
        this.initializeApp();
        this.setupEventListeners();
    }

    async initializeApp() {
        // Marcar que estamos en modo app
        document.documentElement.classList.add('app-mode');

        // Inicializar módulos principales
        this.modules = {
            productos: await this.loadModule('productos'),
            carrito: await this.loadModule('carrito'),
            remitos: await this.loadModule('remitos')
        };

        // Configurar navegación
        this.setupNavigation();
    }

    async loadModule(moduleName) {
        try {
            // Importar dinámicamente el módulo correspondiente
            const module = await import(`./app-${moduleName}.js`);
            return new module.default();
        } catch (error) {
            console.error(`Error cargando módulo ${moduleName}:`, error);
            return null;
        }
    }

    setupNavigation() {
        // Manejar navegación entre vistas
        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.dataset.view;
                this.navigateTo(view);
            });
        });
    }

    navigateTo(view) {
        // Ocultar todas las vistas
        document.querySelectorAll('.app-view').forEach(v => {
            v.classList.remove('active');
        });

        // Mostrar la vista seleccionada
        const selectedView = document.querySelector(`.app-view[data-view="${view}"]`);
        if (selectedView) {
            selectedView.classList.add('active');
        }
    }

    setupEventListeners() {
        // Manejar eventos de la app
        document.addEventListener('backbutton', this.handleBackButton.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        window.addEventListener('online', this.handleOnline.bind(this));
    }

    handleBackButton(e) {
        // Manejar botón atrás de Android
        e.preventDefault();
        // Implementar lógica de navegación hacia atrás
    }

    handleOffline() {
        // Mostrar mensaje de sin conexión
        this.showMessage('Sin conexión', 'error');
    }

    handleOnline() {
        // Mostrar mensaje de conexión restaurada
        this.showMessage('Conexión restaurada', 'success');
    }

    showMessage(message, type = 'info') {
        // Reutilizar el sistema de notificaciones existente
        if (window.notificationManager) {
            window.notificationManager.addNotification(type, message);
        }
    }
}

// Inicializar la app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SportivoApp();
});

export default SportivoApp; 