export let remitos = [];

// Función para cargar todos los remitos
export async function cargarRemitos() {
    try {
        // Obtener lista de archivos desde Cloudinary
        const response = await fetch('/api/cloudinary/listaR');
        const listaArchivos = await response.json();
        
        // Cargar cada remito desde Cloudinary
        const promesasRemitos = listaArchivos.map(async (nombreArchivo) => {
            try {
                const response = await fetch(`/api/cloudinary/remito/${nombreArchivo}`);
                if (!response.ok) {
                    console.warn(`No se pudo cargar el remito ${nombreArchivo}`);
                    return null;
                }
                const datos = await response.json();
                return datos;
            } catch (error) {
                console.warn(`Error al cargar remito ${nombreArchivo}:`, error);
                return null;
            }
        });

        // Actualizar array de remitos y ordenar por fecha descendente (más reciente arriba)
        remitos = (await Promise.all(promesasRemitos))
            .filter(remito => remito !== null)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        return remitos;
    } catch (error) {
        console.error('Error al cargar remitos:', error);
        return []; // Retornar array vacío en caso de error
    }
}

// Función para obtener remitos actuales (ya ordenados)
export function obtenerRemitos() {
    return remitos;
}

// Función para obtener un remito por ID
export function obtenerRemitoPorId(id) {
    return remitos.find(r => r.id === id);
}

// Función para formatear fecha
export function formatearFecha(fecha) {
    return new Date(fecha).toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
