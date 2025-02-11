const path = require('path');
const express = require('express');

function configurarRutasYErrores(app) {
    // Servir archivos estáticos con manejo específico para JSON
    app.use(express.static('publico', {
        setHeaders: (res, path) => {
            if (path.endsWith('.json')) {
                res.setHeader('Content-Type', 'application/json');
            }
        }
    }));

    // Rutas principales
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'publico', 'index.html'));
    });

    app.get('/app', (req, res) => {
        res.sendFile(path.join(__dirname, 'publico', 'app', 'index.html'));
    });

    // Manejo de errores para archivos JSON no encontrados
    app.use((err, req, res, next) => {
        if (err.code === 'ENOENT' && req.path.endsWith('.json')) {
            res.status(404).json({ error: 'Archivo JSON no encontrado' });
        } else {
            next(err);
        }
    });

    // Manejo de errores 404
    app.use((req, res) => {
        if (req.path.endsWith('.json')) {
            res.status(404).json({ error: 'Archivo JSON no encontrado' });
        } else {
            res.status(404).sendFile(path.join(__dirname, 'publico', '404.html'));
        }
    });
}

module.exports = { configurarRutasYErrores }; 