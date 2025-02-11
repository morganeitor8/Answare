export let articulos = [];

// Función para cargar artículos
export async function cargarArticulos() {
    try {
        // Usar las nuevas rutas API
        const response = await fetch('/api/cloudinary/lista');
        const listaArchivos = await response.json();
        
        const promesasArticulos = listaArchivos.map(async (nombreArchivo) => {
            const response = await fetch(`/api/cloudinary/producto/${nombreArchivo}`);
            const datos = await response.json();
            datos._archivo = nombreArchivo;

            if (!datos.imagenes || datos.imagenes.length === 0) {
                datos.imagenes = ['assets/not-img.jpg'];
            }

            return datos;
        });

        articulos = await Promise.all(promesasArticulos);
        return articulos;
    } catch (error) {
        console.error('Error al cargar artículos:', error);
        return [];
    }
}

// Función para obtener un artículo por ID
export function obtenerArticuloPorId(id) {
    return articulos.find(a => a.id === id);
}

// Función para obtener la ruta del archivo de un artículo
export function obtenerRutaArchivo(id) {
    const articulo = obtenerArticuloPorId(id);
    return articulo ? articulo._archivo : null;
}

// Función para obtener artículos actuales
export function obtenerArticulos() {
    return articulos;
}

// Función para actualizar un artículo
export async function actualizarArticulo(articuloActualizado) {
    try {
        // Obtener la ruta del archivo
        const archivoPath = `articulos/${articuloActualizado.id}.json`; // Corregir la ruta

        // Actualizar el archivo
        const response = await fetch(`/api/productos/${archivoPath}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(articuloActualizado)
        });

        if (!response.ok) {
            throw new Error('Error al actualizar el artículo');
        }

        // Actualizar el array en memoria
        const index = articulos.findIndex(a => a.id === articuloActualizado.id);
        if (index !== -1) {
            articulos[index] = articuloActualizado;
        }

        return true;
    } catch (error) {
        console.error('Error al actualizar artículo:', error);
        throw error;
    }
}

// Función para validar nombre único
export function esNombreUnico(nombre, idActual) {
    return !articulos.some(a => 
        a.id !== idActual && 
        a.nombre.toLowerCase() === nombre.toLowerCase()
    );
}

// Función para obtener información de rutas
export function obtenerRutas() {
    return {
        listaJson: '/js/productos/lista.json',
        articulosBase: '/js/productos/articulos/',
        imagenesBase: '/assets/productos/'
    };
}

// Función para validar estructura de un artículo
export function validarArticulo(articulo) {
    const errores = [];
    
    if (!articulo.id) errores.push('ID es requerido');
    if (!articulo.nombre) errores.push('Nombre es requerido');
    if (typeof articulo.precio !== 'number' || articulo.precio <= 0) {
        errores.push('Precio debe ser un número mayor a 0');
    }
    if (!Array.isArray(articulo.imagenes)) errores.push('Imágenes debe ser un array');
    
    return {
        esValido: errores.length === 0,
        errores
    };
}

// Restaurar estas funciones que productos.js necesita
export async function guardarArticulo(articulo) {
    try {
        const response = await fetch(`/api/productos/guardar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(articulo)
        });

        if (!response.ok) {
            throw new Error('Error al guardar artículo');
        }

        actualizarArticulo(articulo);
        return true;
    } catch (error) {
        console.error('Error guardando artículo:', error);
        throw error;
    }
}

export async function eliminarArticulo(id) {
    try {
        const articulo = obtenerArticuloPorId(id);
        if (!articulo) throw new Error('Artículo no encontrado');

        const response = await fetch(`/api/productos/eliminar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                archivo: articulo._archivo,
                eliminarReferencia: true
            })
        });

        if (!response.ok) {
            throw new Error('Error al eliminar artículo');
        }

        articulos = articulos.filter(a => a.id !== id);
        return true;
    } catch (error) {
        console.error('Error eliminando artículo:', error);
        throw error;
    }
}
