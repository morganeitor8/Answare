import { cargarArticulos, obtenerArticulos } from '../../js/productos/articulos.js';

class ProductosAppController {
    constructor() {
        this.productos = [];
        this.productosFiltrados = [];
        this.imagenesActuales = new Map();
        this.inicializado = false;
        this.inicializar();
    }

    async inicializar() {
        if (this.inicializado) return;
        
        try {
            // Cargar artículos
            this.productos = await cargarArticulos();
            this.productosFiltrados = this.productos.filter(p => p.ojo === true);
            
            this.initMobileUI();
            this.initMobileEvents();
            this.iniciarRotacionImagenes();
            
            this.inicializado = true;
            this.mostrarProductos();
            return true;
        } catch (error) {
            console.error('Error al inicializar ProductosApp:', error);
            return false;
        }
    }

    initMobileUI() {
        this.productosGrid = document.getElementById('productos-temporada');
        this.buscador = document.getElementById('buscador');
    }

    initMobileEvents() {
        if (this.buscador) {
            this.buscador.addEventListener('input', () => {
                this.buscarProductos(this.buscador.value);
            });
        }

        // Pull to refresh
        let touchstartY = 0;
        document.addEventListener('touchstart', e => {
            touchstartY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', async e => {
            const touchendY = e.changedTouches[0].clientY;
            const diff = touchendY - touchstartY;
            if (diff > 100 && window.scrollY === 0) {
                await this.actualizarProductos();
            }
        });
    }

    buscarProductos(termino) {
        termino = termino.toLowerCase().trim();
        
        if (termino === '') {
            this.productosFiltrados = this.productos.filter(producto => producto.ojo === true);
        } else {
            this.productosFiltrados = this.productos.filter(producto => 
                producto.ojo === true && 
                producto.nombre.toLowerCase().includes(termino)
            );
        }
        
        this.mostrarProductos();
    }
    mostrarProductos() {
        if (!this.productosGrid) return;

        if (this.productosFiltrados.length === 0) {
            this.productosGrid.innerHTML = `
                <div class="no-resultados">
                    <p>No se encontraron productos</p>
                </div>`;
            return;
        }

        this.productosGrid.innerHTML = this.productosFiltrados
            .map(producto => {
                // Usar directamente la URL de Cloudinary
                const imagenUrl = producto.imagenes && producto.imagenes.length > 0 
                    ? producto.imagenes[0]  // Ya es una URL completa de Cloudinary
                    : '/assets/not-img.jpg';
                
                return `
                    <div class="producto-card" data-id="${producto.id}">
                        <img src="${imagenUrl}" alt="${producto.nombre}">
                        <div class="producto-info">
                            <h3>${producto.nombre}</h3>
                            <p class="precio">${producto.precio.toLocaleString('es-AR')}</p>
                        </div>
                    </div>
                `;
            }).join('');

        // Mantener los eventos touch para las cards
        this.productosGrid.querySelectorAll('.producto-card').forEach(card => {
            card.addEventListener('click', () => {
                const producto = this.productosFiltrados.find(p => p.id === card.dataset.id);
                window.carritoApp.agregarItem(producto);
            });
        });
    }
    async actualizarProductos() {
        this.mostrarSkeletonLoading(this.productosGrid, 6);
        
        try {
            this.productos = obtenerArticulos();
            this.productosFiltrados = this.productos.filter(p => p.ojo === true);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            this.mostrarProductos();
        } catch (error) {
            console.error('Error al actualizar productos:', error);
            this.productosGrid.innerHTML = `
                <div class="error-mensaje">
                    Error al cargar los productos.
                </div>`;
        }
    }

    mostrarSkeletonLoading(contenedor, cantidad) {
        const skeletonHTML = `
            <div class="producto-card skeleton">
                <div class="img"></div>
                <div class="producto-info">
                    <h3></h3>
                    <p class="precio"></p>
                </div>
            </div>
        `;
        contenedor.innerHTML = Array(cantidad).fill(skeletonHTML).join('');
    }

    iniciarRotacionImagenes() {
        this.productos.forEach(producto => {
            if (Array.isArray(producto.imagenes) && producto.imagenes.length > 1) {
                this.imagenesActuales.set(producto.id, 0);
                
                setInterval(() => {
                    const indiceActual = this.imagenesActuales.get(producto.id);
                    const siguienteIndice = (indiceActual + 1) % producto.imagenes.length;
                    this.imagenesActuales.set(producto.id, siguienteIndice);
                    
                    const imgElement = document.querySelector(`#producto-${producto.id} img`);
                    if (imgElement) {
                        imgElement.src = `/${producto.imagenes[siguienteIndice]}`;
                    }
                }, 60000 + Math.random() * 2000);
            }
        });
    }
}

// Exportar la instancia
const productosApp = new ProductosAppController();
window.productosApp = productosApp;

export { productosApp }; 