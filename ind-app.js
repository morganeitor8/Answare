const express = require('express');
const path = require('path');
const router = express.Router();
const keyManager = require('./key.js');

// Middleware de autenticación para rutas móviles
router.use((req, res, next) => {
    // Si la ruta no es de la app móvil, ignorar
    if (!req.path.startsWith('/app/')) {
        return next();
    }

    // Rutas públicas que no requieren autenticación
    const publicPaths = [
        '/app/login-app.html',
        '/app/login-app.css',
        '/app/crack-app.js',
        '/app/auth-app.js',
        '/app/qr-scanner.min.js',
        '/app/assets/logo.png',
        '/api/auth'
    ];

    // Si es una ruta pública, permitir acceso
    if (publicPaths.includes(req.path)) {
        return next();
    }

    // Verificar autenticación
    const authToken = req.cookies.authToken;
    if (!authToken || authToken !== keyManager.AUTH_TOKEN) {
        // Si es una solicitud HTML o la raíz, redirigir al login
        if (req.path === '/app' || req.path.endsWith('.html')) {
            return res.redirect('/app/login-app.html');
        }
        // Si es una solicitud de API, devolver 401
        if (req.path.startsWith('/app/api/')) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        // Para cualquier otra ruta (archivos estáticos), permitir acceso
        return next();
    }

    next();
});

// Rutas específicas para archivos de login
router.get('/app/login-app.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'routes-app/login-app.html'));
});

router.get('/app/login-app.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'routes-app/login-app.css'));
});

router.get('/app/crack-app.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'routes-app/crack-app.js'));
});

router.get('/app/auth-app.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'routes-app/auth-app.js'));
});

// Ruta base para la app móvil
router.get('/app', (req, res) => {
    const authToken = req.cookies.authToken;
    if (!authToken || authToken !== keyManager.AUTH_TOKEN) {
        res.redirect('/app/login-app.html');
    } else {
        res.redirect('/app/index-app.html');
    }
});

// Servir archivos estáticos
router.use('/app', express.static(path.join(__dirname, 'publico/app')));

module.exports = router; 