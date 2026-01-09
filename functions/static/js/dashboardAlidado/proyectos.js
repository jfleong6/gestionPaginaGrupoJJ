/**
 * Módulo de Gestión de Proyectos - Grupo JJ
 * Arquitectura: POO (Programación Orientada a Objetos)
 * Estructura: Stepper (4 Etapas)
 */

class ModuloProyectos {
    constructor(containerId) {
        this.container = containerId;
        this.currentStep = 1;
        this.listaClientes = [];
    }

    /**
     * Inicialización del módulo
     */
    async init() {
        this.renderLayout();
        this.setupEventListeners();
        await this.cargarProyectos();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="proyectos-container">
                <div class="proyectos-grid" id="grid-proyectos">
                    <div class="loader">Cargando proyectos...</div>
                </div>
                
                <button class="btn-add-float" id="open-project-modal">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>

            <div id="modal-proyecto" class="modal">
                <div class="modal-content" style="max-width: 850px;">
                    
                    <div class="stepper-header">
                        <div class="step-dot active" data-step="1">1</div>
                        <div class="step-dot" data-step="2">2</div>
                        <div class="step-dot" data-step="3">3</div>
                        <div class="step-dot" data-step="4">4</div>
                    </div>

                    <form id="form-proyecto-data" class="modal-body-scroll">
                        
                        <div class="step-container active" id="step-1">
                            <h4 class="section-title">1. Información del Negocio</h4>
                            <div class="form-grid-2">
                                <div class="input-group">
                                    <label>Seleccionar Cliente</label>
                                    <select id="sel-cliente" required></select>
                                </div>
                                <div class="input-group">
                                    <label>Nombre del Establecimiento</label>
                                    <input type="text" id="p-nombre" placeholder="Ej: Restaurante Delicias" required>
                                </div>
                                <div class="input-group">
                                    <label>Categoría</label>
                                    <select id="sel-cat">
                                        <option value="Restaurante">🍽️ Restaurante</option>
                                        <option value="Tienda">🛍️ Almacén / Tienda</option>
                                        <option value="Portafolio">💼 Portafolio</option>
                                    </select>
                                </div>
                                <div class="input-group">
                                    <label>Eslogan</label>
                                    <input type="text" id="p-eslogan" placeholder="La mejor experiencia...">
                                </div>
                            </div>
                        </div>

                        <div class="step-container" id="step-2">
                            <h4 class="section-title">2. Canales de Contacto</h4>
                            <div class="form-grid-2">
                                <div class="input-group">
                                    <label>WhatsApp</label>
                                    <input type="text" id="p-wa" placeholder="Número con código de país">
                                </div>
                                <div class="input-group">
                                    <label>Correo Oficial</label>
                                    <input type="email" id="p-correo" placeholder="contacto@negocio.com">
                                </div>
                                <div class="input-group">
                                    <label>Instagram</label>
                                    <input type="text" id="p-ig" placeholder="Link o @usuario">
                                </div>
                                <div class="input-group">
                                    <label>TikTok / Facebook</label>
                                    <input type="text" id="p-social-extra" placeholder="Otras redes sociales">
                                </div>
                            </div>
                        </div>

                        <div class="step-container" id="step-3">
                            <h4 class="section-title">3. Branding e Identidad</h4>
                            <div class="input-group full-row">
                                <label>Paleta de Colores (Click para elegir)</label>
                                <div class="palette-selection">
                                    <div class="color-block">
                                        <input type="color" id="c1" value="#3b82f6" class="color-picker">
                                        <span class="color-code" id="hex1">#3B82F6</span>
                                    </div>
                                    <div class="color-block">
                                        <input type="color" id="c2" value="#1e293b" class="color-picker">
                                        <span class="color-code" id="hex2">#1E293B</span>
                                    </div>
                                    <div class="color-block">
                                        <input type="color" id="c3" value="#00d2ff" class="color-picker">
                                        <span class="color-code" id="hex3">#00D2FF</span>
                                    </div>
                                    <div class="color-block">
                                        <input type="color" id="c4" value="#ffffff" class="color-picker">
                                        <span class="color-code" id="hex4">#FFFFFF</span>
                                    </div>
                                </div>
                            </div>
                            <div class="input-group full-row">
                                <label>Tipografía de Google Fonts</label>
                                <input type="text" id="p-fuente" placeholder="Ej: Montserrat, Roboto, Lora">
                                <div id="font-preview" class="font-preview-box">Vista Previa de Identidad</div>
                            </div>
                        </div>

                        <div class="step-container" id="step-4">
                            <h4 class="section-title">4. Recursos Finales</h4>
                            <div class="form-grid-2">
                                <div class="input-group">
                                    <label>URL del Logo / Icono</label>
                                    <input type="text" id="p-logo" placeholder="Enlace directo a la imagen">
                                </div>
                                <div class="input-group">
                                    <label>Observaciones /notas</label>
                                    <input type="text" id="p-observaciones" placeholder="Observaciones o notas adicionales">
                                </div>
                                <div class="input-group">
                                    <label>Ubicación (Google Maps)</label>
                                    <input type="text" id="p-mapa" placeholder="Link de Google Maps o Coordenadas">
                                </div>
                                <div class="input-group" style="display: flex; align-items: flex-end;">
                                    <button type="button" id="get-geo" class="btn-secondary" style="width: 100%;">
                                        <i class="fa-solid fa-location-crosshairs"></i> GPS Actual
                                    </button>
                                </div>
                                
                            </div>
                        </div>

                        <div class="modal-footer-steps">
                            <button type="button" class="btn-secondary" id="prev-step" style="visibility: hidden;">Anterior</button>
                            <div class="modal-footer-right">
                                <button type="button" class="btn-secondary" id="close-project-modal">Cancelar</button>
                                <button type="button" class="btn-primary" id="next-step">Siguiente</button>
                                <button type="submit" class="btn-success btn-primary" id="final-submit" style="display: none;">
                                    <i class="fa-solid fa-cloud-arrow-up"></i> Guardar Proyecto
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * Configuración de eventos y lógica interactiva
     */
    setupEventListeners() {
        const modal = document.getElementById('modal-proyecto');
        const form = document.getElementById('form-proyecto-data');
        const btnOpen = document.getElementById('open-project-modal');
        const btnClose = document.getElementById('close-project-modal');

        const nextBtn = document.getElementById('next-step');
        const prevBtn = document.getElementById('prev-step');
        const submitBtn = document.getElementById('final-submit');

        // 1. Lógica del Stepper (Navegación)
        nextBtn.onclick = () => { if (this.currentStep < 4) { this.currentStep++; this.updateStepUI(); } };
        prevBtn.onclick = () => { if (this.currentStep > 1) { this.currentStep--; this.updateStepUI(); } };

        // 2. Control del Modal
        btnOpen.onclick = () => {
            this.currentStep = 1;
            this.updateStepUI();
            modal.style.display = 'flex';
            this.cargarClientesSelect();
        };

        btnClose.onclick = () => {
            modal.style.display = 'none';
            form.reset();
            document.getElementById('font-preview').style.fontFamily = 'inherit';
        };

        // 3. Branding: Feedback de Colores
        document.querySelectorAll('.color-picker').forEach((picker, i) => {
            picker.oninput = () => {
                const hexLabel = document.getElementById(`hex${i + 1}`);
                hexLabel.innerText = picker.value.toUpperCase();
                hexLabel.style.color = picker.value;
                picker.classList.add('color-selected');
            };
        });

        // 4. Branding: Tipografía Dinámica
        const fuenteInput = document.getElementById('p-fuente');
        fuenteInput.oninput = () => {
            const font = fuenteInput.value.trim();
            if (font.length > 3) {
                document.getElementById('font-preview').style.fontFamily = font;
                const link = document.createElement('link');
                link.href = `https://fonts.googleapis.com/css?family=${font.replace(/\s+/g, '+')}&display=swap`;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
        };

        // 5. Geolocalización
        document.getElementById('get-geo').onclick = (e) => {
            if (navigator.geolocation) {
                e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                navigator.geolocation.getCurrentPosition(pos => {
                    document.getElementById('p-mapa').value = `${pos.coords.latitude}, ${pos.coords.longitude}`;
                    e.target.innerHTML = '<i class="fa-solid fa-check"></i> Listo';
                });
            }
        };

        // 6. Submit Final al Backend
        form.onsubmit = async (e) => {
            e.preventDefault();
            const clienteId = document.getElementById('sel-cliente').value;

            const payload = {
                nombre_negocio: document.getElementById('p-nombre').value,
                categoria: document.getElementById('sel-cat').value,
                eslogan: document.getElementById('p-eslogan').value,
                contacto: {
                    whatsapp: document.getElementById('p-wa').value,
                    email: document.getElementById('p-correo').value,
                    instagram: document.getElementById('p-ig').value,
                    social_extra: document.getElementById('p-social-extra').value
                },
                branding: {
                    colores: [
                        document.getElementById('c1').value,
                        document.getElementById('c2').value,
                        document.getElementById('c3').value,
                        document.getElementById('c4').value
                    ],
                    fuente: fuenteInput.value
                },
                recursos: {
                    logo_url: document.getElementById('p-logo').value,
                    mapa_url: document.getElementById('p-mapa').value
                },
                oboservaciones: document.getElementById('p-observaciones').value
            };

            try {
                const res = await fetch(`/aliado/crear_proyecto/${clienteId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if ((await res.json()).status === 'success') {
                    alert("✅ Proyecto guardado correctamente.");
                    btnClose.onclick();
                    this.cargarProyectos();
                }
            } catch (err) { console.error("Error guardando proyecto:", err); }
        };
    }

    /**
     * Actualiza la visualización de los pasos en el modal
     */
    updateStepUI() {
        document.querySelectorAll('.step-container').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.step-dot').forEach(d => d.classList.remove('active'));

        document.getElementById(`step-${this.currentStep}`).classList.add('active');
        document.querySelector(`.step-dot[data-step="${this.currentStep}"]`).classList.add('active');

        document.getElementById('prev-step').style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';

        if (this.currentStep === 4) {
            document.getElementById('next-step').style.display = 'none';
            document.getElementById('final-submit').style.display = 'inline-block';
        } else {
            document.getElementById('next-step').style.display = 'inline-block';
            document.getElementById('final-submit').style.display = 'none';
        }
    }

    /**
     * Carga la lista de clientes del aliado para el selector del modal
     */
    async cargarClientesSelect() {
        const select = document.getElementById('sel-cliente');
        try {
            const res = await fetch('/aliado/obtener_clientes');
            const r = await res.json();
            select.innerHTML = '<option value="">Seleccione Cliente...</option>' +
                r.data.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        } catch (e) { select.innerHTML = '<option>Error al cargar</option>'; }
    }

    /**
     * Carga todos los proyectos del aliado y los renderiza en tarjetas
     */
    async cargarProyectos() {
        const grid = document.getElementById('grid-proyectos');
        try {
            const res = await fetch('/aliado/obtener_todos_los_proyectos');
            const r = await res.json();

            if (r.data.length === 0) {
                grid.innerHTML = '<p class="full-row">No hay proyectos registrados.</p>';
                return;
            }

            grid.innerHTML = r.data.map(p => `
                <div class="proyecto-card" style="border-top: 5px solid ${p.branding?.colores[0] || '#3b82f6'}">
                    <div class="card-header">
                        <div class="project-logo" style="background:${p.branding?.colores[0] || '#3b82f6'}20; color:${p.branding?.colores[0] || '#3b82f6'}">
                            <i class="fa-solid fa-store"></i>
                        </div>
                        <div>
                            <h3>${p.nombre_negocio || 'Sin Nombre'}</h3>
                            <p>${p.categoria}</p>
                        </div>
                    </div>
                    <div class="project-details">
                        <p><i class="fa-solid fa-user"></i> ${p.cliente_nombre}</p>
                        <p><i class="fa-solid fa-envelope"></i> ${p.contacto?.email || 'N/A'}</p>
                    </div>
                    <div class="project-footer">
                        <span class="status-badge status-ok">${p.estado || 'Activo'}</span>
                        <button class="btn-icon" onclick="iniciarGestion('${p.proyecto_id}', '${p.cliente_id}')">
                            <i class="fa-solid fa-gear"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (e) { grid.innerHTML = '<p>Error al cargar proyectos.</p>'; }
    }

    
}

/**
 * Función puente con el dashboard principal
 */
function renderProyectos(container) {
    const modulo = new ModuloProyectos(container);
    modulo.init();
}