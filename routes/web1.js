// web1.js    ./routes/web1.js
const express = require('express');
const { 
    uploadJson, 
    modifyJson, 
    deleteJson, 
    checkJsonExists, 
    readJson,
    cloudinary
} = require('../plugins/Cloudinary');
const router = express.Router();

// Ruta para actualizar un artículo
router.post('/js/productos/articulos/:id.json', async (req, res) => {
    try {
        const { id } = req.params;
        await modifyJson(`sport/productos/articulos/${id}.json`, req.body);
        res.json({ 
            success: true,
            producto: req.body 
        });
    } catch (error) {
        console.error('Error al actualizar artículo:', error);
        res.status(500).json({ error: 'Error al actualizar artículo' });
    }
});

// Ruta para eliminar un artículo
router.post('/api/productos/eliminar', async (req, res) => {
    try {
        const { archivo } = req.body;

        // 1. Obtener el producto antes de eliminarlo
        const producto = await readJson(`sport/productos/articulos/${archivo}`);
        console.log('Producto a eliminar:', producto); // Debug

        // 2. Eliminar las imágenes asociadas
        if (producto && Array.isArray(producto.imagenes)) {
            for (const imagenUrl of producto.imagenes) {
                if (!imagenUrl.includes('not-img.jpg')) {
                    try {
                        // Extraer el public_id de la URL de Cloudinary
                        const urlParts = imagenUrl.split('/upload/');
                        if (urlParts.length > 1) {
                            const publicId = urlParts[1].split('/').slice(1).join('/').split('.')[0]; // Obtener el public_id
                            console.log('Intentando eliminar imagen:', publicId); // Debug

                            const result = await cloudinary.uploader.destroy(publicId, {
                                resource_type: 'image',
                                invalidate: true
                            });

                            console.log('Resultado de eliminación:', result); // Debug
                            if (result.result !== 'ok') {
                                console.error('Error al eliminar imagen:', publicId);
                            }
                        }
                    } catch (imgError) {
                        console.error('Error al eliminar imagen:', imgError);
                    }
                }
            }
        }

        // 3. Eliminar el archivo JSON del producto
        await deleteJson(`sport/productos/articulos/${archivo}`);
        
        // 4. Actualizar lista.json
        let listaActual = await readJson('sport/productos/lista.json');
        listaActual = listaActual.filter(item => item !== archivo);
        await uploadJson('sport/productos/lista.json', listaActual);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar:', error);
        res.status(500).json({ 
            error: 'Error al eliminar artículo',
            details: error.message 
        });
    }
});

// Ruta para actualizar lista.json
router.post('/api/productos/lista', async (req, res) => {
    try {
        const { lista } = req.body;
        await modifyJson('sport/productos/lista.json', lista);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar lista.json:', error);
        res.status(500).json({ error: 'Error al actualizar lista.json' });
    }
});

// Ruta para subir imágenes
router.post('/api/upload-imagen', async (req, res) => {
    try {
        if (!req.files || !req.files.imagen) {
            throw new Error('No se recibió ninguna imagen');
        }

        const imagen = req.files.imagen;
        const nombre = req.body.nombre || `imagen_${Date.now()}`;

        // Validar tipo de archivo
        if (!imagen.mimetype.startsWith('image/')) {
            throw new Error('El archivo debe ser una imagen');
        }

        // Subir a Cloudinary
        const result = await cloudinary.uploader.upload(imagen.tempFilePath, {
            folder: 'sport/assets/productos',
            public_id: nombre.split('.')[0],
            resource_type: 'image',
            overwrite: true
        });

        res.json({ 
            success: true,
            url: result.secure_url
        });

    } catch (error) {
        console.error('Error al subir imagen:', error);
        res.status(500).json({ 
            error: 'Error al subir imagen',
            details: error.message 
        });
    }
});

// Ruta para eliminar imágenes
router.post('/api/delete-imagen', async (req, res) => {
    try {
        const { ruta } = req.body;

        // Extraer el public_id de la URL de Cloudinary
        const urlParts = ruta.split('/upload/');
        if (urlParts.length < 2) {
            throw new Error('URL de imagen inválida');
        }

        // Obtener el public_id correcto
        const publicId = urlParts[1].split('/').slice(1).join('/').split('.')[0]; // Esto debería dar 'sport/assets/productos/prod_1735871298314_12'
        console.log('Eliminando imagen con publicId:', publicId); // Debug

        // Eliminar la imagen de Cloudinary
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
            invalidate: true
        });

        console.log('Resultado de eliminación:', result); // Debug

        if (result.result !== 'ok') {
            throw new Error('No se pudo eliminar la imagen');
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({ 
            error: 'Error al eliminar imagen',
            details: error.message 
        });
    }
});

// Ruta para actualizar un producto específico
router.post('/api/productos/actualizar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const ruta = `sport/productos/articulos/${id}.json`;
        
        // Asegurar que el producto tiene la estructura correcta
        const productoValidado = {
            id: id,
            nombre: req.body.nombre || '',
            precio: Number(req.body.precio) || 0,
            ojo: typeof req.body.ojo === 'boolean' ? req.body.ojo : true,
            imagenes: Array.isArray(req.body.imagenes) ? req.body.imagenes : ['assets/not-img.jpg']
        };

        // Primero intentar leer o crear lista.json
        let listaActual = [];
        try {
            listaActual = await readJson('sport/productos/lista.json');
        } catch (error) {
            // Si no existe lista.json, crearlo
            await uploadJson('sport/productos/lista.json', []);
        }

        // Subir o actualizar el producto
        await uploadJson(ruta, productoValidado);

        // Actualizar lista.json si es necesario
        if (!listaActual.includes(`${id}.json`)) {
            listaActual.push(`${id}.json`);
            await uploadJson('sport/productos/lista.json', listaActual);
        }

        res.json({ 
            success: true,
            producto: productoValidado
        });

    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ 
            error: 'Error al actualizar producto',
            details: error.message 
        });
    }
});

// Ruta para obtener lista.json
router.get('/api/productos/lista', async (req, res) => {
    try {
        let lista = [];
        try {
            lista = await readJson('sport/productos/lista.json');
        } catch (error) {
            // Si no existe, crear una lista vacía
            await uploadJson('sport/productos/lista.json', []);
        }
        res.json(lista);
    } catch (error) {
        console.error('Error al leer lista.json:', error);
        res.status(500).json({ error: 'Error al leer lista de productos' });
    }
});

module.exports = router; 