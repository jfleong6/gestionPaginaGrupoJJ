class GestionProyecto {
    constructor(containerId, proyecto) {
        this.container = document.getElementById(containerId);
        this.p = proyecto;
        this.seccionActual = 'info';
        document.getElementById('section-title').innerHTML = 'Proyecto: </span class = "section-title-proyecto">' + this.p.nombre_negocio + '</span>';

    }
    init() {
        this.render();
        this.loadTasks();
        this.setupBtnsAgregarTarea();
        this.setupFormularioTask(); 
        this.setupFormularioNotas();

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
                        <!-- Columna: Por hacer -->
                        <div class="task-column" id="todoColumn">
                            <div class="column-header">
                                <h3><i class="fas fa-circle"></i> Por hacer</h3>
                                <span class="task-count" id="todoCount">0</span>
                            </div>
                            <div class="task-list" id="todoList" data-status="todo">
                            </div>
                            <div class="column-footer">
                                <button id="addTaskBtnTodo" class="add-task-btn" data-column="todo">
                                    <i class="fas fa-plus"></i> Agregar tarea
                                </button>
                            </div>
                        </div>

                        <!-- Columna: En progreso -->
                        <div class="task-column" id="progressColumn">
                            <div class="column-header">
                                <h3><i class="fas fa-spinner"></i> En progreso</h3>
                                <span class="task-count" id="progressCount">0</span>
                            </div>
                            <div class="task-list" id="progressList" data-status="progress">
                            </div>
                        </div>

                        <!-- Columna: En por aprobar -->
                        <div class="task-column" id="approveColumn">
                            <div class="column-header">
                                <h3><i class="fas fa-user-check"></i> Por aprobar</h3>
                                <span class="task-count" id="approveCount"></span>
                            </div>
                            <div class="task-list" id="approveList" data-status="approve">

                            </div>

                        </div>

                        <!-- Columna: Completadas -->
                        <div class="task-column" id="doneColumn">
                            <div class="column-header">
                                <h3><i class="fas fa-check-circle"></i> Completadas</h3>
                                <span class="task-count" id="doneCount">0</span>
                            </div>
                            <div class="task-list" id="doneList" data-status="done">

                            </div>

                        </div>
                    </div>

                </div>
                <div id="tab-info" class="gestion-content hidden" data-tab="info">
                    <h2>Cargando informacion...</h2>
                </div>
                <div id="tab-pagos" class="gestion-content hidden" data-tab="pagos">
                    <h2>Cargando pagos...</h2>
                </div>

            </div>
            </div> 
            <div id="modal-overlay-task" class="modal-overlay hidden">
            <div class="modal-content animate__animated animate__zoomIn">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> Nueva Tarea</h3>
                    <button class="close-modal" onclick="gp.cerrarModal()">&times;</button>
                </div>
                <form id="taskForm" class="task-form">
                    <div class="form-group">
                        <input type="text" id="taskTitle" placeholder="Título de la tarea" required>
                    </div>
                    <div class="form-group">
                        <textarea id="taskDescription" placeholder="Descripción (opcional)" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="taskCategory"><i class="fas fa-tag"></i> Categoría</label>
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
                            <button type="button" class="priority-btn low" onclick="gp.setPriority(this, 'low')">Baja</button>
                            <button type="button" class="priority-btn medium gp-active" onclick="gp.setPriority(this, 'medium')">Media</button>
                            <button type="button" class="priority-btn high" onclick="gp.setPriority(this, 'high')">Alta</button>
                        </div>
                    </div>
                    <button type="submit" class="btn-submit">
                        <i class="fas fa-plus-circle"></i> Agregar Tarea
                    </button>
                </form>
            </div>
        </div>
        <div id="modal-overlay-task-notas" class="modal-overlay hidden">
            <div class="modal-content animate__animated animate__zoomIn">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> Nueva Nota</h3>
                    <button class="close-modal" onclick="gp.cerrarModalNota()">&times;</button>
                </div>
                <form id="taskFormNote" class="task-form">
                    <div class="form-group">
                        <input type="text" id="taskNote" placeholder="Nueva nota" required>
                    </div>
                    <button type="submit" class="btn-submit">
                        <i class="fas fa-plus-circle"></i> Agregar Nota
                    </button>
                </form>
                
            </div>
        </div>
`;
    }

    cambiarTab(btn, tabName) {
        // 1. Estética de botones
        document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('gp-active'));
        btn.classList.add('gp-active');

        // 2. Ocultar todos los contenidos
        document.querySelectorAll('.gestion-content').forEach(content => {
            content.classList.add('hidden');
        });

        // 3. Mostrar el seleccionado
        const target = document.getElementById(`tab-${tabName}`);
        if (target) {
            target.classList.remove('hidden');
        }

        // 4. Cargar datos específicos si es necesario
        if (tabName === 'info') this.loadInfo();
        if (tabName === 'pagos') this.loadPagos();
        if (tabName === 'task') this.loadTasks(); // Tu Kanban
    }

    // Dentro de la clase GestionProyecto

    setupBtnsAgregarTarea() {
        const btn = document.getElementById('addTaskBtnTodo');
        btn.addEventListener('click', () => {
            this.selectedPriority = 'medium'; // Reset prioridad
            document.getElementById('modal-overlay-task').classList.remove('hidden');
        });

    }


    cerrarModal() {
        document.getElementById('modal-overlay-task').classList.add('hidden');
        document.getElementById('taskForm').reset();
    }

    setPriority(btn, level) {
        this.selectedPriority = level;
        // Estética de botones
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('gp-active'));
        btn.classList.add('gp-active');
    }

    setupFormularioTask() {
    const form = document.getElementById('taskForm');
    if (!form) return;

    form.onsubmit = async (e) => { // Usar onsubmit evita duplicidad de eventos
        e.preventDefault();

        const payload = {
            id_cliente: this.p.cliente_id,
            id_proyecto: this.p.proyecto_id,
            titulo: document.getElementById('taskTitle').value,
            descripcion: document.getElementById('taskDescription').value,
            categoria: document.getElementById('taskCategory').value,
            prioridad: this.selectedPriority || 'medium',
            status: 'todo', // Importante para que renderizarTarea sepa dónde ponerla
            historial_notas: [] // Evita errores al intentar leer notas inexistentes
        };

        try {
            const res = await fetch('/aliado/agregar_tarea', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json(); // <--- Obtener el JSON del servidor

            if (res.ok && data.status === "success") {
                this.cerrarModal();
                // Renderizado local inmediato
                this.renderizarTarea({
                    ...payload, 
                    id: data.tarea_id // Usar el ID real devuelto por Firestore
                }); 
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };
}

    setupFormularioNotas() {
        const form = document.getElementById('taskFormNote');

        form.addEventListener('submit', async (e) => {


            e.preventDefault();

            const payload = {
                id_cliente: this.p.cliente_id, // Asegúrate que sea cliente_id o id según tu objeto
                id_proyecto: this.p.proyecto_id, // Asegúrate que sea proyecto_id o id según tu objeto
                id_tarea: this.taskId,
                nota: document.getElementById('taskNote').value
            };
            try {
                const res = await fetch('/aliado/agregar_nota', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    this.cerrarModalNota();
                    this.loadTasksNota(this.taskId, document.getElementById('taskNote').value); // Recargar el Kanban
                }
            } catch (error) {
                console.error("Error:", error);
            }
        });
    }

    loadTasks() {
        this.p.tareas.forEach(tarea => {
            this.renderizarTarea(tarea);
        });
    }

    loadInfo() {
        const target = document.getElementById('tab-info');
        target.innerHTML = `
        <div class="info-card">
            <h3>Detalles del Negocio</h3>
            <p><strong>Nombre:</strong> ${this.p.nombre_negocio}</p>
            <p><strong>Categoría:</strong> ${this.p.categoria}</p>
            </div>
    `;
    }

    loadPagos() {
        const target = document.getElementById('tab-pagos');
        target.innerHTML = `
        <div class="pagos-card">
            <h3>Historial de Pagos</h3>
            </div>
    `;
    }

    formatearFecha(fechaGmt) {
        if (!fechaGmt) return 'N/A';

        // Convertimos el string GMT o el Timestamp a objeto Date
        const fecha = new Date(fechaGmt);

        // Configuramos el formato local de Colombia
        return new Intl.DateTimeFormat('es-CO', {
            dateStyle: 'long',   // "9 de enero de 2026"
            timeStyle: 'short',  // "4:57 p. m."
            timeZone: 'America/Bogota'
        }).format(fecha);
    }

    renderizarTarea(t) {
        const columnas = {
            'todo': document.getElementById('todoList'),
            'progress': document.getElementById('progressList'),
            'approve': document.getElementById('approveList'),
            'done': document.getElementById('doneList')
        };
        const contadorIds = {
            'todo': 'todoCount', 'progress': 'progressCount', 'approve': 'approveCount', 'done': 'doneCount'
        };

        const contenedor = columnas[t.status] || columnas['todo'];

        // Actualizar contador
        const badge = document.getElementById(contadorIds[t.status] || 'todoCount');
        badge.innerText = parseInt(badge.innerText || 0) + 1;

        const fechaHtml = t.fecha_limite ? `<div class="task-due-date"><i class="far fa-calendar"></i> ${this.formatearFechaCorta(t.fecha_limite)}</div>` : '';

        // CAMBIO: Usamos una CLASE para las notas, no un ID único
        const taskHtml = `
    <div id="task-${t.id}" class="task-card ${t.categoria} ${t.prioridad}" draggable="true" ondragstart="gp.drag(event, '${t.id}')">
        <div class="task-card-header">
            <div class="task-title">${t.titulo}</div>
            <div class="task-actions">
                <button title="Agregar nota" class="task-action-btn" onclick="gp.abrirModalAgregarnotas('${t.id}','${t.titulo}')">
                    <i class="fas fa-note-sticky"></i>
                </button>
                <button title="Completar" class="task-action-btn" onclick="gp.cambiarEstadoRapido('${t.id}', 'done')">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        </div>
        <div class="task-description">${t.descripcion || ''}</div>
        <div class="task-footer">
            <div class="task-meta">
                <span class="task-category ${t.categoria}">${t.categoria}</span>
                <span class="task-priority ${t.prioridad}">${t.prioridad}</span>
            </div>
            ${fechaHtml}
        </div>
        <details class="VerNotas">
            <summary>Notas (${t.historial_notas ? t.historial_notas.length : 0})</summary>
            <ul class="list-note"></ul> </details>
    </div>`;

        contenedor.insertAdjacentHTML('beforeend', taskHtml);

        // Renderizar notas si existen
        if (t.historial_notas && Array.isArray(t.historial_notas)) {
            t.historial_notas.forEach(nota => {
                this.loadTasksNota(t.id, nota.comentario);
            });
        }
    }

    loadTasksNota(id_task, textoNota) {
        // Buscamos el contenedor de la tarea específica por su ID
        const taskElement = document.getElementById(`task-${id_task}`);
        if (!taskElement) return;

        // Buscamos la lista de notas dentro de ESA tarea usando su clase
        const listNote = taskElement.querySelector('.list-note');

        if (listNote) {
            const li = document.createElement('li');
            li.textContent = textoNota;
            listNote.appendChild(li);
        }
    }

    abrirModalAgregarnotas(taskId, taskTitulo) {
        this.taskId = taskId;
        document.getElementById('modal-overlay-task-notas').classList.remove('hidden');



    }
    cerrarModalNota() {
        document.getElementById('modal-overlay-task-notas').classList.add('hidden');
        document.getElementById('taskFormNote').reset();
    }
}

