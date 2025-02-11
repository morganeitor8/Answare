import { cargarArticulos, obtenerArticulos } from './productos/articulos.js';

class TiendaManager {
    constructor() {
        console.log('Iniciando TiendaManager');
        this.productos = [];
        this.productosFiltrados = [];
        this.imagenesActuales = new Map();
        this.inicializado = false;
    }

    async inicializar() {
        if (this.inicializado) return;
        
        try {
            // Esperar a que los artículos se carguen
            this.productos = await cargarArticulos();
            this.productosFiltrados = [...this.productos];
            console.log('Productos cargados:', this.productos);
            
            // Inicializar componentes de UI
            this.inicializarBuscador();
            this.inicializarStickyBuscador();
            this.iniciarRotacionImagenes();
            
            this.inicializado = true;
            return true;
        } catch (error) {
            console.error('Error al cargar desde Cloudinary:', error);
            this.productos = [];
        }
    }

    inicializarBuscador() {
        const buscador = document.getElementById('buscador');
        const btnBuscar = document.getElementById('btn-buscar');

        if (buscador && btnBuscar) {
            // Búsqueda en tiempo real
            buscador.addEventListener('input', () => this.buscarProductos(buscador.value));
            
            // Búsqueda al hacer clic en el botón
            btnBuscar.addEventListener('click', () => this.buscarProductos(buscador.value));
            
            // Búsqueda al presionar Enter
            buscador.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.buscarProductos(buscador.value);
                }
            });
        }
    }

    inicializarStickyBuscador() {
        const header = document.querySelector('.hero-section');
        const buscador = document.querySelector('.buscador-container');
        const buscadorOriginalTop = buscador.offsetTop;

        const actualizarPosicionBuscador = () => {
            const scrollY = window.scrollY;
            const headerRect = header.getBoundingClientRect();
            const headerBottom = headerRect.height;

            if (scrollY < headerBottom) {
                // Cuando estamos en la parte superior, el buscador está en su posición original
                buscador.style.position = 'relative';
                buscador.style.top = '0';
            } else {
                // Cuando hacemos scroll, el buscador se vuelve sticky
                buscador.style.position = 'sticky';
                buscador.style.top = '0';
            }
        };

        // Observar cambios en el tamaño del header
        const resizeObserver = new ResizeObserver(actualizarPosicionBuscador);
        resizeObserver.observe(header);

        // Actualizar en scroll
        window.addEventListener('scroll', actualizarPosicionBuscador);
        
        // Actualizar inicialmente
        actualizarPosicionBuscador();
    }

    buscarProductos(termino) {
        termino = termino.toLowerCase().trim();
        
        // Filtrar primero por ojo=true y luego por término de búsqueda
        if (termino === '') {
            this.productosFiltrados = this.productos.filter(producto => producto.ojo === true);
        } else {
            this.productosFiltrados = this.productos.filter(producto => 
                producto.ojo === true && 
                producto.nombre.toLowerCase().includes(termino)
            );
        }

        // Actualizar la vista y mostrar mensaje si no hay resultados
        const productosGrid = document.getElementById('productos-temporada');
        if (this.productosFiltrados.length === 0) {
            productosGrid.innerHTML = `
                <div class="no-resultados">
                    <p>No se encontraron productos que coincidan con "${termino}"</p>
                </div>
            `;
        } else {
            this.actualizarProductosMostrados(1);
        }
    }

    async actualizarInterfaz() {
        const productosGrid = document.getElementById('productos-temporada');
        this.mostrarSkeletonLoading(productosGrid, 35);

        try {
            if (!this.inicializado) {
                await this.inicializar();
            }

            // Actualizar con los productos más recientes y filtrar por ojo
            this.productos = obtenerArticulos();
            // Aplicar filtro de ojo=true
            this.productosFiltrados = this.productos.filter(producto => producto.ojo === true);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            this.actualizarProductosMostrados(1);
        } catch (error) {
            console.error('Error al actualizar la interfaz:', error);
            if (productosGrid) {
                productosGrid.innerHTML = `
                    <div class="error-mensaje">
                        Lo sentimos, hubo un error al cargar los productos.
                    </div>
                `;
            }
        }
    }

    actualizarProductosMostrados(pagina) {
        const productosGrid = document.getElementById('productos-temporada');
        const productosPorPagina = 35;
        const totalPaginas = Math.ceil(this.productosFiltrados.length / productosPorPagina);

        const inicio = (pagina - 1) * productosPorPagina;
        const fin = inicio + productosPorPagina;
        const productosActuales = this.productosFiltrados.slice(inicio, fin);

        productosGrid.innerHTML = productosActuales.map(producto => `
            <div class="producto-card" id="producto-${producto.id}">
                <img src="${producto.imagenes[0]}" alt="${producto.nombre}">
                <div class="producto-info">
                    <h3>${producto.nombre}</h3>
                    <p class="precio">$${producto.precio.toLocaleString('es-AR')}</p>
                </div>
            </div>
        `).join('');

        // Agregar event listeners
        productosActuales.forEach(producto => {
            const productoElement = document.getElementById(`producto-${producto.id}`);
            if (productoElement) {
                productoElement.addEventListener('click', () => {
                    window.carrito.agregarItem(producto);
                });
            }
        });

        this.actualizarPaginacion(pagina, totalPaginas);
    }

    actualizarPaginacion(paginaActual, totalPaginas) {
        const paginacion = document.getElementById('paginacion');
        if (paginacion) {
            paginacion.innerHTML = Array.from({length: totalPaginas}, (_, i) => i + 1)
                .map(num => `
                    <button onclick="tienda.actualizarProductosMostrados(${num})" 
                            class="pagina-btn ${num === paginaActual ? 'activo' : ''}">
                        ${num}
                    </button>
                `).join('');
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
        // Inicializar el índice de imagen actual para cada producto
        this.productos.forEach(producto => {
            if (Array.isArray(producto.imagenes) && producto.imagenes.length > 1) {
                this.imagenesActuales.set(producto.id, 0);
                
                // Establecer un intervalo diferente para cada producto
                setInterval(() => {
                    const indiceActual = this.imagenesActuales.get(producto.id);
                    const siguienteIndice = (indiceActual + 1) % producto.imagenes.length;
                    this.imagenesActuales.set(producto.id, siguienteIndice);
                    
                    // Actualizar la imagen si el producto está visible
                    const imgElement = document.querySelector(`#producto-${producto.id} img`);
                    if (imgElement) {
                        imgElement.src = producto.imagenes[siguienteIndice];
                    }
                }, 60000 + Math.random() * 2000); // 1 minuto ± 1 segundo de variación
            }
        });
    }
}

// Crear la instancia
const tienda = new TiendaManager();

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar tienda
    await tienda.inicializar();
    
    // Esperar a que el carrito esté disponible
    const checkCarrito = setInterval(() => {
        if (window.carrito) {
            clearInterval(checkCarrito);
            console.log('Carrito disponible, actualizando interfaz');
            tienda.actualizarInterfaz();
        }
    }, 100);
});

// Hacer disponible globalmente
window.tienda = tienda;

export { tienda };