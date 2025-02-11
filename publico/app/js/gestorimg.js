export class GestorImagenesApp {
    constructor() {
        this.tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.maxSize = 5 * 1024 * 1024; // 5MB
        this.rutaImagenes = 'sport/assets/productos/';
        this.imagenesTemporales = new Map(); // Para almacenar imágenes temporalmente
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
            
            // Guardar imagen temporalmente
            this.imagenesTemporales.set(nombreImagen, {
                base64,
                tipo: file.type
            });

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
        const timestamp = Date.now();
        return `prod_${timestamp}_${file.name}`;
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
            // Subir a Cloudinary como WebP
            const response = await fetch('/api/cloudinary/upload-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imagen: base64,
                    nombre: nombreImagen.split('.')[0], // Nombre sin extensión
                    ruta: 'sport/assets/productos'
                })
            });

            if (!response.ok) throw new Error('Error al subir imagen');
            const result = await response.json();
            return result.url; // Retorna la URL completa de Cloudinary
        } catch (error) {
            throw new Error('Error al guardar imagen: ' + error.message);
        }
    }

    extraerPublicId(rutaImagen) {
        const urlParts = rutaImagen.split('/upload/');
        if (urlParts.length > 1) {
            return urlParts[1].split('/').slice(1).join('/').split('.')[0];
        }
        throw new Error('URL de imagen inválida');
    }
    
    async eliminarImagenFisica(rutaImagen) {
        try {
            const response = await fetch('/api/cloudinary/delete-image', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    public_id: this.extraerPublicId(rutaImagen)
                })
            });
    
            if (!response.ok) throw new Error('Error al eliminar la imagen');
            return true;
        } catch (error) {
            throw new Error('Error al eliminar imagen física: ' + error.message);
        }
    }

    async guardarImagenesFinales(imagenes) {
        const imagenesGuardadas = [];
        
        for (const imagen of imagenes) {
            const datosTemp = this.imagenesTemporales.get(imagen.nombre);
            if (datosTemp) {
                try {
                    const url = await this.guardarImagenFisica(datosTemp.base64, imagen.nombre);
                    imagenesGuardadas.push(url); // Guardamos la URL de Cloudinary
                } catch (error) {
                    console.error('Error al guardar imagen:', error);
                }
            }
        }

        this.imagenesTemporales.clear();
        return imagenesGuardadas; // Retornamos array de URLs de Cloudinary
    }

    limpiarImagenesTemporales() {
        this.imagenesTemporales.clear();
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
} 