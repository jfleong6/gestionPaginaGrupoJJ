class GestionProyecto {
    constructor(containerId, proyecto) {
        this.container = document.getElementById(containerId);
        this.p = proyecto;
        this.seccionActual = 'info';
        
        // Variables globales para persistencia de datos
        this.tareasGlobales = this.p.tareas || [];
        
        // Inicializar los submódulos
        this.tareasManager = new GestionTareas(this.p.cliente_id, this.p.proyecto_id, this);
        this.notasManager = new GestionNotas(this.p.cliente_id, this.p.proyecto_id);

        document.getElementById('section-title').innerHTML = 'Proyecto: <span class="section-title-proyecto">' + this.p.nombre_negocio + '</span>';
        this.infoManager = new GestionInformacion(this);
        this.pagosManager = new GestionPagos(this);
    }

    init() {
        this.render();
        this.tareasManager.init(); // Inicializa el tablero Kanban
        this.setupGeneralEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="gestion-container">
                <div class="gestion-header">
                    <button class="tab-link gp-active" onclick="gp.cambiarTab(this, 'task')">Tareas</button>
                    <button class="tab-link " onclick="gp.cambiarTab(this, 'info')">Información</button>
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

                <div id="tab-info" class="gestion-content hidden" data-tab="info"><h2>Cargando informacion...</h2></div>
                <div id="tab-pagos" class="gestion-content hidden" data-tab="pagos"><h2>Cargando pagos...</h2></div>
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
        document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('gp-active'));
        btn.classList.add('gp-active');
        document.querySelectorAll('.gestion-content').forEach(content => content.classList.add('hidden'));
        
        const target = document.getElementById(`tab-${tabName}`);
        if (target) target.classList.remove('hidden');

        if (tabName === 'info') this.infoManager.render();
        if (tabName === 'pagos') this.pagosManager.render();
        if (tabName === 'task') this.tareasManager.loadTasks(this.tareasGlobales);
    }

    loadPagos() {
        document.getElementById('tab-pagos').innerHTML = `
            <div class="pagos-card"><h3>Historial de Pagos</h3></div>`;
    }
}