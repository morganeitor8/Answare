class AppUIController {
    constructor() {
        this.initElements();
        this.initEvents();
        this.carritoVisible = false;
        this.configVisible = false;
    }

    initElements() {
        // Elementos del carrito
        this.carritoPanel = document.getElementById('carrito-panel');
        this.carritoMinimizado = document.getElementById('carrito-minimizado');
        this.btnAbrirCarrito = document.getElementById('btn-abrir-carrito');
        this.btnCerrarCarrito = document.getElementById('btn-cerrar-carrito');
        this.btnFinalizarCompra = document.getElementById('finalizar-compra');
        
        // Elementos de productos
        this.productosGrid = document.getElementById('productos-temporada');
        this.buscador = document.getElementById('buscador');
        
        // Nuevos elementos de configuración
        this.btnConfig = document.getElementById('btn-config');
        this.configModal = document.getElementById('config-modal');
        this.modalOverlay = document.getElementById('modal-overlay');
        this.btnCerrarConfig = document.getElementById('btn-cerrar-config');
    }

    initEvents() {
        // Eventos del carrito
        if (this.btnAbrirCarrito) {
            this.btnAbrirCarrito.addEventListener('click', () => this.mostrarCarrito());
        }
        
        if (this.btnCerrarCarrito) {
            this.btnCerrarCarrito.addEventListener('click', () => this.ocultarCarrito());
        }

        // Gestos touch para el carrito
        let touchstartY = 0;
        let touchstartX = 0;

        this.carritoPanel.addEventListener('touchstart', (e) => {
            touchstartY = e.touches[0].clientY;
            touchstartX = e.touches[0].clientX;
        });

        this.carritoPanel.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const currentX = e.touches[0].clientX;
            const diffY = currentY - touchstartY;
            const diffX = currentX - touchstartX;

            // Si el deslizamiento es más horizontal que vertical
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 50) { // Deslizamiento a la derecha
                    this.ocultarCarrito();
                }
            }
        });

        // Actualizar UI cuando cambia el scroll
        window.addEventListener('scroll', () => this.handleScroll());

        // Eventos de configuración
        if (this.btnConfig) {
            this.btnConfig.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleConfigModal();
            });
        }

        // Cerrar modal al hacer clic en el overlay
        this.modalOverlay.addEventListener('click', () => {
            this.ocultarConfigModal();
        });

        // Evento para cerrar el modal con el botón X
        if (this.btnCerrarConfig) {
            this.btnCerrarConfig.addEventListener('click', () => this.ocultarConfigModal());
        }
    }

    mostrarCarrito() {
        this.carritoVisible = true;
        this.carritoPanel.classList.add('visible');
        this.carritoMinimizado.classList.add('oculto');
        document.body.classList.add('carrito-abierto');
    }

    ocultarCarrito() {
        this.carritoVisible = false;
        this.carritoPanel.classList.remove('visible');
        this.carritoMinimizado.classList.remove('oculto');
        document.body.classList.remove('carrito-abierto');
    }

    handleScroll() {
        const scrollY = window.scrollY;
        
        // Ajustar posición del carrito minimizado
        if (scrollY > 100) {
            this.carritoMinimizado.classList.add('floating');
        } else {
            this.carritoMinimizado.classList.remove('floating');
        }
    }

    toggleConfigModal() {
        if (this.configVisible) {
            this.ocultarConfigModal();
        } else {
            this.mostrarConfigModal();
        }
    }

    mostrarConfigModal() {
        this.configVisible = true;
        this.configModal.style.display = 'block';
        this.modalOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevenir scroll
        
        setTimeout(() => {
            this.configModal.classList.add('visible');
            this.modalOverlay.classList.add('visible');
        }, 10);
    }

    ocultarConfigModal() {
        this.configVisible = false;
        this.configModal.classList.remove('visible');
        this.modalOverlay.classList.remove('visible');
        
        setTimeout(() => {
            this.configModal.style.display = 'none';
            this.modalOverlay.style.display = 'none';
            document.body.style.overflow = ''; // Restaurar scroll
        }, 300);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const appUI = new AppUIController();
    window.appUI = appUI;
});

export { AppUIController }; 