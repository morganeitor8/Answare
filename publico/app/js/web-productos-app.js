import { cargarArticulos } from '../../js/productos/articulos.js';
import { GestorImagenesApp } from './gestorimg.js';

class GestorProductosApp {
    constructor() {
        const productosContainer = document.querySelector('.productos-page-container');
        if (!productosContainer) return;
        
        this.productos = [];
        this.productosContainer = productosContainer;
        this.modalEditar = document.getElementById('modal-editar');
        this.modalEliminar = document.getElementById('modal-eliminar');
        this.modalOpciones = document.getElementById('modal-opciones');
        this.modalAgregar = document.getElementById('modal-agregar');
        this._productoSeleccionado = null;
        this.nuevoProducto = null;
        
        this.gestorImagenes = new GestorImagenesApp();
        
        this.init();
        this.bindEvents();
    }

    async init() {
        try {
            await this.cargarProductos();
            this.renderizarProductos();
        } catch (error) {
            console.error('Error en inicialización:', error);
        }
    }

    bindEvents() {
        // Botón agregar
        const btnAgregar = this.productosContainer.querySelector('.btn-agregar');
        btnAgregar?.addEventListener('click', () => this.mostrarModalAgregar());

        // Eventos para modal de edición
        const btnCerrarEditar = this.modalEditar.querySelector('.btn-cerrar');
        const btnCancelarEditar = this.modalEditar.querySelector('.btn-cancelar');
        const btnGuardar = this.modalEditar.querySelector('.btn-guardar');
        
        btnCerrarEditar?.addEventListener('click', () => this.cerrarModalEditar());
        btnCancelarEditar?.addEventListener('click', () => this.cerrarModalEditar());
        btnGuardar?.addEventListener('click', () => this.guardarCambios());

        // Eventos para modal de eliminación
        const btnCerrarEliminar = this.modalEliminar.querySelector('.btn-cerrar');
        const btnCancelarEliminar = this.modalEliminar.querySelector('.btn-cancelar');
        
        btnCerrarEliminar?.addEventListener('click', () => this.cerrarModalEliminar());
        btnCancelarEliminar?.addEventListener('click', () => this.cerrarModalEliminar());

        // Eventos para modal de opciones
        const btnCerrarOpciones = this.modalOpciones.querySelector('.btn-cancelar');
        const btnEditar = this.modalOpciones.querySelector('.opcion-btn:nth-child(1)');
        const btnVisibilidad = this.modalOpciones.querySelector('.opcion-btn:nth-child(2)');
        const btnEliminar = this.modalOpciones.querySelector('.opcion-btn:nth-child(3)');

        btnCerrarOpciones?.addEventListener('click', () => this.cerrarModalOpciones());
        btnEditar?.addEventListener('click', () => this.editarProducto());
        btnVisibilidad?.addEventListener('click', () => this.toggleVisibilidad());
        btnEliminar?.addEventListener('click', () => this.confirmarEliminar());

        // Eventos para modal de agregar
        const btnCerrarAgregar = this.modalAgregar?.querySelector('.btn-cerrar');
        const btnCancelarAgregar = this.modalAgregar?.querySelector('.btn-cancelar');
        const btnCrear = this.modalAgregar?.querySelector('.btn-crear');

        btnCerrarAgregar?.addEventListener('click', () => this.cerrarModalAgregar());
        btnCancelarAgregar?.addEventListener('click', () => this.cerrarModalAgregar());
        btnCrear?.addEventListener('click', () => this.crearNuevoProducto());

        // Cerrar modales al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.cerrarTodosModales();
            }
        });

        // Eventos para imágenes
        const inputImagen = this.modalEditar.querySelector('#add-imagen');
        inputImagen?.addEventListener('change', (e) => this.procesarNuevaImagen(e));
            // Eventos para imágenes en modal agregar
            const inputImagenNuevo = this.modalAgregar?.querySelector('#add-imagen-nuevo');
            if (inputImagenNuevo) {
                inputImagenNuevo.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    try {
                        const resultado = await this.gestorImagenes.procesarNuevaImagen(file, 'temp');
                        const rutaImagen = `assets/productos/${resultado.nombre}`;
                    
                        const imagenesGrid = this.modalAgregar.querySelector('#add-imagenes');
                        if (imagenesGrid) {
                            if (this.nuevoProducto.imagenes[0] === 'assets/not-img.jpg') {
                                imagenesGrid.innerHTML = '';
                            }

                            const nuevoItem = this.gestorImagenes.crearElementoImagen(
                                resultado.base64,
                                rutaImagen,
                                imagenesGrid.children.length,
                                this.modoEliminarActivo,
                                this.modoEliminarActivo ? (index) => this.eliminarImagenNuevo(index) : null
                            );
                            imagenesGrid.appendChild(nuevoItem);
                        }
                    } catch (error) {
                        console.error('Error al procesar imagen:', error);
                        window.notificationManager.addNotification('error', error.message);
                    }
                });
            }
        // Eventos para modo eliminar en modal editar
        const btnModoEliminar = this.modalEditar.querySelector('.btn-modo-eliminar');
        btnModoEliminar?.addEventListener('click', () => this.toggleModoEliminar());

        // Eventos para modo eliminar en modal agregar
        const btnModoEliminarNuevo = this.modalAgregar?.querySelector('.btn-modo-eliminar');
        btnModoEliminarNuevo?.addEventListener('click', () => this.toggleModoEliminarNuevo());
    }

    async cargarProductos() {
        try {
            // Usar API de Cloudinary para obtener lista
            const response = await fetch('/api/cloudinary/lista');
            if (!response.ok) throw new Error('Error al cargar lista');
            
            const lista = await response.json();
            this.productos = await Promise.all(
                lista.map(async archivo => {
                    const resp = await fetch(`/api/cloudinary/producto/${archivo}`);
                    if (!resp.ok) return null;
                    return resp.json();
                })
            );
            
            this.productos = this.productos.filter(p => p !== null);
            this.renderizarProductos();
        } catch (error) {
            console.error('Error al cargar productos:', error);
            this.productos = [];
            this.renderizarProductos();
        }
    }

    renderizarProductos() {
        const grid = this.productosContainer.querySelector('.productos-grid');
        if (!grid) return;

        if (!this.productos.length) {
            grid.innerHTML = '<div class="no-productos">No hay productos disponibles</div>';
            return;
        }

        grid.innerHTML = this.productos.map(producto => {
            const imagenUrl = producto.imagenes[0];
            
            return `
                <div class="producto-card" data-id="${producto.id}">
                    <img src="${imagenUrl}" class="producto-imagen" alt="${producto.nombre}">
                    <div class="producto-info">
                        <div class="producto-detalles">
                            <h3 class="producto-nombre">${producto.nombre}</h3>
                            <p class="producto-precio">$${producto.precio.toLocaleString()}</p>
                        </div>
                        <button class="btn-opciones" onclick="gestorProductosApp.mostrarOpciones('${producto.id}')">
                            ⚙️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    mostrarOpciones(productoId) {
        console.log('ID del producto seleccionado:', productoId);
        this.productoSeleccionado = productoId;
        
        const producto = this.productos.find(p => p.id === productoId);
        console.log('Producto encontrado:', producto);
        
        const btnVisibilidad = this.modalOpciones.querySelector('.opcion-btn:nth-child(2)');
        if (producto && btnVisibilidad) {
            btnVisibilidad.innerHTML = producto.ojo ? '👁️ Ocultar' : '️‍🗨️ Mostrar';
        }

        this.modalOpciones.classList.add('active');
    }

    cerrarModalOpciones() {
        this.modalOpciones.classList.remove('active');
    }

    editarProducto() {
        this.cerrarModalOpciones();
        const producto = this.productos.find(p => p.id === this.productoSeleccionado);
        if (!producto) return;

        // Limpiar imágenes temporales antes de abrir
        this.gestorImagenes.limpiarImagenesTemporales();

        // Configurar el modal con los datos del producto
        const inputNombre = this.modalEditar.querySelector('#edit-nombre');
        const inputPrecio = this.modalEditar.querySelector('#edit-precio');
        const imagenesGrid = this.modalEditar.querySelector('#edit-imagenes');

        if (inputNombre) inputNombre.value = producto.nombre;
        if (inputPrecio) inputPrecio.value = producto.precio;

        // Mostrar imágenes actuales
        if (imagenesGrid) {
            imagenesGrid.innerHTML = producto.imagenes.map((img, index) => `
                <div class="imagen-item" data-index="${index}">
                    <img src="${img}" alt="${producto.nombre}">
                </div>
            `).join('');
        }

        this.modalEditar.classList.add('active');
    }

    async toggleVisibilidad() {
        try {
            if (!this.productoSeleccionado) {
                throw new Error('No hay producto seleccionado');
            }
    
            // Obtener producto actual de Cloudinary
            const response = await fetch(`/api/cloudinary/producto/${this.productoSeleccionado}.json`);
            if (!response.ok) throw new Error('Error al obtener producto');
            
            const producto = await response.json();
            producto.ojo = !producto.ojo;
    
            // Actualizar producto
            const updateResponse = await fetch(`/api/productos/actualizar/${this.productoSeleccionado}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(producto)
            });
    
            if (!updateResponse.ok) throw new Error('Error al actualizar visibilidad');
    
            await this.cargarProductos();
            this.cerrarModalOpciones();
            window.notificationManager.addNotification('exito', 'Visibilidad actualizada');
    
        } catch (error) {
            console.error('Error:', error);
            window.notificationManager.addNotification('error', error.message);
        }
    }

    confirmarEliminar() {
        this.cerrarModalOpciones();
        this.modalEliminar.classList.add('active');

        // Configurar el botón de confirmar eliminación
        const btnConfirmar = this.modalEliminar.querySelector('.btn-confirmar');
        btnConfirmar.onclick = () => this.eliminarProducto();
    }

    async eliminarProducto() {
        try {
            // Eliminar producto usando la API de Cloudinary
            const response = await fetch('/api/productos/eliminar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    archivo: `${this.productoSeleccionado}.json`
                })
            });
    
            if (!response.ok) throw new Error('Error al eliminar producto');
    
            await this.cargarProductos();
            this.modalEliminar.classList.remove('active');
            window.notificationManager.addNotification('exito', 'Producto eliminado correctamente');
    
        } catch (error) {
            console.error('Error al eliminar:', error);
            window.notificationManager.addNotification('error', error.message);
        }
    }
    
    cerrarTodosModales() {
        this.cerrarModalOpciones();
        this.cerrarModalEditar();
        this.cerrarModalEliminar();
        this.cerrarModalAgregar();
        this.gestorImagenes.limpiarImagenesTemporales();
    }

    cerrarModalEditar() {
        this.modalEditar.classList.remove('active');
        this.gestorImagenes.limpiarImagenesTemporales(); // Limpiar imágenes no guardadas
        const inputImagen = this.modalEditar.querySelector('#add-imagen');
        if (inputImagen) inputImagen.value = '';
    }

    cerrarModalEliminar() {
        this.modalEliminar.classList.remove('active');
    }

    async guardarCambios() {
        try {
            const inputNombre = this.modalEditar.querySelector('#edit-nombre');
            const inputPrecio = this.modalEditar.querySelector('#edit-precio');
    
            if (!inputNombre?.value.trim()) {
                throw new Error('El nombre es requerido');
            }
    
            const precio = parseFloat(inputPrecio?.value || '0');
            if (isNaN(precio) || precio <= 0) {
                throw new Error('El precio debe ser mayor a 0');
            }
    
            // Guardar imágenes nuevas en Cloudinary
            const imagenesNuevas = Array.from(this.gestorImagenes.imagenesTemporales.keys())
                .map(nombre => ({ nombre }));
        
            if (imagenesNuevas.length > 0) {
                const urls = await this.gestorImagenes.guardarImagenesFinales(imagenesNuevas);
                
                // Actualizar array de imágenes del producto
                const producto = this.productos.find(p => p.id === this.productoSeleccionado);
                if (producto.imagenes[0] === 'assets/not-img.jpg') {
                    producto.imagenes = urls;
                } else {
                    producto.imagenes.push(...urls);
                }
            }
    
            // Actualizar producto usando la API de Cloudinary
            const producto = this.productos.find(p => p.id === this.productoSeleccionado);
            producto.nombre = inputNombre.value.trim();
            producto.precio = precio;
    
            const response = await fetch(`/api/productos/actualizar/${this.productoSeleccionado}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(producto)
            });
    
            if (!response.ok) throw new Error('Error al guardar cambios');
    
            await this.cargarProductos();
            this.cerrarModalEditar();
            window.notificationManager.addNotification('exito', 'Cambios guardados correctamente');
    
        } catch (error) {
            console.error('Error al guardar:', error);
            window.notificationManager.addNotification('error', error.message);
        }
    }
    async procesarNuevaImagen(event) {
        if (!this.productoSeleccionado) {
            window.notificationManager.addNotification('error', 'Error: No hay producto seleccionado');
            return;
        }
    
        const file = event.target.files[0];
        if (!file) return;
    
        try {
            window.notificationManager.addNotification('exito', 'Procesando imagen...');
    
            // Procesar imagen (solo en memoria)
            const resultado = await this.gestorImagenes.procesarNuevaImagen(file, this.productoSeleccionado);
            
            // Crear ruta temporal
            const rutaImagen = `assets/productos/${resultado.nombre}`;
    
            // Actualizar vista con la imagen temporal
            const imagenesGrid = this.modalEditar.querySelector('#edit-imagenes');
            const nuevoItem = this.gestorImagenes.crearElementoImagen(
                resultado.base64,
                rutaImagen,
                imagenesGrid.children.length,
                this.modoEliminarActivo,
                this.modoEliminarActivo ? (index) => this.eliminarImagen(index) : null
            );
            imagenesGrid.appendChild(nuevoItem);
    
            window.notificationManager.addNotification('exito', 'Imagen procesada correctamente');
    
        } catch (error) {
            console.error('Error al procesar imagen:', error);
            window.notificationManager.addNotification('error', error.message);
        }
    }

    toggleModoEliminar() {
        this.modoEliminarActivo = !this.modoEliminarActivo;
        const btnEliminar = this.modalEditar.querySelector('.btn-modo-eliminar');
        const imagenesItems = this.modalEditar.querySelectorAll('.imagen-item');

        btnEliminar.classList.toggle('active');
        imagenesItems.forEach(item => {
            item.classList.toggle('modo-eliminar', this.modoEliminarActivo);
            if (this.modoEliminarActivo) {
                item.onclick = () => this.eliminarImagen(parseInt(item.dataset.index));
            } else {
                item.onclick = null;
            }
        });
    }

    async eliminarImagen(index) {
        if (!this.productoSeleccionado) return;
    
        try {
            const producto = this.productos.find(p => p.id === this.productoSeleccionado);
            const imagenAEliminar = producto.imagenes[index];
    
            // Eliminar imagen física
            await this.gestorImagenes.eliminarImagenFisica(imagenAEliminar);
    
            // Actualizar array de imágenes
            producto.imagenes.splice(index, 1);
            if (producto.imagenes.length === 0) {
                producto.imagenes = ['assets/not-img.jpg'];
            }
    
            // Actualizar JSON
            await fetch(`/api/productos/actualizar/${this.productoSeleccionado}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(producto)
            });
    
            // Actualizar vista
            const imagenesGrid = this.modalEditar.querySelector('#edit-imagenes');
            imagenesGrid.innerHTML = producto.imagenes.map((img, idx) => `
                <div class="imagen-item ${this.modoEliminarActivo ? 'modo-eliminar' : ''}" 
                    data-index="${idx}">
                    <img src="../../${img}" alt="Imagen ${idx + 1}">
                </div>
            `).join('');
    
            if (this.modoEliminarActivo) {
                imagenesGrid.querySelectorAll('.imagen-item').forEach(item => {
                    item.onclick = () => this.eliminarImagen(parseInt(item.dataset.index));
                });
            }
    
            window.notificationManager.addNotification('exito', 'Imagen eliminada correctamente');
    
        } catch (error) {
            console.error('Error al eliminar imagen:', error);
            window.notificationManager.addNotification('error', error.message);
        }
    }

    mostrarModalAgregar() {
        if (!this.modalAgregar) return;

        // Inicializar nuevo producto
        this.nuevoProducto = {
            id: '',  // Se asignará al crear
            nombre: '',
            precio: 0,
            ojo: true,
            imagenes: ['assets/not-img.jpg']
        };

        // Limpiar y configurar el modal
        const inputNombre = this.modalAgregar.querySelector('#add-nombre');
        const inputPrecio = this.modalAgregar.querySelector('#add-precio');
        const imagenesGrid = this.modalAgregar.querySelector('#add-imagenes');

        if (inputNombre) inputNombre.value = '';
        if (inputPrecio) inputPrecio.value = '';
        if (imagenesGrid) {
            imagenesGrid.innerHTML = `
                <div class="imagen-item" data-index="0">
                    <img src="../../assets/not-img.jpg" alt="Nueva imagen">
                </div>
            `;
        }

        this.modalAgregar.classList.add('active');
    }

    cerrarModalAgregar() {
        if (this.modalAgregar) {
            this.modalAgregar.classList.remove('active');
            this.nuevoProducto = null;
            this.gestorImagenes.limpiarImagenesTemporales();
            const inputImagen = this.modalAgregar.querySelector('#add-imagen-nuevo');
            if (inputImagen) inputImagen.value = '';
        }
    }

    async crearNuevoProducto() {
        try {
            window.notificationManager.addNotification('exito', 'Creando producto...');
    
            const inputNombre = this.modalAgregar.querySelector('#add-nombre');
            const inputPrecio = this.modalAgregar.querySelector('#add-precio');
    
            if (!inputNombre?.value.trim()) {
                throw new Error('El nombre es requerido');
            }
    
            const precio = parseFloat(inputPrecio?.value || '0');
            if (isNaN(precio) || precio <= 0) {
                throw new Error('El precio debe ser mayor a 0');
            }
    
            // Obtener siguiente ID primero
            const ids = this.productos.map(p => parseInt(p.id.substring(1))).filter(id => !isNaN(id));
            const siguienteNumero = ids.length ? Math.max(...ids) + 1 : 1;
            const nuevoId = `A${siguienteNumero}`;
    
            // Renombrar las imágenes temporales con el ID real
            const imagenesTemporales = Array.from(this.gestorImagenes.imagenesTemporales.entries());
            this.gestorImagenes.imagenesTemporales.clear();
    
            for (const [nombreTemp, datos] of imagenesTemporales) {
                const nuevoNombre = nombreTemp.replace('prodtemp', `prod${nuevoId}`);
                this.gestorImagenes.imagenesTemporales.set(nuevoNombre, datos);
            }
    
            // Guardar imágenes físicamente con los nuevos nombres
            const imagenesNuevas = Array.from(this.gestorImagenes.imagenesTemporales.keys())
                .map(nombre => ({ nombre }));
            
            if (imagenesNuevas.length > 0) {
                const urls = await this.gestorImagenes.guardarImagenesFinales(imagenesNuevas);
                this.nuevoProducto.imagenes = urls; // Usar directamente las URLs de Cloudinary
            }
    
            // Crear objeto del nuevo producto
            const nuevoProducto = {
                id: nuevoId,
                nombre: inputNombre.value.trim(),
                precio: precio,
                ojo: true,
                imagenes: this.nuevoProducto.imagenes // Ya contiene las URLs completas
            };
    
            // 1. Actualizar lista.json
            const responseLista = await fetch('/api/cloudinary/lista');
            let listaArchivos = await responseLista.json();
            listaArchivos.push(`${nuevoId}.json`);
            
            await fetch('/api/productos/lista', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lista: listaArchivos
                })
            });
    
            // 2. Crear archivo del nuevo producto
            await fetch(`/api/productos/actualizar/${nuevoId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevoProducto)
            });
    
            await this.cargarProductos();
            this.cerrarModalAgregar();
            window.notificationManager.addNotification('exito', 'Producto creado correctamente');
    
        } catch (error) {
            console.error('Error al crear producto:', error);
            window.notificationManager.addNotification('error', error.message);
        }
    }

    async procesarNuevaImagen(event) {
        if (!this.productoSeleccionado) {
            window.notificationManager.addNotification('error', 'Error: No hay producto seleccionado');
            return;
        }
    
        const file = event.target.files[0];
        if (!file) return;
    
        try {
            window.notificationManager.addNotification('exito', 'Procesando imagen...');
    
            // Procesar imagen (solo en memoria)
            const resultado = await this.gestorImagenes.procesarNuevaImagen(file, this.productoSeleccionado);
            
            // Crear ruta temporal
            const rutaImagen = `assets/productos/${resultado.nombre}`;
    
            // Actualizar vista con la imagen temporal
            const imagenesGrid = this.modalEditar.querySelector('#edit-imagenes');
            const nuevoItem = this.gestorImagenes.crearElementoImagen(
                resultado.base64,
                rutaImagen,
                imagenesGrid.children.length,
                this.modoEliminarActivo,
                this.modoEliminarActivo ? (index) => this.eliminarImagen(index) : null
            );
            imagenesGrid.appendChild(nuevoItem);
    
            window.notificationManager.addNotification('exito', 'Imagen procesada correctamente');
    
        } catch (error) {
            console.error('Error al procesar imagen:', error);
            window.notificationManager.addNotification('error', error.message);
        }
    }

    toggleModoEliminarNuevo() {
        if (!this.modalAgregar) return;

        const btnEliminar = this.modalAgregar.querySelector('.btn-modo-eliminar');
        const imagenesItems = this.modalAgregar.querySelectorAll('.imagen-item');
        
        btnEliminar.classList.toggle('active');
        const modoEliminar = btnEliminar.classList.contains('active');

        imagenesItems.forEach((item, index) => {
            item.classList.toggle('modo-eliminar', modoEliminar);
            if (modoEliminar) {
                item.onclick = () => this.eliminarImagenNuevo(index);
            } else {
                item.onclick = null;
            }
        });
    }

    eliminarImagenNuevo(index) {
        if (!this.nuevoProducto) return;
    
        try {
            const imagenAEliminar = this.nuevoProducto.imagenes[index];
            
            // Eliminar de Cloudinary si no es la imagen por defecto
            if (!imagenAEliminar.includes('not-img.jpg')) {
                fetch('/api/delete-imagen', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ruta: imagenAEliminar })
                });
            }
    
            this.nuevoProducto.imagenes.splice(index, 1);
            if (this.nuevoProducto.imagenes.length === 0) {
                this.nuevoProducto.imagenes = ['assets/not-img.jpg'];
            }
    
            this.actualizarVistaPrevia(this.nuevoProducto.imagenes);
            window.notificationManager.addNotification('exito', 'Imagen eliminada correctamente');
    
        } catch (error) {
            console.error('Error al eliminar imagen:', error);
            window.notificationManager.addNotification('error', error.message);
        }
    }
}

// Hacer la instancia accesible globalmente
window.gestorProductosApp = new GestorProductosApp();

export default GestorProductosApp;