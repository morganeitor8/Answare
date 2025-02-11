const express = require('express');
const path = require('path');
const { uploadJson, readJson, modifyJson, deleteJson, checkJsonExists } = require('../plugins/Cloudinary'); // Usar el plugin de Cloudinary
const router = express.Router();

// Rutas para remitos
router.post('/api/remitos/guardar', async (req, res) => {
    try {
        const remito = req.body;
        const listaPath = 'sport/remitos/lista.json';

        // Verificar si lista.json existe
        let lista = [];
        const listaExiste = await checkJsonExists(listaPath);
        if (listaExiste) {
            lista = await readJson(listaPath);
        } else {
            // Crear lista.json si no existe
            await uploadJson(listaPath, []);
        }

        const nums = lista.map(archivo => parseInt(archivo.match(/R(\d+)\.json/)[1]));
        nums.sort((a, b) => a - b);  // Ordenar números

        // Encontrar el primer número faltante en la secuencia
        let siguienteNum = 1;
        for (const num of nums) {
            if (num === siguienteNum) {
                siguienteNum++;
            } else if (num > siguienteNum) {
                break;  // Encontramos un hueco
            }
        }

        const id = `R${siguienteNum}`;
        
        // Obtener los artículos originales para sus precios
        const articulosPath = 'sport/productos/articulos';
        
        // Procesar cada item para obtener su información original
        const itemsProcesados = await Promise.all(remito.items.map(async item => {
            try {
                const articuloPath = `${articulosPath}/${item.id}.json`;
                const articuloOriginal = await readJson(articuloPath);
                
                return {
                    cantidad: item.cantidad,
                    detalle: articuloOriginal.nombre,
                    precioUnitario: articuloOriginal.precio,
                    importe: item.cantidad * articuloOriginal.precio,
                    id: item.id,
                    imagenes: [articuloOriginal.imagenes[0]]
                };
            } catch (error) {
                console.error(`Error al procesar artículo ${item.id}:`, error);
                return item;
            }
        }));

        const nuevoRemito = {
            id,
            fecha: new Date().toISOString(),
            items: itemsProcesados,
            total: itemsProcesados.reduce((sum, item) => sum + item.importe, 0),
            pdf: false
        };

        const remitoPath = `sport/remitos/tikets/${id}.json`;
        await uploadJson(remitoPath, nuevoRemito);

        lista.push(`${id}.json`);
        await uploadJson(listaPath, lista);

        res.json({ success: true, id });
    } catch (error) {
        console.error('Error al guardar remito:', error);
        res.status(500).json({ error: 'Error al guardar remito' });
    }
});

router.post('/api/remitos/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;
        const remitoPath = `sport/remitos/tikets/${id}.json`;
        
        const remito = await readJson(remitoPath);
        remito.pdf = true;
        
        await uploadJson(remitoPath, remito);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error al marcar PDF:', error);
        res.status(500).json({ error: 'Error al marcar PDF' });
    }
});

// Ruta para actualizar un remito existente
router.post('/api/remitos/actualizar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const remitoActualizado = req.body;
        
        // Obtener los artículos originales para sus datos
        const articulosPath = 'sport/productos/articulos';
        
        // Procesar cada item para obtener su información original
        const itemsProcesados = await Promise.all(remitoActualizado.items.map(async item => {
            try {
                const articuloPath = `${articulosPath}/${item.id}.json`;
                const articuloOriginal = await readJson(articuloPath);
                
                return {
                    cantidad: item.cantidad,
                    detalle: articuloOriginal.nombre,
                    precioUnitario: articuloOriginal.precio,
                    importe: item.cantidad * articuloOriginal.precio,
                    id: item.id,
                    imagenes: [articuloOriginal.imagenes[0]]
                };
            } catch (error) {
                console.error(`Error al procesar artículo ${item.id}:`, error);
                return item;
            }
        }));

        // Actualizar el remito con los items procesados
        const remitoFinal = {
            ...remitoActualizado,
            items: itemsProcesados,
            total: itemsProcesados.reduce((sum, item) => sum + item.importe, 0)
        };
        
        // Guardar el remito actualizado
        const remitoPath = `sport/remitos/tikets/${id}.json`;
        await uploadJson(remitoPath, remitoFinal);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar remito:', error);
        res.status(500).json({ error: 'Error al actualizar remito' });
    }
});

// Ruta para eliminar un remito
router.post('/api/remitos/eliminar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Eliminar el archivo del remito
        const remitoPath = `sport/remitos/tikets/${id}.json`;
        await deleteJson(remitoPath);

        // 2. Actualizar lista.json
        const listaPath = 'sport/remitos/lista.json';
        const lista = await readJson(listaPath);
        
        // Filtrar el remito eliminado
        const nuevaLista = lista.filter(archivo => !archivo.includes(`${id}.json`));
        
        // Guardar la lista actualizada
        await uploadJson(listaPath, nuevaLista);

        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar remito:', error);
        res.status(500).json({ error: 'Error al eliminar remito' });
    }
});

module.exports = router;