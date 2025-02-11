import { cargarArticulos } from './productos/articulos.js';
import { GestorImagenes } from './web1-setting/gestorimagenes.js';

class GestorProductos {
    constructor() {
        // Verificar que estamos en la página de productos
        const productosContainer = document.querySelector('.productos-page-container');
        if (!productosContainer) return;
        
        // Hacer la instancia accesible globalmente
        window.gestorProductos = this;
        
        // Inicializar propiedades
        this.productos = [];
        this.tablaProductos = productosContainer.querySelector('#productos-tbody');
        this.modalEditar = productosContainer.querySelector('#modal-editar');
        this.modalEliminar = productosContainer.querySelector('#modal-eliminar');
        this.modalAgregar = productosContainer.querySelector('#modal-agregar');
        this.productoEnEdicion = null;
        this.nuevoProducto = null;
        this.modoEliminarActivo = false;
        this.gestorImagenes = new GestorImagenes();
        
        this.init();
        this.bindEvents();
    }

    bindEvents() {
        this.procesarNuevaImagen = this.procesarNuevaImagen.bind(this);
    }

    async init() {
        try {
            await this.cargarProductos();
            this.initEventListeners();
        } catch (error) {
            console.error('Error al inicializar:', error);
        }
    }

    initEventListeners() {
        // Cerrar menús cuando se hace clic fuera
        document.addEventListener('click', (e) => {
            // Si el clic no fue en un botón de engranaje
            if (!e.target.matches('.btn-accion')) {
                // Cerrar todos los menús
                document.querySelectorAll('.menu-opciones.activo').forEach(menu => {
                    menu.classList.remove('activo');
                });
            } else {
                // Si se hizo clic en un botón de engranaje
                const clickedMenu = e.target.nextElementSibling;
                
                // Primero cerrar el menú si ya está abierto
                if (clickedMenu.classList.contains('activo')) {
                    clickedMenu.classList.remove('activo');
                } else {
                    // Cerrar todos los otros menús antes de abrir el nuevo
                    document.querySelectorAll('.menu-opciones.activo').forEach(menu => {
                        menu.classList.remove('activo');
                    });
                    
                    // Abrir el nuevo menú
                    clickedMenu.classList.add('activo');
                }
                
                // Prevenir que el clic se propague
                e.stopPropagation();
            }
        });

        // Eventos del modal de edición
        if (this.modalEditar) {
            const btnEliminarImagen = this.modalEditar.querySelector('.btn-modo-eliminar');
            const inputImagen = this.modalEditar.querySelector('#add-imagen');
            const btnCancelar = this.modalEditar.querySelector('.btn-cancelar');
            const btnGuardar = this.modalEditar.querySelector('.btn-guardar');

            btnEliminarImagen?.addEventListener('click', () => this.toggleModoEliminar());
            inputImagen?.addEventListener('change', this.procesarNuevaImagen);
            btnCancelar?.addEventListener('click', () => this.cerrarModal());
            btnGuardar?.addEventListener('click', () => this.guardarCambios());
        }

        // Eventos del modal de eliminar
        if (this.modalEliminar) {
            const btnCancelar = this.modalEliminar.querySelector('.btn-cancelar');
            btnCancelar?.addEventListener('click', () => this.cerrarModal('eliminar'));
        }

        // Evento para el botón de agregar producto
        const btnAgregar = document.querySelector('.btn-agregar');
        btnAgregar?.addEventListener('click', () => this.abrirModalAgregar());

        // Eventos del modal de agregar
        if (this.modalAgregar) {
            const btnEliminarImagen = this.modalAgregar.querySelector('.btn-modo-eliminar');
            const inputImagen = this.modalAgregar.querySelector('#add-imagen-nuevo');
            const btnCancelar = this.modalAgregar.querySelector('.btn-cancelar');
            const btnCrear = this.modalAgregar.querySelector('.btn-crear');

            btnEliminarImagen?.addEventListener('click', () => this.toggleModoEliminarNuevo());
            inputImagen?.addEventListener('change', (e) => this.procesarNuevaImagenProducto(e));
            btnCancelar?.addEventListener('click', () => this.cerrarModalAgregar());
            btnCrear?.addEventListener('click', () => this.crearNuevoProducto());
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
                item.onclick = () => this.eliminarImagen(item.dataset.index);
            } else {
                item.onclick = null;
            }
        });
    }

    async procesarNuevaImagen(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            this.mostrarPantallaCarga('Procesando imagen...');

            // Validar el archivo
            if (!file.type.startsWith('image/')) {
                throw new Error('El archivo debe ser una imagen');
            }

            // Crear vista previa local
            const previewUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });

            // Guardar el archivo para subirlo después
            if (!this.productoEnEdicion.imagenesParaSubir) {
                this.productoEnEdicion.imagenesParaSubir = [];
            }

            this.productoEnEdicion.imagenesParaSubir.push({
                file: file,
                preview: previewUrl
            });

            // Actualizar vista previa
            if (!this.productoEnEdicion.imagenes) {
                this.productoEnEdicion.imagenes = [];
            }

            if (this.productoEnEdicion.imagenes[0] === 'assets/not-img.jpg') {
                this.productoEnEdicion.imagenes = [previewUrl];
            } else {
                this.productoEnEdicion.imagenes.push(previewUrl);
            }

            // Actualizar grid de imágenes
            const imagenesGrid = this.modalEditar.querySelector('#edit-imagenes');
            if (imagenesGrid) {
                imagenesGrid.innerHTML = this.productoEnEdicion.imagenes.map((img, index) => `
                    <div class="imagen-item" data-index="${index}">
                        <img src="${img}" alt="Imagen ${index + 1}">
                    </div>
                `).join('');
            }
            
            this.mostrarMensajeExito('Imagen procesada correctamente');
        } catch (error) {
            console.error('Error al procesar imagen:', error);
            this.mostrarMensajeError('Error al procesar imagen: ' + error.message);
        } finally {
            this.ocultarPantallaCarga();
            event.target.value = '';
        }
    }

    agregarImagenAlGrid(base64Url, nombreImagen) {
        const imagenesGrid = this.modalEditar.querySelector('#edit-imagenes');
        if (!imagenesGrid) return;

        const nuevoIndex = imagenesGrid.children.length;
        const nuevoItem = this.gestorImagenes.crearElementoImagen(
            base64Url,
            nombreImagen,
            nuevoIndex,
            this.modoEliminarActivo,
            this.modoEliminarActivo ? (index) => this.eliminarImagen(index) : null
        );
        
        imagenesGrid.appendChild(nuevoItem);
    }

    async eliminarImagen(index) {
        if (!this.productoEnEdicion) return;
    
        try {
            const imagenAEliminar = this.productoEnEdicion.imagenes[index];
            
            // Agregar la imagen a la lista temporal de eliminadas
            if (!this.imagenesEliminadasTemporalmente) {
                this.imagenesEliminadasTemporalmente = [];
            }
            this.imagenesEliminadasTemporalmente.push(imagenAEliminar);
    
            // Solo actualizar el array si la eliminación fue exitosa
            this.productoEnEdicion.imagenes.splice(index, 1);
            if (this.productoEnEdicion.imagenes.length === 0) {
                this.productoEnEdicion.imagenes = ['assets/not-img.jpg'];
            }
    
            // Actualizar grid de imágenes
            try {
                this.actualizarGridImagenes();
            } catch (gridError) {
                console.warn('Error al actualizar el grid de imágenes:', gridError);
            }
            
            this.mostrarMensajeExito('Imagen eliminada correctamente');
        } catch (error) {
            console.error('Error al eliminar imagen:', error);
            this.mostrarMensajeError('Error al eliminar imagen: ' + error.message);
        } finally {
            this.ocultarPantallaCarga();
        }
    }    


    abrirModalEdicion(productoId) {
        const producto = this.productos.find(p => p.id === productoId);
        if (!producto || !this.modalEditar) {
            console.error('Producto no encontrado o modal no disponible');
            return;
        }

        // Clonar el producto de manera segura
        this.productoEnEdicion = JSON.parse(JSON.stringify(producto));
        
        // Verificación adicional
        if (!this.productoEnEdicion || !this.productoEnEdicion.id) {
            console.error('Error al clonar el producto');
            return;
        }

        console.log('Modal abierto para producto:', this.productoEnEdicion.id);
        console.log('Estado completo del productoEnEdicion:', this.productoEnEdicion);

        // Configurar el modal con los datos del producto
        const imagenPrincipal = this.modalEditar.querySelector('#edit-imagen-principal');
        const titulo = this.modalEditar.querySelector('#edit-titulo-actual');
        const inputNombre = this.modalEditar.querySelector('#edit-nombre');
        const inputPrecio = this.modalEditar.querySelector('#edit-precio');
        const imagenesGrid = this.modalEditar.querySelector('#edit-imagenes');

        if (imagenPrincipal) imagenPrincipal.src = producto.imagenes[0] || '';
        if (titulo) titulo.textContent = producto.nombre;
        if (inputNombre) inputNombre.value = producto.nombre;
        if (inputPrecio) inputPrecio.value = producto.precio;
        
        if (imagenesGrid) {
            imagenesGrid.innerHTML = producto.imagenes.map((img, index) => `
                <div class="imagen-item" data-index="${index}">
                    <img src="${img}" alt="${producto.nombre}">
                </div>
            `).join('');
        }

        this.modalEditar.classList.add('active');
    }

    async cargarProductos() {
        try {
            this.productos = await cargarArticulos();
            
            // Solo verificamos que sea un array
            if (!Array.isArray(this.productos)) {
                console.error('Los productos cargados no son un array:', this.productos);
                this.productos = [];
            }

            this.mostrarProductos();
        } catch (error) {
            console.error('Error al cargar productos:', error);
            this.productos = [];
            this.mostrarProductos();
        }
    }

    mostrarProductos() {
        if (!this.tablaProductos) return;

        const filas = this.productos.map(producto => {
            if (!producto || !producto.id) return '';
            
            return `
                <tr class="producto-fila">
                    <td class="producto-imagen">
                        <img src="${producto.imagenes[0]}" alt="${producto.nombre}">
                    </td>
                    <td class="producto-nombre">${producto.nombre}</td>
                    <td class="producto-precio">$${producto.precio.toLocaleString()}</td>
                    <td class="producto-acciones">
                        <div class="menu-container">
                            <button class="btn-accion" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('activo')">⚙️</button>
                            <div class="menu-opciones">
                                <button onclick="gestorProductos.abrirModalEdicion('${producto.id}')">
                                    ✏️ Editar
                                </button>
                                <button onclick="gestorProductos.toggleVisibilidad('${producto.id}')">
                                    ${producto.ojo ? '👁️ Visible' : '👁️‍🗨️ Oculto'}
                                </button>
                                <button onclick="gestorProductos.mostrarModalConfirmacion('${producto.id}')">
                                    🗑️ Borrar
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).filter(fila => fila).join('');

        this.tablaProductos.innerHTML = filas || '<tr><td colspan="4">No hay productos disponibles</td></tr>';
    }

    cerrarModal() {
        if (this.modalEditar) {
            console.log('Cerrando modal, estado actual del productoEnEdicion:', this.productoEnEdicion);
            
            this.modalEditar.classList.remove('active');
            this.modoEliminarActivo = false;
            
            const inputImagen = this.modalEditar.querySelector('#add-imagen');
            if (inputImagen) inputImagen.value = '';
        }
    }

    async guardarCambios() {
        try {
            this.mostrarPantallaCarga('Guardando cambios...');

            // 1. Subir nuevas imágenes si existen
            const nuevasUrls = [];
            if (this.productoEnEdicion.imagenesParaSubir) {
                for (const imagen of this.productoEnEdicion.imagenesParaSubir) {
                    const formData = new FormData();
                    formData.append('imagen', imagen.file);
                    formData.append('nombre', `prod_${Date.now()}_${imagen.file.name}`);

                    const response = await fetch('/api/upload-imagen', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error('Error al subir imagen');
                    }

                    const data = await response.json();
                    nuevasUrls.push(data.url);
                }
            }

            // 2. Eliminar las imágenes de Cloudinary
            if (this.imagenesEliminadasTemporalmente) {
                for (const imagen of this.imagenesEliminadasTemporalmente) {
                    try {
                        const urlParts = imagen.split('/upload/');
                        if (urlParts.length > 1) {
                            const publicId = urlParts[1].split('.')[0];
                            
                            const response = await fetch('/api/delete-imagen', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ruta: imagen, publicId: publicId })
                            });

                            if (!response.ok) {
                                throw new Error('Error al eliminar imagen de Cloudinary');
                            }
                        }
                    } catch (error) {
                        console.error('Error al eliminar imagen:', error);
                    }
                }
            }

            // 3. Actualizar el producto con los nuevos datos
            const nombreInput = this.modalEditar.querySelector('#edit-nombre');
            const precioInput = this.modalEditar.querySelector('#edit-precio');
            
            if (!nombreInput.value.trim()) {
                throw new Error('El nombre del producto es obligatorio');
            }

            if (!precioInput.value || isNaN(precioInput.value)) {
                throw new Error('El precio debe ser un número válido');
            }

            const productoActualizado = {
                ...this.productoEnEdicion,
                nombre: nombreInput.value.trim(),
                precio: Number(precioInput.value),
                imagenes: [...this.productoEnEdicion.imagenes.filter(img => img.includes('cloudinary.com')), ...nuevasUrls]
            };

            // 4. Guardar cambios en el servidor
            const updateResponse = await fetch(`/api/productos/actualizar/${productoActualizado.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productoActualizado)
            });

            if (!updateResponse.ok) {
                throw new Error('Error al guardar cambios');
            }

            this.mostrarMensajeExito('Cambios guardados correctamente');
            this.cerrarModal();
            window.location.reload();
        } catch (error) {
            console.error('Error al guardar:', error);
            this.mostrarMensajeError('Error al guardar: ' + error.message);
        } finally {
            this.ocultarPantallaCarga();
        }
    }

    mostrarPantallaCarga(mensaje) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>${mensaje}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    ocultarPantallaCarga() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) overlay.remove();
    }

    mostrarMensajeError(mensaje) {
        const notificacion = document.getElementById('notificacion-error');
        notificacion.querySelector('.mensaje').textContent = mensaje;
        notificacion.classList.add('mostrar');
    }

    mostrarMensajeExito(mensaje) {
        const notificacion = document.getElementById('notificacion-exito');
        notificacion.querySelector('.mensaje').textContent = mensaje;
        notificacion.classList.add('mostrar');
    }

    async toggleVisibilidad(id) {
        try {
            this.mostrarPantallaCarga('Actualizando visibilidad...');
            
            // 1. Obtener el producto actual
            const response = await fetch(`/api/cloudinary/producto/${id}.json`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error al obtener producto');
            }
            const producto = await response.json();
            
            // 2. Invertir el estado y actualizar
            const productoActualizado = {
                ...producto,
                ojo: !producto.ojo
            };
            
            const updateResponse = await fetch(`/api/productos/actualizar/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productoActualizado)
            });

            if (!updateResponse.ok) {
                const error = await updateResponse.json();
                throw new Error(error.message || 'Error al actualizar visibilidad');
            }

            this.mostrarMensajeExito('Visibilidad actualizada');
            // Recargar la página
            window.location.reload();
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensajeError(error.message);
        } finally {
            this.ocultarPantallaCarga();
        }
    }

    // Actualizar el método que crea los botones para incluir el evento
    crearBotonesAcciones(id) {
        const contenedor = document.createElement('div');
        contenedor.className = 'acciones';

        // ... otros botones ...

        // Botón de visibilidad
        const botonVisibilidad = document.createElement('button');
        botonVisibilidad.className = 'boton-ojo';
        botonVisibilidad.onclick = () => this.toggleVisibilidad(id);

        contenedor.appendChild(botonVisibilidad);
        // ... agregar otros botones ...

        return contenedor;
    }

    // Agregar método para eliminar producto
    async eliminarProducto(id) {
        try {
            this.mostrarPantallaCarga('Eliminando producto...');
            
            // 1. Obtener la lista actual primero
            const listaResponse = await fetch('/api/cloudinary/lista');
            const listaActual = await listaResponse.json();
            
            // 2. Actualizar lista.json primero (antes de eliminar el archivo)
            const nuevaLista = listaActual.filter(archivo => !archivo.includes(id));
            await fetch('/api/productos/lista', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lista: nuevaLista })
            });

            // 3. Eliminar el archivo JSON de Cloudinary
            const deleteResponse = await fetch('/api/productos/eliminar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archivo: `${id}.json` })
            });

            if (!deleteResponse.ok) {
                const error = await deleteResponse.json();
                throw new Error(error.message || 'Error al eliminar producto');
            }

            this.mostrarMensajeExito('Producto eliminado correctamente');
            window.location.reload();
        } catch (error) {
            this.mostrarMensajeError('Error al eliminar: ' + error.message);
        } finally {
            this.ocultarPantallaCarga();
        }
    }

    // Método para mostrar el modal de confirmación
    mostrarModalConfirmacion(id) {
        if (this.modalEliminar) {
            // Si ya existe el modal de confirmación, lo usamos
            const btnConfirmar = this.modalEliminar.querySelector('.btn-confirmar');
            if (btnConfirmar) {
                // Removemos listeners anteriores
                const nuevoBtn = btnConfirmar.cloneNode(true);
                btnConfirmar.parentNode.replaceChild(nuevoBtn, btnConfirmar);
                // Agregamos el nuevo listener
                nuevoBtn.addEventListener('click', () => this.eliminarProducto(id));
            }
            this.modalEliminar.classList.add('active');
        } else {
            // Si no existe, creamos uno nuevo
            const modal = document.createElement('div');
            modal.className = 'modal-confirmacion';
            modal.innerHTML = `
                <div class="modal-contenido">
                    <h2>Confirmar Eliminación</h2>
                    <p>¿Estás seguro de que deseas eliminar este producto?</p>
                    <div class="botones-confirmacion">
                        <button class="btn-confirmar">Sí, eliminar</button>
                        <button class="btn-cancelar" onclick="this.closest('.modal-confirmacion').remove()">Cancelar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const btnConfirmar = modal.querySelector('.btn-confirmar');
            btnConfirmar?.addEventListener('click', () => {
                this.eliminarProducto(id);
                modal.remove();
            });
        }
    }

    cerrarModalConfirmacion() {
        const modalConfirmacion = document.querySelector('.modal-confirmacion');
        if (modalConfirmacion) {
            modalConfirmacion.remove();
        }
        if (this.modalEliminar) {
            this.modalEliminar.classList.remove('active');
        }
    }

    // Métodos nuevos para manejar la creación de productos
    async obtenerSiguienteId() {
        try {
            // Obtener la lista actual
            const response = await fetch('/api/cloudinary/lista');
            const lista = await response.json();
            
            // Extraer números de los IDs existentes
            const ids = lista
                .map(archivo => {
                    const match = archivo.match(/A(\d+)\.json/);
                    return match ? parseInt(match[1]) : 0;
                })
                .filter(id => !isNaN(id));
            
            if (ids.length === 0) return 'A1';

            // Encontrar el primer número faltante
            ids.sort((a, b) => a - b);
            let siguienteNumero = 1;
            
            for (const id of ids) {
                if (id === siguienteNumero) {
                    siguienteNumero++;
                } else if (id > siguienteNumero) {
                    break;
                }
            }

            return `A${siguienteNumero}`;
        } catch (error) {
            console.error('Error al obtener siguiente ID:', error);
            return 'A1'; // ID por defecto si hay error
        }
    }

    abrirModalAgregar() {
        if (!this.modalAgregar) return;

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
        if (imagenesGrid) imagenesGrid.innerHTML = `
            <div class="imagen-item" data-index="0">
                <img src="assets/not-img.jpg" alt="Nueva imagen">
            </div>
        `;

        this.modalAgregar.classList.add('active');
    }

    cerrarModalAgregar() {
        if (this.modalAgregar) {
            this.modalAgregar.classList.remove('active');
            this.nuevoProducto = null;
            const inputImagen = this.modalAgregar.querySelector('#add-imagen-nuevo');
            if (inputImagen) inputImagen.value = '';
        }
    }

    async crearNuevoProducto() {
        try {
            this.mostrarPantallaCarga('Creando nuevo producto...');

            // 1. Obtener y validar los datos del formulario
            const nombreInput = this.modalAgregar.querySelector('#add-nombre');
            const precioInput = this.modalAgregar.querySelector('#add-precio');
            
            if (!nombreInput.value.trim()) {
                throw new Error('El nombre del producto es obligatorio');
            }

            if (!precioInput.value || isNaN(precioInput.value)) {
                throw new Error('El precio debe ser un número válido');
            }

            // 2. Obtener siguiente ID
            const nuevoId = await this.obtenerSiguienteId();
            
            // 3. Crear el producto con los datos validados
            const productoFinal = {
                id: nuevoId,
                nombre: nombreInput.value.trim(),
                precio: Number(precioInput.value),
                imagenes: this.nuevoProducto?.imagenes || ['assets/not-img.jpg'],
                ojo: true
            };

            console.log('Creando producto:', productoFinal); // Debug

            // 4. Guardar el producto
            const createResponse = await fetch(`/api/productos/actualizar/${nuevoId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productoFinal)
            });

            if (!createResponse.ok) {
                const error = await createResponse.json();
                throw new Error(error.details || 'Error al crear producto');
            }

            this.mostrarMensajeExito('Producto creado correctamente');
            this.cerrarModalAgregar();
            window.location.reload();
        } catch (error) {
            console.error('Error al crear producto:', error);
            this.mostrarMensajeError('Error al crear: ' + error.message);
        } finally {
            this.ocultarPantallaCarga();
        }
    }

    // Método para procesar imágenes del nuevo producto
    async procesarNuevaImagenProducto(event) {
        if (!this.nuevoProducto) {
            this.nuevoProducto = {
                imagenes: []
            };
        }

        const file = event.target.files[0];
        if (!file) return;

        try {
            this.mostrarPantallaCarga('Procesando imagen...');

            // Validar el archivo
            if (!file.type.startsWith('image/')) {
                throw new Error('El archivo debe ser una imagen');
            }

            // Crear FormData
            const formData = new FormData();
            formData.append('imagen', file);
            formData.append('nombre', `prod_${Date.now()}_${file.name}`);

            // Subir imagen
            const response = await fetch('/api/upload-imagen', {
                method: 'POST',
                body: formData // No establecer Content-Type, el navegador lo hará
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || 'Error al subir imagen');
            }

            const data = await response.json();

            // Actualizar array de imágenes con la URL de Cloudinary
            if (this.nuevoProducto.imagenes[0] === 'assets/not-img.jpg') {
                this.nuevoProducto.imagenes = [data.url];
            } else {
                this.nuevoProducto.imagenes.push(data.url);
            }

            // Actualizar vista previa
            this.actualizarVistaPrevia(this.nuevoProducto.imagenes);
            
            this.mostrarMensajeExito('Imagen subida correctamente');
        } catch (error) {
            console.error('Error al procesar imagen:', error);
            this.mostrarMensajeError('Error al procesar imagen: ' + error.message);
        } finally {
            this.ocultarPantallaCarga();
            event.target.value = '';
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

        const imagenAEliminar = this.nuevoProducto.imagenes[index];
        this.nuevoProducto.imagenes.splice(index, 1);

        // Si no quedan imágenes, agregar la imagen por defecto
        if (this.nuevoProducto.imagenes.length === 0) {
            this.nuevoProducto.imagenes = ['assets/not-img.jpg'];
        }

        // Actualizar grid de imágenes
        const imagenesGrid = this.modalAgregar.querySelector('#add-imagenes');
        if (imagenesGrid) {
            imagenesGrid.innerHTML = this.nuevoProducto.imagenes.map((img, idx) => `
                <div class="imagen-item" data-index="${idx}">
                    <img src="${img}" alt="Imagen ${idx + 1}">
                </div>
            `).join('');
        }

        // Eliminar archivo físico si no es la imagen por defecto
        if (!imagenAEliminar.includes('not-img.jpg')) {
            fetch('/api/delete-imagen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ruta: imagenAEliminar })
            }).catch(error => console.error('Error al eliminar archivo de imagen:', error));
        }
    }

    async actualizarTabla() {
        try {
            // Recargar la lista de productos
            const response = await fetch('/api/cloudinary/lista');
            const listaArchivos = await response.json();
            
            // Cargar cada producto con validación
            const promesasProductos = listaArchivos.map(async (archivo) => {
                try {
                    const response = await fetch(`/api/cloudinary/producto/${archivo}`);
                    const producto = await response.json();
                    
                    // Validar y asegurar que los campos existan
                    return {
                        id: producto.id || 'Sin ID',
                        nombre: producto.nombre || 'Sin nombre',
                        precio: typeof producto.precio === 'number' ? producto.precio : 0,
                        ojo: typeof producto.ojo === 'boolean' ? producto.ojo : true,
                        imagenes: Array.isArray(producto.imagenes) ? producto.imagenes : ['assets/not-img.jpg']
                    };
                } catch (error) {
                    console.error(`Error al cargar producto ${archivo}:`, error);
                    return null;
                }
            });

            // Filtrar productos nulos y actualizar this.productos
            this.productos = (await Promise.all(promesasProductos))
                .filter(producto => producto !== null);

            // Actualizar la tabla en el DOM
            if (this.tablaProductos) {
                this.tablaProductos.innerHTML = this.productos.map(producto => `
                    <tr id="producto-${producto.id}">
                        <td>${producto.id}</td>
                        <td>${producto.nombre}</td>
                        <td>$${producto.precio.toLocaleString('es-AR')}</td>
                        <td>
                            <button class="boton-ojo" onclick="gestorProductos.toggleVisibilidad('${producto.id}')">
                                <span class="ojo-icon">${producto.ojo ? '👁️' : '👁️‍🗨️'}</span>
                            </button>
                        </td>
                        <td>
                            <div class="menu-container">
                                <button class="btn-accion">⚙️</button>
                                <div class="menu-opciones">
                                    <button onclick="gestorProductos.editarProducto('${producto.id}')">
                                        ✏️ Editar
                                    </button>
                                    <button onclick="gestorProductos.mostrarModalConfirmacion('${producto.id}')">
                                        🗑️ Borrar
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error al actualizar tabla:', error);
            this.mostrarMensajeError('Error al actualizar la tabla de productos');
        }
    }

    actualizarVistaPrevia(imagenes) {
        // Actualizar grid de imágenes
        const imagenesGrid = this.modalAgregar.querySelector('#add-imagenes');
        if (imagenesGrid) {
            imagenesGrid.innerHTML = imagenes.map((img, idx) => `
                <div class="imagen-item" data-index="${idx}">
                    <img src="${img}" alt="Imagen ${idx + 1}">
                </div>
            `).join('');

            // Reactivar el modo eliminar si está activo
            const btnEliminar = this.modalAgregar.querySelector('.btn-modo-eliminar');
            if (btnEliminar && btnEliminar.classList.contains('active')) {
                const imagenesItems = imagenesGrid.querySelectorAll('.imagen-item');
                imagenesItems.forEach((item, index) => {
                    item.classList.add('modo-eliminar');
                    item.onclick = () => this.eliminarImagenNuevo(index);
                });
            }
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new GestorProductos();
});

export default GestorProductos;