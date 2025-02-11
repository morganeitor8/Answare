import { cargarArticulos, obtenerArticulos, actualizarArticulo } from './productos/articulos.js';
import { agregarAlCarrito } from './carrito.js';

// Función para renderizar productos
function renderizarProductos(articulos) {
    const contenedorProductos = document.getElementById('productos-temporada');
    if (!contenedorProductos) {
        console.error('No se encontró el contenedor de productos');
        return;
    }

    // Filtrar solo artículos visibles
    const articulosVisibles = articulos.filter(articulo => articulo.ojo === true);

    if (articulosVisibles.length === 0) {
        contenedorProductos.innerHTML = `
            <div class="no-resultados">
                <p>No hay productos disponibles en este momento</p>
            </div>`;
        return;
    }

    contenedorProductos.innerHTML = articulosVisibles.map(articulo => `
        <div class="producto-card" data-id="${articulo.id}">
            <img src="${articulo.imagenes[0]}" alt="${articulo.nombre}">
            <div class="producto-info">
                <h3>${articulo.nombre}</h3>
                <p class="precio">$${articulo.precio.toLocaleString('es-AR')}</p>
            </div>
        </div>
    `).join('');

    // Agregar event listeners
    contenedorProductos.querySelectorAll('.producto-card').forEach(card => {
        const id = card.dataset.id;
        const articulo = articulosVisibles.find(a => a.id === id);
        card.addEventListener('click', () => {
            agregarAlCarrito(articulo);
        });
    });
}

// Función para mostrar detalles del producto
function mostrarDetalleProducto(articulo) {
    const modal = document.createElement('div');
    modal.className = 'modal-detalle';
    modal.innerHTML = `
        <div class="modal-contenido">
            <button class="cerrar-modal">&times;</button>
            <div class="detalle-producto">
                <div class="imagenes-producto">
                    <img src="${articulo.imagenes[0]}" alt="${articulo.nombre}" class="imagen-principal">
                    <div class="miniaturas">
                        ${articulo.imagenes.map(img => `
                            <img src="${img}" alt="${articulo.nombre}" class="miniatura">
                        `).join('')}
                    </div>
                </div>
                <div class="info-producto">
                    <h2>${articulo.nombre}</h2>
                    <p class="precio">$${articulo.precio.toLocaleString('es-AR')}</p>
                    <button class="btn-agregar-carrito">Agregar al Carrito</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners del modal
    modal.querySelector('.cerrar-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-agregar-carrito').addEventListener('click', () => {
        agregarAlCarrito(articulo);
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Función principal de inicialización
async function inicializarProductos() {
    try {
        const articulos = await cargarArticulos();
        renderizarProductos(articulos);
    } catch (error) {
        console.error('Error al inicializar productos:', error);
        const contenedorProductos = document.getElementById('productos-temporada');
        if (contenedorProductos) {
            contenedorProductos.innerHTML = `
                <div class="no-resultados">
                    <p>Error al cargar los productos: ${error.message}</p>
                </div>`;
        }
    }
}

// Función para limpiar y preparar el carrito
async function prepararCarrito() {
    // 1. Detectar modo edición
    const isEditingMode = window.location.hash.startsWith('#edicion-');
    const remitoId = isEditingMode ? window.location.hash.split('-')[1] : null;
    
    // 2. Limpiar el carrito siempre primero
    localStorage.removeItem('carrito');

    // 3. Si estamos en modo edición, cargar el remito inmediatamente
    if (isEditingMode && remitoId) {
        const response = await fetch(`/js/remitos/tikets/${remitoId}.json`);
        if (!response.ok) throw new Error('Error al cargar el remito');
        
        const remito = await response.json();
        const itemsCarrito = remito.items.map(item => ({
            cantidad: item.cantidad,
            nombre: item.detalle,
            precio: parseFloat(item.precioUnitario || 0),
            id: item.id,
            imagenes: item.imagenes || []
        }));
        
        localStorage.setItem('carrito', JSON.stringify(itemsCarrito));
    }

    return { isEditingMode, remitoId };
}

// Hacer la función disponible globalmente
window.prepararCarrito = prepararCarrito;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Preparar el carrito primero
        const { isEditingMode, remitoId } = await prepararCarrito();

        // Configurar el botón según el modo
        const btnFinalizarCompra = document.getElementById('finalizar-compra');
        if (btnFinalizarCompra && isEditingMode) {
            btnFinalizarCompra.textContent = 'Guardar Remito';
            btnFinalizarCompra.onclick = async () => {
                try {
                    const itemsCarrito = JSON.parse(localStorage.getItem('carrito') || '[]');
                    
                    // Convertir items al formato del remito
                    const itemsRemito = itemsCarrito.map(item => ({
                        cantidad: item.cantidad,
                        detalle: item.nombre,
                        precioUnitario: item.precio,
                        importe: parseFloat((item.cantidad * item.precio).toFixed(2)),  // Formatear importe
                        id: item.id,
                        imagenes: [item.imagenes[0]]  // Solo guardar la primera imagen
                    }));

                    // Obtener el remito original para mantener la fecha
                    const response = await fetch(`/js/remitos/tikets/${remitoId}.json`);
                    const remitoOriginal = await response.json();

                    // Actualizar el remito
                    const remitoActualizado = {
                        ...remitoOriginal,
                        items: itemsRemito,
                        total: itemsRemito.reduce((sum, item) => sum + item.importe, 0)
                    };

                    // Guardar el remito actualizado
                    await fetch(`/api/remitos/actualizar/${remitoId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(remitoActualizado)
                    });

                    // Limpiar y redirigir
                    localStorage.removeItem('carrito');
                    window.location.href = '/settings.html#tiket';
                } catch (error) {
                    console.error('Error al actualizar remito:', error);
                    alert('Error al guardar los cambios');
                }
            };
        }

        // Inicializar productos
        await inicializarProductos();

    } catch (error) {
        console.error('Error al inicializar:', error);
    }
});