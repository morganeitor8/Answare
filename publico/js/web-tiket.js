import { cargarRemitos, obtenerRemitos, formatearFecha } from './remitos/remitos.js';

class GestorTiket {
    constructor() {
        // Verificar que estamos en la página de tickets
        const ticketContainer = document.querySelector('.tiket-page-container');
        if (!ticketContainer) return;

        window.gestorTiket = this;
        this.tiketPage = ticketContainer;
        this.contenedor = this.tiketPage.querySelector('.estadisticas-contenido');

        this.modalEliminar = document.getElementById('modal-eliminar-remito');
        this.remitoAEliminar = null; // Para guardar el ID del remito a eliminar

        this.init();
        this.bindEvents();
    }

    bindEvents() {
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
                
                // Cerrar todos los otros menús primero
                document.querySelectorAll('.menu-opciones.activo').forEach(menu => {
                    if (menu !== clickedMenu) {
                        menu.classList.remove('activo');
                    }
                });

                // Abrir/cerrar el menú clickeado
                clickedMenu.classList.toggle('activo');
                
                // Prevenir que el clic se propague
                e.stopPropagation();
            }
        });

        // Eventos del modal de eliminar
        if (this.modalEliminar) {
            const btnCancelar = this.modalEliminar.querySelector('.btn-cancelar');
            const btnConfirmar = this.modalEliminar.querySelector('.btn-confirmar');

            btnCancelar?.addEventListener('click', () => this.cerrarModalEliminar());
            btnConfirmar?.addEventListener('click', () => this.confirmarEliminarRemito());
        }
    }

    async init() {
        try {
            this.contenedor.innerHTML = `
                <div class="tiket-dashboard">
                    <div class="tiket-list">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th>N° Remito</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="remitos-tbody">
                                <!-- Los remitos se cargarán dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // Cargar y mostrar remitos
            await this.cargarRemitos();

        } catch (error) {
            console.error('Error al inicializar gestor de remitos:', error);
        }
    }

    async cargarRemitos() {
        try {
            const remitos = await cargarRemitos();
            const tbody = this.contenedor.querySelector('#remitos-tbody');
            
            if (!remitos.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="3" class="no-remitos">Aquí se mostrarán los remitos</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = remitos.map((remito, index) => `
                <tr class="remito-fila">
                    <td class="remito-fecha">${formatearFecha(remito.fecha)}</td>
                    <td class="remito-numero">${String(remitos.length - index).padStart(4, '0')}</td>
                    <td class="remito-acciones">
                        <div class="menu-container">
                            <button class="btn-accion" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('activo')">⚙️</button>
                            <div class="menu-opciones">
                                <button onclick="gestorTiket.editarRemito('${remito.id}')">
                                    ✏️ Editar
                                </button>
                                <button onclick="gestorTiket.mostrarModalConfirmacion('${remito.id}')">
                                    🗑️ Borrar
                                </button>
                            </div>
                        </div>
                        <button class="btn-descargar" onclick="gestorTiket.descargarRemito('${remito.id}')">
                            📥
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error al cargar remitos:', error);
            this.contenedor.querySelector('#remitos-tbody').innerHTML = `
                <tr>
                    <td colspan="3" class="no-remitos">Aquí se mostrarán los remitos</td>
                </tr>
            `;
        }
    }

    // Añadir el método para manejar la edición
    async editarRemito(id) {
        try {
            // Verificar que el remito existe
            const response = await fetch(`/js/remitos/tikets/${id}.json`);
            if (!response.ok) {
                throw new Error('No se pudo cargar el remito');
            }

            // Abrir index.html en modo edición
            window.location.href = `/index.html#edicion-${id}`;
        } catch (error) {
            console.error('Error al editar remito:', error);
            this.mostrarMensajeError('Error al abrir el remito para edición');
        }
    }

    async descargarRemito(id) {
        try {
            const response = await fetch(`/js/remitos/tikets/${id}.json`);
            if (!response.ok) {
                throw new Error('Error al cargar el remito');
            }
            const remito = await response.json();

            const itemsFormateados = remito.items.map(item => ({
                cantidad: item.cantidad,
                nombre: item.detalle,
                precio: item.precioUnitario
            }));

            localStorage.setItem('productos-remito', JSON.stringify(itemsFormateados));

            const remitoWindow = window.open('list.html', '_blank');
            
            if (remitoWindow) {
                remitoWindow.onload = async function() {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 1000));

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

                        // Cerrar la ventana y mostrar mensaje de éxito
                        remitoWindow.close();
                        setTimeout(() => {
                            this.mostrarMensajeExito('PDF generado correctamente');
                        }, 100);

                    } catch (error) {
                        console.error('Error al generar PDF:', error);
                        remitoWindow.close();
                        setTimeout(() => {
                            this.mostrarMensajeError('Error al generar el PDF: ' + error.message);
                        }, 100);
                    }
                }.bind(this);
            }
        } catch (error) {
            console.error('Error al descargar remito:', error);
            this.mostrarMensajeError('Error al descargar el remito: ' + error.message);
        }
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

    mostrarModalConfirmacion(id) {
        this.remitoAEliminar = id;
        this.modalEliminar.classList.add('active');
    }

    cerrarModalEliminar() {
        this.modalEliminar.classList.remove('active');
        this.remitoAEliminar = null;
    }

    async confirmarEliminarRemito() {
        if (!this.remitoAEliminar) return;

        try {
            const response = await fetch(`/api/remitos/eliminar/${this.remitoAEliminar}`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Error al eliminar el remito');
            }

            await this.cargarRemitos();
            this.mostrarMensajeExito('Remito eliminado correctamente');
        } catch (error) {
            console.error('Error al eliminar remito:', error);
            this.mostrarMensajeError('Error al eliminar el remito');
        } finally {
            this.cerrarModalEliminar();
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new GestorTiket();
});

export default GestorTiket;

