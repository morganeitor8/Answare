class CarritoAppController {
    constructor() {
        this.items = [];
        this.initElements();
        this.initEvents();
        this.initAsync();
    }

    initElements() {
        this.carritoPanel = document.getElementById('carrito-panel');
        this.carritoItems = document.getElementById('carrito-items');
        this.totalCarrito = document.getElementById('total-carrito');
        this.cantidadItems = document.getElementById('cantidad-items');
        this.btnFinalizarCompra = document.getElementById('finalizar-compra');

        // Cambiar texto del botón si estamos en modo edición
        if (this.btnFinalizarCompra && window.location.hash.startsWith('#edicion-')) {
            this.btnFinalizarCompra.textContent = 'Guardar Remito';
        }
    }

    initEvents() {
        if (this.btnFinalizarCompra) {
            this.btnFinalizarCompra.addEventListener('click', () => this.finalizarCompra());
        }
    }

    async initAsync() {
        try {
            const isEditingMode = window.location.hash.startsWith('#edicion-');
            const remitoId = isEditingMode ? window.location.hash.split('-')[1] : null;

            localStorage.removeItem('carrito');

            if (isEditingMode && remitoId) {
                const response = await fetch(`/api/cloudinary/remito/${remitoId}.json`);
                if (!response.ok) throw new Error('Error al cargar el remito');
                
                const remito = await response.json();
                const itemsCarrito = remito.items.map(item => ({
                    cantidad: item.cantidad,
                    nombre: item.detalle,
                    precio: parseFloat(item.precioUnitario || 0),
                    id: item.id,
                    imagenes: item.imagenes || [],
                    imagenSeleccionada: item.imagenes?.[0] || 'assets/not-img.jpg'
                }));
                
                localStorage.setItem('carrito', JSON.stringify(itemsCarrito));
            }

            this.items = JSON.parse(localStorage.getItem('carrito')) || [];
            this.actualizarCarrito();

        } catch (error) {
            console.error('Error inicializando carrito:', error);
            if (window.notificationManager) {
                window.notificationManager.addNotification('error', 'Error al cargar el carrito');
            }
        }
    }
    actualizarCarrito() {
        if (!this.carritoItems) return;

        if (this.items.length === 0) {
            this.carritoItems.innerHTML = '<div class="carrito-vacio">No hay productos en el carrito</div>';
        } else {
            this.carritoItems.innerHTML = this.items.map((item, index) => `
                <div class="carrito-item">
                    <img src="${item.imagenSeleccionada}" alt="${item.nombre}">
                    <div class="item-detalles">
                        <h3>${item.nombre}</h3>
                        <p>$${item.precio.toLocaleString('es-AR')}</p>
                        <div class="item-cantidad">
                            <button onclick="window.carritoApp.modificarCantidad(${index}, -1)">-</button>
                            <span>${item.cantidad}</span>
                            <button onclick="window.carritoApp.modificarCantidad(${index}, 1)">+</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        this.actualizarTotal();
        this.actualizarContador();
    }

    actualizarTotal() {
        if (!this.totalCarrito) return;
        const total = this.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        this.totalCarrito.textContent = `Total: $${total.toLocaleString('es-AR')}`;
    }

    actualizarContador() {
        if (!this.cantidadItems) return;
        const cantidad = this.items.reduce((sum, item) => sum + item.cantidad, 0);
        this.cantidadItems.textContent = `(${cantidad} items)`;
    }

    modificarCantidad(index, cambio) {
        if (this.items[index]) {
            this.items[index].cantidad += cambio;
            if (this.items[index].cantidad <= 0) {
                this.items.splice(index, 1);
            }
            localStorage.setItem('carrito', JSON.stringify(this.items));
            this.actualizarCarrito();
        }
    }

    agregarItem(producto) {
        const itemExistente = this.items.find(item => item.id === producto.id);
        
        if (itemExistente) {
            itemExistente.cantidad++;
        } else {
            this.items.unshift({
                ...producto,
                cantidad: 1,
                imagenSeleccionada: producto.imagenes[0]
            });
        }

        localStorage.setItem('carrito', JSON.stringify(this.items));
        this.actualizarCarrito();
        
        if (window.notificationManager) {
            window.notificationManager.addNotification('exito', 'Producto agregado al carrito');
        }
    }

    async finalizarCompra() {
        if (this.items.length === 0) {
            if (window.notificationManager) {
                window.notificationManager.addNotification('error', 'El carrito está vacío');
            }
            return;
        }
    
        try {
            const isEditingMode = window.location.hash.startsWith('#edicion-');
            const remitoId = isEditingMode ? window.location.hash.split('-')[1] : null;

            if (isEditingMode) {
                // Modo edición: actualizar remito existente
                const itemsRemito = this.items.map(item => ({
                    cantidad: item.cantidad,
                    detalle: item.nombre,
                    precioUnitario: item.precio,
                    importe: item.cantidad * item.precio,
                    id: item.id,
                    imagenes: item.imagenes
                }));

                // Obtener remito original para mantener fecha
                const response = await fetch(`/api/cloudinary/remito/${remitoId}.json`);
                const remitoOriginal = await response.json();

                // Actualizar remito en Cloudinary
                const remitoActualizado = {
                    ...remitoOriginal,
                    items: itemsRemito,
                    total: itemsRemito.reduce((sum, item) => sum + item.importe, 0)
                };

                await fetch(`/api/remitos/actualizar/${remitoId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(remitoActualizado)
                });

                // Limpiar y redirigir
                this.items = [];
                localStorage.removeItem('carrito');
                this.actualizarCarrito();
                window.location.href = '/app/settings-app.html#remitos';

            } else {
                // Modo normal: crear nuevo remito
                if (window.notificationManager) {
                    window.notificationManager.addNotification('exito', 'Procesando compra...');
                }

                const itemsRemito = this.items.map(item => ({
                    cantidad: item.cantidad,
                    detalle: item.nombre,
                    precioUnitario: item.precio,
                    importe: item.cantidad * item.precio,
                    id: item.id,
                    imagenes: item.imagenes
                }));

                // Guardar remito en Cloudinary
                const response = await fetch('/api/remitos/guardar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        items: itemsRemito,
                        total: itemsRemito.reduce((sum, item) => sum + item.importe, 0)
                    })
                });

                if (!response.ok) {
                    throw new Error('Error al guardar el remito');
                }

                const { id } = await response.json();

                // Guardar productos en localStorage para list.js
                localStorage.setItem('productos-remito', JSON.stringify(this.items));

                // Abrir list.html en nueva pestaña
                const remitoWindow = window.open('list.html', '_blank');
            
                if (remitoWindow) {
                    remitoWindow.onload = async () => {
                        try {
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            // Primero abrir el diálogo de impresión
                            remitoWindow.print();

                            // Después de imprimir o cancelar, continuar con la generación del PDF
                            const element = remitoWindow.document.querySelector('.hoja-a4');
                            const canvas = await html2canvas(element, {
                                scale: 2,
                                useCORS: true,
                                logging: false,
                                width: element.offsetWidth,
                                height: element.offsetHeight
                            });

                            const imgData = canvas.toDataURL('image/jpeg', 1.0);
                            const { jsPDF } = window.jspdf;
                            const pdf = new jsPDF({
                                orientation: 'portrait',
                                unit: 'mm',
                                format: 'a4'
                            });

                            const imgProps = pdf.getImageProperties(imgData);
                            const pdfWidth = pdf.internal.pageSize.getWidth();
                            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                            pdf.save(`remito-${id}.pdf`);

                            // Marcar PDF como generado
                            await fetch(`/api/remitos/${id}/pdf`, {
                                method: 'POST'
                            });

                            // Cerrar ventana y limpiar
                            remitoWindow.close();
                            this.items = [];
                            localStorage.removeItem('carrito');
                            this.actualizarCarrito();

                            if (window.notificationManager) {
                                window.notificationManager.addNotification('exito', 'Compra finalizada correctamente');
                            }

                        } catch (error) {
                            console.error('Error al generar PDF:', error);
                            remitoWindow.close();
                            if (window.notificationManager) {
                                window.notificationManager.addNotification('error', 'Error al generar el PDF');
                            }
                        }
                    };
                }
            }

        } catch (error) {
            console.error('Error:', error);
            if (window.notificationManager) {
                window.notificationManager.addNotification('error', error.message);
            }
        }
    }
    // ... resto de métodos del carrito ...
}

// Hacer la instancia accesible globalmente
const carritoApp = new CarritoAppController();
window.carritoApp = carritoApp;

export default carritoApp; 