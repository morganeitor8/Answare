class RemitoController {
    constructor() {
        // Obtener productos del localStorage
        const productosString = localStorage.getItem('productos-remito');
        if (!productosString) {
            console.error('No hay productos en el remito');
            return;
        }

        try {
            this.productos = JSON.parse(productosString);
            console.log('Productos recibidos:', this.productos);
            
            // Configuración inicial
            this.remitos = [];
            this.LINEAS_MIN = 11;
            this.LINEAS_MAX = 11;
            
            // Iniciar el proceso
            this.procesarProductos();
            this.establecerFechaHoraInicial();

            // Configurar evento de impresión
            window.onafterprint = () => {
                console.log('Impresión completada o cancelada');
                // No hacemos nada aquí, el PDF se generará de todas formas
            };
        } catch (error) {
            console.error('Error al procesar productos:', error);
        }
    }

    procesarProductos() {
        // Agrupar productos por imagen
        const productosAgrupados = this.agruparPorImagen();
        console.log('Productos agrupados:', productosAgrupados);
        
        // Distribuir en remitos
        this.distribuirEnRemitos(productosAgrupados);
        
        // Renderizar en el DOM
        this.renderizarRemitos();
        
        // No limpiamos el localStorage aquí, se limpiará después de guardar el PDF
    }

    agruparPorImagen() {
        const grupos = {};
        
        this.productos.forEach(producto => {
            const nombreProducto = producto.nombre;
            const keyCompleta = nombreProducto;

            if (!grupos[keyCompleta]) {
                grupos[keyCompleta] = {
                    cantidad: producto.cantidad,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    detalle: this.formatearDetalle(producto.nombre)
                };
            } else {
                grupos[keyCompleta].cantidad += producto.cantidad;
            }
        });

        return Object.values(grupos);
    }

    formatearDetalle(nombre) {
        return nombre;
    }

    distribuirEnRemitos(productosAgrupados) {
        let remitoActual = {
            items: [],
            total: 0,
            totalAnterior: 0
        };

        productosAgrupados.forEach(producto => {
            // Verificar si necesitamos crear un nuevo remito
            if (remitoActual.items.length >= this.LINEAS_MAX) {
                // Rellenar el remito actual si no alcanza el mínimo
                this.rellenarRemito(remitoActual);
                this.remitos.push(remitoActual);
                
                // Crear nuevo remito
                remitoActual = {
                    items: [],
                    total: remitoActual.total,
                    totalAnterior: remitoActual.total
                };
            }

            // Agregar producto al remito actual
            const importe = producto.cantidad * producto.precio;
            remitoActual.items.push({
                cantidad: producto.cantidad,
                detalle: producto.detalle,
                precioUnitario: producto.precio,
                importe: importe
            });
            remitoActual.total += importe;
        });

        // Procesar el último remito
        if (remitoActual.items.length > 0) {
            this.rellenarRemito(remitoActual);
            this.remitos.push(remitoActual);
        }
    }

    rellenarRemito(remito) {
        while (remito.items.length < this.LINEAS_MIN) {
            remito.items.push({
                cantidad: '',
                detalle: '',
                precioUnitario: '',
                importe: ''
            });
        }
    }

    renderizarRemitos() {
        const productosLista = document.getElementById('productos-lista');
        if (!productosLista) {
            console.error('No se encontró el elemento productos-lista');
            return;
        }

        // Limpiar lista existente
        productosLista.innerHTML = '';

        // Renderizar primer remito
        this.renderizarRemito(this.remitos[0], productosLista);

        // Actualizar total
        const totalElement = document.getElementById('total');
        if (totalElement) {
            const ultimoRemito = this.remitos[this.remitos.length - 1];
            totalElement.textContent = ultimoRemito.total.toLocaleString('es-AR');
        }

        // Actualizar fecha
        const fechaElement = document.getElementById('fecha');
        if (fechaElement) {
            const ahora = new Date();
            fechaElement.textContent = ahora.toLocaleString('es-AR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    renderizarRemito(remito, contenedor) {
        remito.items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.cantidad}</td>
                <td class="producto-nombre">${item.detalle}</td>
                <td>${item.precioUnitario ? `$${item.precioUnitario.toLocaleString('es-AR')}` : ''}</td>
                <td>${item.importe ? `$${item.importe.toLocaleString('es-AR')}` : ''}</td>
            `;
            contenedor.appendChild(tr);
        });
    }
}

// Función para formatear números menores a 10 con un cero inicial
function padZero(num) {
    return num < 10 ? `0${num}` : num;
}

// Función para actualizar la fecha y hora
function actualizarFechaHora() {
    const ahora = new Date();
    const fecha = `${padZero(ahora.getDate())}/${padZero(ahora.getMonth() + 1)}/${ahora.getFullYear().toString().substr(-2)}`;
    const hora = `${padZero(ahora.getHours())}:${padZero(ahora.getMinutes())}:${padZero(ahora.getSeconds())}`;
    
    document.getElementById('fecha-actual').textContent = fecha;
    document.getElementById('hora-actual').textContent = hora;
}

// Actualizar inicialmente
actualizarFechaHora();

// Actualizar cada segundo
setInterval(actualizarFechaHora, 1000);

// Inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
    new RemitoController();
});
