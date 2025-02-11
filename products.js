const path = require('path');
const fs = require('fs').promises;
const { readJson, modifyJson } = require('./plugins/Cloudinary');

// Constantes básicas para el servidor
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB por archivo
const MIME_TYPES_PERMITIDOS = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
]);

// Directorio de imágenes
const PRODUCTOS_IMG_DIR = path.join(__dirname, 'publico', 'assets', 'productos');

// Asegurar que el directorio existe al iniciar
(async () => {
    try {
        await fs.mkdir(PRODUCTOS_IMG_DIR, { recursive: true });
        console.log('✓ Directorio de imágenes verificado');
    } catch (error) {
        console.error('Error al verificar directorio de imágenes:', error);
    }
})();

function configurarRutasProductos(app) {
    // Rutas JSON de productos
    app.get('/js/productos/lista.json', async (req, res) => {
        try {
            const lista = await readJson('sport/productos/lista.json');
            res.json(lista);
        } catch (error) {
            res.status(500).json({ error: 'Error al leer lista de productos' });
        }
    });

    app.get('/js/productos/articulos/:archivo', async (req, res) => {
        try {
            const producto = await readJson(`sport/productos/articulos/${req.params.archivo}`);
            res.json(producto);
        } catch (error) {
            res.status(404).json({ error: 'Producto no encontrado' });
        }
    });

    // Ruta para actualizar producto
    app.post('/api/actualizar-producto', async (req, res) => {
        try {
            const { id, nombre, precio } = req.body;
            
            if (!id || !nombre || precio === undefined) {
                return res.status(400).json({ error: 'Faltan datos requeridos' });
            }

            // Construir ruta al archivo JSON del producto
            const rutaArchivo = path.join(__dirname, 'publico', 'js', 'productos', 'articulos', `${id}.json`);

            try {
                // Leer archivo actual
                const contenido = await fs.readFile(rutaArchivo, 'utf8');
                const producto = JSON.parse(contenido);

                // Actualizar solo nombre y precio
                producto.nombre = nombre;
                producto.precio = precio;

                // Guardar cambios manteniendo el formato
                await fs.writeFile(rutaArchivo, JSON.stringify(producto, null, 2));

                res.json({ success: true });
            } catch (error) {
                if (error.code === 'ENOENT') {
                    res.status(404).json({ error: `No se encontró el archivo para el producto ${id}` });
                } else {
                    console.error('Error al procesar archivo:', error);
                    res.status(500).json({ error: 'Error al procesar el archivo del producto' });
                }
            }

        } catch (error) {
            console.error('Error al actualizar producto:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
}

module.exports = { configurarRutasProductos }; 