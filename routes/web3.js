// web3.js    ./routes/web3.js
const express = require('express');
const router = express.Router();
const keyManager = require('../key.js');
const passManager = require('../priv/usd/pass.js');

// Verificar autenticación para todas las rutas de este router
router.use(async (req, res, next) => {
    const authToken = req.cookies.authToken;
    const deviceId = req.cookies.deviceId;

    if (!authToken || !deviceId || !await passManager.verifyDevice(deviceId)) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    next();
});

// Obtener dispositivos activos
router.get('/api/devices', async (req, res) => {
    try {
        const devices = await passManager.getDevicesList();
        res.json(devices);
    } catch (error) {
        console.error('Error al obtener dispositivos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Verificar autenticación
router.get('/api/auth/check', async (req, res) => {
    const authToken = req.cookies.authToken;
    const deviceId = req.cookies.deviceId;

    if (!authToken || !deviceId || !await passManager.verifyDevice(deviceId)) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    res.json({ success: true });
});

// Modificar endpoint existente
router.post('/api/devices/invalidate', async (req, res) => {
    try {
        const { deviceId } = req.body;
        await passManager.removeDevice(deviceId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al invalidar dispositivo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener contraseña actual para QR
router.get('/api/auth/current-password', (req, res) => {
    try {
        const password = keyManager.getCurrentPassword();
        res.json({ password });
    } catch (error) {
        console.error('Error al obtener contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
