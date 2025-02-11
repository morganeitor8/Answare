class CarritoController {
    constructor() {
        this.items = [];
        this.initAsync();
    }

    async initAsync() {
        try {
            // Si estamos en modo edición, esperar a que se prepare el carrito
            if (window.location.hash.startsWith('#edicion-')) {
                if (window.prepararCarrito) {
                    await window.prepararCarrito();
                }
            } else {
                // Si no estamos en modo edición, limpiar el carrito
                localStorage.removeItem('carrito');
            }

            // Cargar items después de la preparación
            this.items = JSON.parse(localStorage.getItem('carrito')) || [];
            this.inicializarElementos();
            this.inicializarBotones();
        } catch (error) {
            console.error('Error inicializando carrito:', error);
        }
    }

    inicializarElementos() {
        // Esperar a que el DOM esté listo
        document.addEventListener('DOMContentLoaded', () => {
            this.carritoPanel = document.getElementById('carrito-panel');
            this.carritoItems = document.getElementById('carrito-items');
            this.carritoVacio = document.getElementById('carrito-vacio');
            this.totalCarrito = document.getElementById('total-carrito');
            
            // Solo inicializar si encontramos los elementos necesarios
            if (this.carritoItems && this.carritoVacio) {
                this.inicializarCarrito();
                this.actualizarCarrito();
            } else {
                console.error('No se encontraron elementos necesarios del carrito');
            }
        });
    }

    inicializarBotones() {
        document.addEventListener('DOMContentLoaded', () => {
            const btnFinalizar = document.getElementById('finalizar-compra');
            if (btnFinalizar) {
                btnFinalizar.addEventListener('click', () => this.finalizarCompra());
            }
        });
    }

    inicializarCarrito() {
        if (!this.carritoPanel) return; // Verificar que exista el elemento
        
        // Solo mantener la configuración del carrito vacío
        if (this.carritoVacio) {
            this.carritoVacio.style.display = 'flex';
            this.carritoVacio.style.flexDirection = 'column';
            this.carritoVacio.style.alignItems = 'center';
            this.carritoVacio.style.justifyContent = 'center';
            this.carritoVacio.style.padding = '20px';
        }
        
        // Actualizar contador inicial
        this.actualizarContador();
    }

    agregarItem(producto) {
        const itemExistente = this.items.findIndex(item => item.id === producto.id);
        
        if (itemExistente !== -1) {
            // Si existe, removerlo de su posición actual
            const item = this.items.splice(itemExistente, 1)[0];
            item.cantidad++;
            // Agregarlo al principio del array
            this.items.unshift(item);
        } else {
            // Si no existe, agregar al principio con la imagen seleccionada
            this.items.unshift({
                ...producto,
                cantidad: 1,
                imagenSeleccionada: producto.imagenes[0]
            });
        }

        localStorage.setItem('carrito', JSON.stringify(this.items));
        
        if (this.carritoItems && this.carritoVacio) {
            this.actualizarCarrito();
        }
    }

    actualizarCarrito() {
        // Verificar que los elementos existan
        if (!this.carritoItems || !this.carritoVacio) return;

        if (this.items.length === 0) {
            if (this.carritoVacio) {
                this.carritoVacio.style.display = 'flex';
            }
            if (this.carritoItems) {
                this.carritoItems.style.display = 'none';
                this.carritoItems.innerHTML = '';
            }
        } else {
            if (this.carritoVacio) {
                this.carritoVacio.style.display = 'none';
            }
            if (this.carritoItems) {
                this.carritoItems.style.display = 'block';
                this.carritoItems.innerHTML = this.items.map((item, index) => `
                    <div class="carrito-item">
                        <img src="${item.imagenSeleccionada}" alt="${item.nombre}">
                        <div class="item-detalles">
                            <h3>${item.nombre}</h3>
                            <p>$${item.precio.toLocaleString('es-AR')}</p>
                            <div class="item-cantidad">
                                <button onclick="carrito.modificarCantidad(${index}, -1)">-</button>
                                <span>${item.cantidad}</span>
                                <button onclick="carrito.modificarCantidad(${index}, 1)">+</button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        this.actualizarTotal();
    }

    modificarCantidad(index, cambio) {
        if (this.items[index]) {
            this.items[index].cantidad += cambio;
            
            // Si la cantidad llega a 0 o menos, eliminar el item
            if (this.items[index].cantidad <= 0) {
                this.items.splice(index, 1);
            }
            
            this.actualizarCarrito();
        }
    }

    actualizarContador() {
        if (!this.contadorCarrito) return; // Verificar que exista el elemento
        
        const totalItems = this.items.reduce((total, item) => total + item.cantidad, 0);
        this.contadorCarrito.textContent = totalItems;
    }

    actualizarTotal() {
        if (!this.totalCarrito) return;
        
        const total = this.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        this.totalCarrito.textContent = `Total: $${total.toLocaleString('es-AR')}`;
    }

    async finalizarCompra() {
        if (this.items.length === 0) {
            alert('El carrito está vacío');
            return;
        }
        
        try {
            // Preparar los items con todos los datos necesarios
            const itemsRemito = this.items.map(item => ({
                cantidad: item.cantidad,
                detalle: item.nombre,
                precioUnitario: item.precio,
                importe: item.cantidad * item.precio,
                id: item.id,                    // Incluir ID del producto
                imagenes: item.imagenes        // Incluir imágenes
            }));

            // Crear el remito
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
            localStorage.setItem('productos-remito', JSON.stringify(this.items));
            
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'loading-message';
            loadingMsg.textContent = 'Generando remito...';
            document.body.appendChild(loadingMsg);

            // 3. Abrir list.html en ventana oculta
            const remitoWindow = window.open('list.html', '_blank');
            
            if (remitoWindow) {
                remitoWindow.onload = async function() {
                    try {
                        // Esperar a que se cargue la página
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // 4. Abrir diálogo de impresión
                        remitoWindow.print();

                        // 5. Generar PDF después de la impresión
                        const element = remitoWindow.document.querySelector('.hoja-a4');
                        const canvas = await html2canvas(element, {
                            scale: 2,
                            useCORS: true,
                            logging: false,
                            width: element.offsetWidth,
                            height: element.offsetHeight
                        });

                        const imgData = canvas.toDataURL('image/jpeg', 1.0);
                        const pdf = new jspdf.jsPDF({
                            orientation: 'portrait',
                            unit: 'mm',
                            format: 'a4'
                        });

                        const imgProps = pdf.getImageProperties(imgData);
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                        pdf.save(`remito-${id}.pdf`);

                        // 6. Actualizar estado del remito
                        await fetch(`/api/remitos/${id}/pdf`, {
                            method: 'POST'
                        });

                        // 7. Limpiar y cerrar
                        remitoWindow.close();
                        this.items = [];
                        localStorage.removeItem('carrito');
                        this.actualizarCarrito();
                        
                        loadingMsg.remove();
                        
                        const successMsg = document.createElement('div');
                        successMsg.className = 'success-message';
                        successMsg.textContent = '¡Remito generado con éxito!';
                        document.body.appendChild(successMsg);
                        
                        setTimeout(() => successMsg.remove(), 2000);
                        
                    } catch (error) {
                        console.error('Error en el proceso:', error);
                        loadingMsg.remove();
                        remitoWindow.close();
                        alert('Error al procesar el remito. Por favor, intente nuevamente.');
                    }
                }.bind(this);
            }
        } catch (error) {
            console.error('Error al generar remito:', error);
            alert('Error al generar el remito: ' + error.message);
        }
    }
}

// Crear y exportar la instancia
const carrito = new CarritoController();
window.carrito = carrito;

export { carrito };

export { agregarAlCarrito };

function agregarAlCarrito(producto) {
    carrito.agregarItem(producto);
} 