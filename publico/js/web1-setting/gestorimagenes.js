export class GestorImagenes {
    constructor() {
        this.tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.maxSize = 5 * 1024 * 1024; // 5MB
        this.rutaImagenes = 'sport/assets/productos/';
    }

    async procesarNuevaImagen(file, productoId) {
        if (!file) return null;

        // Validaciones
        if (!this.validarTipoArchivo(file)) {
            throw new Error('Formato no válido. Use: JPG, PNG, GIF o WEBP');
        }

        if (!this.validarTamano(file)) {
            throw new Error('La imagen no debe superar 5MB');
        }

        try {
            const base64 = await this.fileToBase64(file);
            const nombreImagen = this.generarNombreImagen(file, productoId);
            return {
                base64,
                nombre: nombreImagen
            };
        } catch (error) {
            console.error('Error al procesar imagen:', error);
            throw new Error('Error al procesar la imagen');
        }
    }

    validarTipoArchivo(file) {
        return this.tiposPermitidos.includes(file.type);
    }

    validarTamano(file) {
        return file.size <= this.maxSize;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    generarNombreImagen(file, productoId) {
        const extension = file.name.split('.').pop().toLowerCase();
        const timestamp = Date.now();
        return `prod${productoId}_${timestamp}.${extension}`;
    }

    crearElementoImagen(base64Url, nombre, index, modoEliminar, onClickEliminar) {
        const nuevoItem = document.createElement('div');
        nuevoItem.className = 'imagen-item' + (modoEliminar ? ' modo-eliminar' : '');
        nuevoItem.dataset.index = index;
        nuevoItem.dataset.nombre = nombre;
        nuevoItem.innerHTML = `<img src="${base64Url}" alt="Nueva imagen">`;
        
        if (modoEliminar && onClickEliminar) {
            nuevoItem.onclick = () => onClickEliminar(index);
        }
        
        return nuevoItem;
    }

    async guardarImagenFisica(base64, nombreImagen) {
        try {
            // Convertir a WebP y optimizar antes de subir
            const optimizedImage = await this.optimizarImagen(base64);
            
            // Subir a Cloudinary como WebP
            const response = await fetch('/api/cloudinary/upload-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imagen: optimizedImage,
                    nombre: nombreImagen.replace(/\.[^/.]+$/, '.webp'),
                    ruta: this.rutaImagenes
                })
            });

            if (!response.ok) throw new Error('Error al subir imagen');
            return await response.json();
        } catch (error) {
            throw new Error('Error al guardar imagen: ' + error.message);
        }
    }

    async eliminarImagenFisica(nombreImagen) {
        try {
            const response = await fetch('/api/eliminar-imagen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: nombreImagen,
                    ruta: this.rutaImagenes
                })
            });

            if (!response.ok) throw new Error('Error al eliminar la imagen');
            return true;
        } catch (error) {
            throw new Error('Error al eliminar imagen física: ' + error.message);
        }
    }

    async actualizarReferenciaJSON(productoId, imagenes) {
        try {
            const response = await fetch('/api/actualizar-json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    productoId,
                    imagenes
                })
            });

            if (!response.ok) throw new Error('Error al actualizar JSON');
            return true;
        } catch (error) {
            throw new Error('Error al actualizar referencias en JSON: ' + error.message);
        }
    }

    async procesarCambiosImagenes(productoId, imagenesNuevas, imagenesEliminadas) {
        // 1. Primero eliminar referencias del JSON
        if (imagenesEliminadas.length > 0) {
            await this.actualizarReferenciaJSON(productoId, 
                imagenesEliminadas.map(img => img.nombre));
        }

        // 2. Eliminar archivos físicos
        for (const imagen of imagenesEliminadas) {
            await this.eliminarImagenFisica(imagen.nombre);
        }

        // 3. Guardar nuevas imágenes físicas
        const nuevasReferencias = [];
        for (const imagen of imagenesNuevas) {
            const nombreGuardado = await this.guardarImagenFisica(
                imagen.base64,
                imagen.nombre
            );
            nuevasReferencias.push(nombreGuardado);
        }

        // 4. Actualizar JSON con nuevas referencias
        if (nuevasReferencias.length > 0) {
            await this.actualizarReferenciaJSON(productoId, nuevasReferencias);
        }

        return nuevasReferencias;
    }
} 