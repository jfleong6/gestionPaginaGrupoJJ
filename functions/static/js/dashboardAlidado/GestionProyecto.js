class GestionProyecto {
    constructor(containerId, proyecto) {
        this.container = document.getElementById(containerId);
        this.p = proyecto;
        this.seccionActual = 'task'; // Por defecto iniciamos en tareas
        
        // Variables globales para persistencia de datos
        this.tareasGlobales = this.p.tareas || [];
        
        // Inicializar los submódulos (Instancias)
        this.tareasManager = new GestionTareas(this.p.cliente_id, this.p.proyecto_id, this);
        this.notasManager = new GestionNotas(this.p.cliente_id, this.p.proyecto_id);
        this.infoManager = new GestionInformacion(this);
        this.pagosManager = new GestionPagos(this);

        // Actualizar título del proyecto en el DOM externo si existe
        const tituloEl = document.getElementById('section-title');
        if (tituloEl) {
            tituloEl.innerHTML = 'Proyecto: <span class="section-title-proyecto">' + this.p.nombre_negocio + '</span>';
        }
    }

    init() {
        // 1. Renderizar la estructura base HTML (Esqueleto)
        this.render();

        // 2. Cargar TAREAS (Prioridad Inmediata)
        // Inicializa el tablero Kanban para que el usuario lo vea al instante
        this.tareasManager.init(); 
        
        // 3. Configurar los eventos de los botones y formularios
        this.setupGeneralEvents();

        // 4. Carga diferida ("Segundo Plano")
        // Usamos un pequeño delay para permitir que el navegador pinte las tareas primero.
        // Luego cargamos Información y Pagos sin bloquear la interfaz.
        setTimeout(() => {
            this.cargarModulosSecundarios();
        }, 100);
    }

    cargarModulosSecundarios() {
        // Verifica si los managers tienen el método render y lo ejecuta
        // Esto llenará los divs ocultos con su contenido correspondiente
        if (this.infoManager && typeof this.infoManager.render === 'function') {
            this.infoManager.render();
        }
        
        if (this.pagosManager && typeof this.pagosManager.render === 'function') {
            this.pagosManager.render();
        } else {
            // Fallback por si no usas un manager externo para pagos
            this.loadPagosDefault();
        }
    }

    render() {
        // Renderizamos toda la estructura. Nota que los tabs info y pagos existen pero están ocultos (hidden)
        this.container.innerHTML = `
            <div class="gestion-container">
                <div class="gestion-header">
                    <button class="tab-link gp-active" onclick="gp.cambiarTab(this, 'task')">Tareas</button>
                    <button class="tab-link" onclick="gp.cambiarTab(this, 'info')">Información</button>
                    <button class="tab-link" onclick="gp.cambiarTab(this, 'pagos')">Pagos</button>
                </div>
                
                <div class="gestion-content" id="tab-task" data-tab="task">
                    <div class="board-container" id="boardContainer">
                        <div class="task-column" id="todoColumn">
                            <div class="column-header">
                                <h3><i class="fas fa-circle"></i> Por hacer</h3>
                                <span class="task-count" id="todoCount">0</span>
                            </div>
                            <div class="task-list" id="todoList" data-status="todo"></div>
                            <div class="column-footer">
                                <button id="addTaskBtnTodo" class="add-task-btn"><i class="fas fa-plus"></i> Agregar tarea</button>
                            </div>
                        </div>

                        <div class="task-column" id="progressColumn">
                            <div class="column-header">
                                <h3><i class="fas fa-spinner"></i> En progreso</h3>
                                <span class="task-count" id="progressCount">0</span>
                            </div>
                            <div class="task-list" id="progressList" data-status="progress"></div>
                        </div>

                        <div class="task-column" id="approveColumn">
                            <div class="column-header">
                                <h3><i class="fas fa-user-check"></i> Por aprobar</h3>
                                <span class="task-count" id="approveCount">0</span>
                            </div>
                            <div class="task-list" id="approveList" data-status="approve"></div>
                        </div>

                        <div class="task-column" id="doneColumn">
                            <div class="column-header">
                                <h3><i class="fas fa-check-circle"></i> Completadas</h3>
                                <span class="task-count" id="doneCount">0</span>
                            </div>
                            <div class="task-list" id="doneList" data-status="done"></div>
                        </div>
                    </div>
                </div>

                <div id="tab-info" class="gestion-content hidden" data-tab="info">
                    <div class="loading-placeholder">Cargando información...</div>
                </div>
                
                <div id="tab-pagos" class="gestion-content hidden" data-tab="pagos">
                    <div class="loading-placeholder">Cargando pagos...</div>
                </div>
            </div>

            <div id="modal-overlay-task" class="modal-overlay hidden">
                <div class="modal-content animate__animated animate__zoomIn">
                    <div class="modal-header">
                        <h3><i class="fas fa-plus"></i> Nueva Tarea</h3>
                        <button class="close-modal" onclick="gp.tareasManager.cerrarModal()">&times;</button>
                    </div>
                    <form id="taskForm" class="task-form">
                        <div class="form-group"><input type="text" id="taskTitle" placeholder="Título de la tarea" required></div>
                        <div class="form-group"><textarea id="taskDescription" placeholder="Descripción (opcional)" rows="3"></textarea></div>
                        <div class="form-group">
                            <label><i class="fas fa-tag"></i> Categoría</label>
                            <select id="taskCategory">
                                <option value="flyer">Flyer</option>
                                <option value="galería">Galeria</option>
                                <option value="portada">Portada</option>
                                <option value="contenido_textos">Contenido/Textos</option>
                                <option value="contacto">Contacto</option>
                                <option value="funcionalidad">Funcionalidad</option>
                                <option value="redes_sociales">Redes Sociales</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-flag"></i> Prioridad</label>
                            <div class="priority-selector">
                                <button type="button" class="priority-btn low" onclick="gp.tareasManager.setPriority(this, 'low')">Baja</button>
                                <button type="button" class="priority-btn medium gp-active" onclick="gp.tareasManager.setPriority(this, 'medium')">Media</button>
                                <button type="button" class="priority-btn high" onclick="gp.tareasManager.setPriority(this, 'high')">Alta</button>
                            </div>
                        </div>
                        <button type="submit" class="btn-submit"><i class="fas fa-plus-circle"></i> Agregar Tarea</button>
                    </form>
                </div>
            </div>

            <div id="modal-overlay-task-notas" class="modal-overlay hidden">
                <div class="modal-content animate__animated animate__zoomIn">
                    <div class="modal-header">
                        <h3><i class="fas fa-plus"></i> Nueva Nota</h3>
                        <button class="close-modal" onclick="gp.notasManager.cerrarModalNota()">&times;</button>
                    </div>
                    <form id="taskFormNote" class="task-form">
                        <div class="form-group"><input type="text" id="taskNote" placeholder="Nueva nota" required></div>
                        <button type="submit" class="btn-submit"><i class="fas fa-plus-circle"></i> Agregar Nota</button>
                    </form>
                </div>
            </div>
        `;
    }

    setupGeneralEvents() {
        this.tareasManager.setupBtnsAgregarTarea();
        this.tareasManager.setupFormularioTask();
        this.notasManager.setupFormularioNotas();
    }

    cambiarTab(btn, tabName) {
        // 1. Gestión visual de los botones (tabs)
        document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('gp-active'));
        btn.classList.add('gp-active');

        // 2. Gestión visual del contenido (ocultar todos, mostrar el seleccionado)
        document.querySelectorAll('.gestion-content').forEach(content => content.classList.add('hidden'));
        
        const target = document.getElementById(`tab-${tabName}`);
        if (target) {
            target.classList.remove('hidden');
        }

        // NOTA: Aquí ya NO llamamos a render() ni a loadTasks().
        // Todo el contenido ya fue cargado en el 'init' y persiste en el DOM oculto.
        // Esto hace el cambio instantáneo.
    }

    // Método de respaldo por si no usas un modulo externo de pagos
    loadPagosDefault() {
        const pagosContainer = document.getElementById('tab-pagos');
        if (pagosContainer) {
            pagosContainer.innerHTML = `<div class="pagos-card"><h3>Historial de Pagos</h3></div>`;
        }
    }
}