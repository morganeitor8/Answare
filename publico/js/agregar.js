class AdminProductos {
    constructor() {
        this.modalPrincipal = document.getElementById('modal-admin');
        this.subModal = document.getElementById('submodal-editar');
        this.btnAdmin = document.querySelector('.admin-card');
        this.btnAgregar = document.querySelector('.btn-agregar');
        this.btnCerrarPrincipal = this.modalPrincipal.querySelector('.modal-close');
        this.btnCerrarSub = this.subModal.querySelector('.modal-close');
        
        this.inicializarEventos();
        this.cargarProductos();
    }

    inicializarEventos() {
        // Abrir modal principal
        this.btnAdmin.addEventListener('click', () => this.abrirModalPrincipal());

        // Cerrar modal principal
        this.btnCerrarPrincipal.addEventListener('click', () => this.cerrarModalPrincipal());

        // Abrir sub-modal y cerrar principal
        this.btnAgregar.addEventListener('click', () => {
            this.cerrarModalPrincipal();
            this.abrirSubModal();
        });

        // Cerrar sub-modal y abrir principal
        this.btnCerrarSub.addEventListener('click', () => {
            this.cerrarSubModal();
            this.abrirModalPrincipal();
        });

        // Cerrar al hacer click fuera
        window.addEventListener('click', (e) => {
            if (e.target === this.modalPrincipal) {
                this.cerrarModalPrincipal();
            }
            if (e.target === this.subModal) {
                this.cerrarSubModal();
                this.abrirModalPrincipal();
            }
        });
    }

    abrirModalPrincipal() {
        this.modalPrincipal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    cerrarModalPrincipal() {
        this.modalPrincipal.classList.remove('active');
        document.body.style.overflow = '';
    }

    abrirSubModal() {
        this.subModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    cerrarSubModal() {
        this.subModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Método para agregar un nuevo producto
    agregarProducto(producto) {
        console.log('Agregando producto:', producto);
    }

    // Método para ocultar un producto
    ocultarProducto(id) {
        console.log('Ocultando producto:', id);
    }

    // Método para eliminar un producto
    eliminarProducto(id) {
        console.log('Eliminando producto:', id);
    }

    async cargarProductos() {
        try {
            const productosLista = this.modalPrincipal.querySelector('.productos-lista');
            
            // Importar los productos desde articulos.js
            const response = await fetch('js/articulos.js');
            const texto = await response.text();
            
            // Extraer el array de productos del texto del archivo
            const match = texto.match(/const productos\s*=\s*(\[[\s\S]*?\]);/);
            if (!match) {
                throw new Error('No se pudo encontrar el array de productos');
            }

            // Evaluar el array de productos de forma segura
            const productos = eval(match[1]);
            
            if (productos.length === 0) {
                productosLista.innerHTML = '<p class="no-productos">No hay productos disponibles</p>';
                return;
            }

            productosLista.innerHTML = productos.map(producto => `
                <div class="producto-item" data-id="${producto.id}">
                    <div class="producto-imagen">
                        <img src="${producto.imagenes[0]}" alt="${producto.nombre}">
                    </div>
                    <div class="producto-nombre">${producto.nombre}</div>
                    <div class="producto-precio">$${producto.precio.toLocaleString('es-AR')}</div>
                    <div class="producto-acciones">
                        <button class="btn-editar" title="Editar">✏️</button>
                        <button class="btn-vista" title="Ver">👁️</button>
                        <button class="btn-eliminar" title="Eliminar">🗑️</button>
                    </div>
                </div>
            `).join('');

            this.inicializarBotonesProductos();

        } catch (error) {
            console.error('Error al cargar productos:', error);
            const productosLista = this.modalPrincipal.querySelector('.productos-lista');
            productosLista.innerHTML = '<p class="error-mensaje">Error al cargar los productos</p>';
        }
    }

    async guardarCambios(productos) {
        try {
            const contenido = `const productos = ${JSON.stringify(productos, null, 2)};

export default productos;`;

            const response = await fetch('/guardar-articulos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contenido })
            });

            if (!response.ok) {
                throw new Error('Error al guardar los cambios');
            }

            return true;
        } catch (error) {
            console.error('Error al guardar cambios:', error);
            return false;
        }
    }

    async subirImagen(file) {
        try {
            const formData = new FormData();
            formData.append('imagen', file);

            const response = await fetch('/subir-imagen', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Error al subir la imagen');
            }

            const data = await response.json();
            return data.ruta; // Retorna la ruta donde se guardó la imagen
        } catch (error) {
            console.error('Error al subir imagen:', error);
            throw error;
        }
    }

    inicializarBotonesProductos() {
        const btnsEditar = this.modalPrincipal.querySelectorAll('.btn-editar');
        const btnsVista = this.modalPrincipal.querySelectorAll('.btn-vista');
        const btnsEliminar = this.modalPrincipal.querySelectorAll('.btn-eliminar');

        btnsEditar.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productoId = e.target.closest('.producto-item').dataset.id;
                this.editarProducto(productoId);
            });
        });

        btnsVista.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productoId = e.target.closest('.producto-item').dataset.id;
                this.verProducto(productoId);
            });
        });

        btnsEliminar.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productoId = e.target.closest('.producto-item').dataset.id;
                this.eliminarProducto(productoId);
            });
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.adminProductos = new AdminProductos();
}); 