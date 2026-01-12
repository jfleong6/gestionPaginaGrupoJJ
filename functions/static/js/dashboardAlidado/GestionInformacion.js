class GestionInformacion {
    constructor(parent) {
        this.parent = parent;
        this.editMode = false;
    }

    render() {
        const p = this.parent.p;
        const target = document.getElementById('tab-info');
        if (!target) return;

        target.innerHTML = `
            <div class="info-container animate__animated animate__fadeIn">
                

                <form id="form-info-proyecto">
                    <div class="info-card">
                        <div class="info-card-header"><i class="fas fa-id-card"></i> Datos del Negocio
                            <div class="info-header-actions">
                                <button class="edit-main-btn" onclick="gp.infoManager.toggleEdit()">
                                    ${this.editMode ? '<i class="fas fa-times"></i> Cancelar' : '<i class="fas fa-edit"></i> Editar Información'}
                                </button>
                                ${this.editMode ? `<button type="button" class="save-main-btn" onclick="gp.infoManager.saveChanges()"><i class="fas fa-save"></i> Guardar Cambios</button>` : ''}
                            </div>
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Nombre del Negocio</label>
                                ${this.renderField('nombre_negocio', p.nombre_negocio)}
                            </div>
                            <div class="info-item">
                                <label>Eslogan</label>
                                ${this.renderField('eslogan', p.eslogan)}
                            </div>
                            <div class="info-item">
                                <label>Categoría</label>
                                ${this.renderField('categoria', p.categoria)}
                            </div>
                        </div>
                    </div>

                    <div class="info-card">
                        <div class="info-card-header"><i class="fas fa-palette"></i> Identidad Visual</div>
                        <div class="branding-section">
                            <div class="info-item">
                                <label>Tipografía Principal</label>
                                ${this.renderField('fuente', p.branding.fuente, 'text', 'fuente')}
                            </div>
                            <div class="info-item">
                                <label>Paleta de Colores (Clic para editar)</label>
                                <div class="color-palette">
                                    ${p.branding.colores.map((color, index) => `
                                        <div class="color-swatch-container">
                                            <div class="color-swatch" style="background-color: ${color}">
                                                ${this.editMode ?
                `<input type="color" name="color_${index}" value="${this.rgbToHex(color)}" onchange="gp.infoManager.updateVisualColor(this)">`
                : `<span onclick="gp.infoManager.copyColor('${color}')"></span>`}
                                            </div>
                                            <small>${color}</small>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="info-card">
                        <div class="info-card-header"><i class="fas fa-share-alt"></i> Contacto y Redes</div>
                        <div class="info-grid">
                            <div class="info-item">
                                <label><i class="fab fa-whatsapp"></i> WhatsApp</label>
                                ${this.renderField('whatsapp', p.contacto.whatsapp, 'tel')}
                            </div>
                            <div class="info-item">
                                <label><i class="fas fa-envelope"></i> Email</label>
                                ${this.renderField('email', p.contacto.email, 'email')}
                            </div>
                            <div class="info-item">
                                <label><i class="fab fa-facebook"></i> Facebook</label>
                                ${this.renderField('facebook', p.contacto.facebook)}
                            </div>
                            <div class="info-item">
                                <label><i class="fab fa-tiktok"></i> TikTok</label>
                                ${this.renderField('tiktok', p.contacto.tiktok)}
                            </div>
                            <div class="info-item">
                                <label><i class="fab fa-linkedin"></i> Linkedin (Usuario)</label>
                                ${this.renderField('linkedin', p.contacto.linkedin)}
                            </div>
                            <div class="info-item">
                                <label><i class="fab fa-instagram"></i> Instagram (Usuario)</label>
                                ${this.renderField('instagram', p.contacto.instagram)}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    renderField(name, value, type = 'text', subkey = null) {
        if (this.editMode) {
            return `<input type="${type}" name="${name}" value="${value || ''}" class="info-input" data-subkey="${subkey}">`;
        }
        return `<span class="info-value">${value || '---'}</span>`;
    }

    toggleEdit() {
        this.editMode = !this.editMode;
        this.render();
    }

    updateVisualColor(input) {
        input.parentElement.style.backgroundColor = input.value;
        input.parentElement.nextElementSibling.innerText = input.value.toUpperCase();
    }

    rgbToHex(color) {
        if (color.startsWith('#')) return color;
        return "#000000"; // Fallback simple
    }

    copyColor(hex) {
        navigator.clipboard.writeText(hex);
        alert(`Color ${hex} copiado`);
    }

    async saveChanges() {
        // 1. Capturar el elemento y los datos inmediatamente
        const form = document.getElementById('form-info-proyecto');
        if (!form) return;

        // Extraemos los datos antes de cualquier proceso 'await'
        const formData = new FormData(form);

        // 2. Construir el objeto de actualización (con tus nuevos campos)
        const updatedData = {
            id_cliente: this.parent.p.cliente_id,
            id_proyecto: this.parent.p.proyecto_id,
            nombre_negocio: formData.get('nombre_negocio'),
            eslogan: formData.get('eslogan'),
            categoria: formData.get('categoria'),
            branding: {
                fuente: formData.get('fuente'),
                colores: [
                    formData.get('color_0'),
                    formData.get('color_1'),
                    formData.get('color_2'),
                    formData.get('color_3')
                ]
            },
            contacto: {
                whatsapp: formData.get('whatsapp'),
                email: formData.get('email'),
                instagram: formData.get('instagram'),
                facebook: formData.get('facebook'),
                linkedin: formData.get('linkedin'),
                tiktok: formData.get('tiktok')
            }
        };

        // 3. Feedback visual al usuario
        const btnSave = document.querySelector('.save-main-btn');
        const originalText = btnSave ? btnSave.innerHTML : '';
        if (btnSave) {
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btnSave.disabled = true;
        }

        try {
            const res = await fetch('/aliado/actualizar_info_proyecto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            const responseData = await res.json();

            if (res.ok && responseData.status === "success") {
                // 4. Actualización PROFUNDA de la variable global
                // Esto asegura que todas las pestañas vean los cambios
                this.parent.p = {
                    ...this.parent.p, // Mantenemos tareas y otros datos
                    ...updatedData,    // Sobrescribimos con lo nuevo
                    branding: { ...updatedData.branding },
                    contacto: { ...updatedData.contacto }
                };

                // 5. Salir de edición y refrescar interfaz
                this.editMode = false;
                this.render();

                // Actualizar el título de la página
                const titleSpan = document.getElementById('section-title');
                if (titleSpan) {
                    titleSpan.innerHTML = `Proyecto: <span class="section-title-proyecto">${updatedData.nombre_negocio}</span>`;
                }
            } else {
                throw new Error(responseData.message || "Error en el servidor");
            }
        } catch (error) {
            console.error("Error crítico:", error);
            alert("No se pudo guardar: " + error.message);

            // Restaurar botón si falla
            if (btnSave) {
                btnSave.innerHTML = originalText;
                btnSave.disabled = false;
            }
        }
    }
}