import { cargarRemitos, obtenerRemitos, formatearFecha } from '../../js/remitos/remitos.js';

class GestorRemitosApp {
    constructor() {
        const remitosContainer = document.querySelector('.remitos-page-container');
        if (!remitosContainer) return;
        
        window.gestorRemitosApp = this;
        this.remitosContainer = remitosContainer;
        this.contenedor = this.remitosContainer.querySelector('.remitos-dashboard');
        this.modalEliminar = document.getElementById('modal-eliminar-remito');
        this.remitoAEliminar = null;
        
        this.init();
        this.bindEvents();
    }

    bindEvents() {
        // Cerrar menús cuando se hace clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.matches('.btn-accion')) {
                document.querySelectorAll('.menu-opciones.activo').forEach(menu => {
                    menu.classList.remove('activo');
                });
            } else {
                const clickedMenu = e.target.nextElementSibling;
                
                document.querySelectorAll('.menu-opciones.activo').forEach(menu => {
                    if (menu !== clickedMenu) {
                        menu.classList.remove('activo');
                    }
                });

                clickedMenu.classList.toggle('activo');
                e.stopPropagation();
            }
        });

        // Eventos del modal de eliminar
        if (this.modalEliminar) {
            const btnCerrar = this.modalEliminar.querySelector('.btn-cerrar');
            const btnCancelar = this.modalEliminar.querySelector('.btn-cancelar');
            const btnConfirmar = this.modalEliminar.querySelector('.btn-confirmar');

            btnCerrar?.addEventListener('click', () => this.cerrarModalEliminar());
            btnCancelar?.addEventListener('click', () => this.cerrarModalEliminar());
            btnConfirmar?.addEventListener('click', () => this.confirmarEliminarRemito());
        }
    }

    async init() {
        try {
            await this.cargarRemitos();
        } catch (error) {
            console.error('Error al inicializar gestor de remitos:', error);
            window.notificationManager.addNotification('error', 'Error al cargar remitos');
        }
    }

    async cargarRemitos() {
        try {
            // Usar API de Cloudinary para obtener lista
            const response = await fetch('/api/cloudinary/listaR');
            if (!response.ok) throw new Error('Error al cargar lista');
            
            const lista = await response.json();
            const remitos = await Promise.all(
                lista.map(async archivo => {
                    const resp = await fetch(`/api/cloudinary/remito/${archivo}`);
                    if (!resp.ok) return null;
                    return resp.json();
                })
            );
            
            const remitosValidos = remitos.filter(r => r !== null);
            const tbody = this.contenedor.querySelector('#remitos-tbody');
            
            if (!remitosValidos.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="3" class="no-remitos">No hay remitos disponibles</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = remitosValidos.map((remito, index) => `
                <tr class="remito-fila">
                    <td class="remito-fecha">${formatearFecha(remito.fecha)}</td>
                    <td class="remito-numero">${String(remitosValidos.length - index).padStart(4, '0')}</td>
                    <td class="remito-acciones">
                        <div class="menu-container">
                            <button class="btn-accion">⚙️</button>
                            <div class="menu-opciones">
                                <button onclick="gestorRemitosApp.editarRemito('${remito.id}')">
                                    ✏️ Editar
                                </button>
                                <button onclick="gestorRemitosApp.descargarRemito('${remito.id}')">
                                    📥 Descargar
                                </button>
                                <button onclick="gestorRemitosApp.mostrarModalConfirmacion('${remito.id}')">
                                    🗑️ Borrar
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error al cargar remitos:', error);
            window.notificationManager.addNotification('error', 'Error al cargar remitos');
        }
    }

    async confirmarEliminarRemito() {
        if (!this.remitoAEliminar) return;

        try {
            const response = await fetch('/api/remitos/eliminar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    archivo: `${this.remitoAEliminar}.json`
                })
            });

            if (!response.ok) throw new Error('Error al eliminar remito');

            await this.cargarRemitos();
            window.notificationManager.addNotification('exito', 'Remito eliminado correctamente');
        } catch (error) {
            console.error('Error al eliminar remito:', error);
            window.notificationManager.addNotification('error', 'Error al eliminar remito');
        } finally {
            this.cerrarModalEliminar();
        }
    }

    async editarRemito(id) {
        try {
            // Verificar que el remito existe
            const response = await fetch(`/api/cloudinary/remito/${id}.json`);
            if (!response.ok) {
                throw new Error('No se pudo cargar el remito');
            }

            // Redirigir a index-app.html con el hash de edición
            window.location.href = `/app/index-app.html#edicion-${id}`;
        } catch (error) {
            console.error('Error al editar remito:', error);
            if (window.notificationManager) {
                window.notificationManager.addNotification('error', 'Error al abrir el remito');
            }
        }
    }
    async descargarRemito(id) {
        try {
            const response = await fetch(`/api/cloudinary/remito/${id}.json`);
            if (!response.ok) throw new Error('Error al obtener remito');
            
            const remito = await response.json();
            const productosFormateados = remito.items.map(item => ({
                nombre: item.detalle,
                cantidad: item.cantidad,
                precio: item.precioUnitario
            }));

            localStorage.setItem('productos-remito', JSON.stringify(productosFormateados));
            
            const remitoWindow = window.open('/app/list.html', '_blank');
            if (remitoWindow) {
                remitoWindow.onload = async () => {
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

                        remitoWindow.close();
                    } catch (error) {
                        console.error('Error al generar PDF:', error);
                        remitoWindow.close();
                    }
                };
            }
        } catch (error) {
            console.error('Error al descargar remito:', error);
            window.notificationManager.addNotification('error', 'Error al descargar PDF');
        }
    }    mostrarModalConfirmacion(id) {
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
            window.notificationManager.addNotification('exito', 'Remito eliminado correctamente');
        } catch (error) {
            console.error('Error al eliminar remito:', error);
            window.notificationManager.addNotification('error', 'Error al eliminar remito');
        } finally {
            this.cerrarModalEliminar();
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new GestorRemitosApp();
});

export default GestorRemitosApp; 