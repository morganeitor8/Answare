const fsPromises = require('fs').promises;
const fs = require('fs');
const path = require('path');

class PassManager {
    constructor() {
        this.passFile = path.join(__dirname, 'pass.json');
        this.devicesDir = __dirname;
        
        // Verificar que pass.json existe
        if (!fs.existsSync(this.passFile)) {
            fs.writeFileSync(this.passFile, JSON.stringify({ devices: [] }, null, 2));
        }
    }

    async getDevicesList() {
        try {
            const data = await fsPromises.readFile(this.passFile, 'utf8');
            return JSON.parse(data).devices || [];
        } catch (error) {
            return [];
        }
    }

    async addDevice(deviceInfo) {
        const devices = await this.getDevicesList();
        devices.push(deviceInfo);
        await fsPromises.writeFile(this.passFile, JSON.stringify({ devices }, null, 2));
    }

    async removeDevice(deviceId) {
        const devices = await this.getDevicesList();
        const updatedDevices = devices.filter(d => d.id !== deviceId);
        await fsPromises.writeFile(this.passFile, JSON.stringify({ devices: updatedDevices }, null, 2));
        
        try {
            await fsPromises.unlink(path.join(this.devicesDir, `${deviceId}.json`));
        } catch (error) {
            console.error('Error eliminando archivo de dispositivo:', error);
        }
    }

    async createDeviceFile(deviceId, deviceData) {
        const filePath = path.join(this.devicesDir, `${deviceId}.json`);
        await fsPromises.writeFile(filePath, JSON.stringify(deviceData, null, 2));
    }

    async verifyDevice(deviceId) {
        try {
            const devices = await this.getDevicesList();
            return devices.some(d => d.id === deviceId);
        } catch (error) {
            return false;
        }
    }

    async updateDeviceStatus(deviceId, isActive) {
        const devices = await this.getDevicesList();
        const device = devices.find(d => d.id === deviceId);
        if (device) {
            device.isActive = isActive;
            device.lastConnection = Date.now();
            await fsPromises.writeFile(this.passFile, JSON.stringify({ devices }, null, 2));
        }
    }
}

module.exports = new PassManager();