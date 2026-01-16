class GestionTareas {
    constructor(clienteId, proyectoId, parent) {
        this.clienteId = clienteId;
        this.proyectoId = proyectoId;
        this.parent = parent; // Referencia a GestionProyecto
        console.log("----------------------------------------");
        console.log(parent);
        console.log("----------------------------------------");

        this.selectedPriority = 'medium';
        this.estados = ['todo', 'progress', 'approve', 'done'];
    }

    init() {
        this.loadTasks(this.parent.tareasGlobales);
        // this.setupDragAndDrop();
    }

    loadTasks(tareas) {
        // 1. Limpiar listas y contadores
        this.estados.forEach(e => {
            const listElem = document.getElementById(`${e}List`);
            const countElem = document.getElementById(`${e}Count`);
            if (listElem) listElem.innerHTML = '';
            if (countElem) countElem.innerText = '0';
        });

        // 2. Ordenar tareas: De la más antigua (primero) a la más reciente (último)
        // Asumiendo que 'fecha_creacion' es un string "DD/MM/YYYY HH:MM:SS" o un Timestamp
        const tareasOrdenadas = [...tareas].sort((a, b) => {
            // Si no tienes campo fecha, se mantienen en el orden que vienen de la DB
            // Pero si tienes fecha, esta lógica las ordena:
            const fechaA = this._parseFecha(a.fecha_creacion || 0);
            const fechaB = this._parseFecha(b.fecha_creacion || 0);
            return fechaA - fechaB;
        });

        // 3. Renderizar las tareas ya ordenadas
        tareasOrdenadas.forEach(t => this.renderizarTarea(t));
    }

    // Función auxiliar para convertir tus strings de fecha a objetos Date comparables
    _parseFecha(fechaStr) {
        if (!fechaStr) return 0;

        // Si ya es un número o un timestamp de Firebase
        if (typeof fechaStr === 'number') return fechaStr;
        if (fechaStr.seconds) return fechaStr.seconds * 1000;

        // Intentar conversión directa (Funciona para "Sun, 11 Jan 2026...")
        const timestamp = Date.parse(fechaStr);

        if (!isNaN(timestamp)) {
            return timestamp;
        }

        // Si falla lo anterior, intentar el formato manual "DD/MM/YYYY"
        try {
            const parts = fechaStr.split(' ');
            const [dia, mes, año] = parts[0].split('/');
            return new Date(`${año}-${mes}-${dia}T${parts[1] || '00:00:00'}`).getTime();
        } catch (e) {
            return 0;
        }
    }

    setupBtnsAgregarTarea() {
        const btn = document.getElementById('addTaskBtnTodo');
        if (btn) {
            btn.onclick = () => {
                this.selectedPriority = 'medium';
                document.getElementById('modal-overlay-task').classList.remove('hidden');
            };
        }
    }

    cerrarModal() {
        document.getElementById('modal-overlay-task').classList.add('hidden');
        document.getElementById('taskForm').reset();
    }

    setPriority(btn, level) {
        this.selectedPriority = level;
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('gp-active'));
        btn.classList.add('gp-active');
    }

    setupFormularioTask() {
        const form = document.getElementById('taskForm');
        if (!form) return;
        form.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                id_cliente: this.clienteId,
                id_proyecto: this.proyectoId,
                titulo: document.getElementById('taskTitle').value,
                descripcion: document.getElementById('taskDescription').value,
                categoria: document.getElementById('taskCategory').value,
                prioridad: this.selectedPriority,
                status: 'todo',
                historial_notas: []
            };

            try {
                const res = await fetch('/aliado/agregar_tarea', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok && data.status === "success") {
                    const nuevaTarea = { ...payload, id: data.id_tarea };
                    this.parent.tareasGlobales.push(nuevaTarea); // Guardar en global
                    this.renderizarTarea(nuevaTarea);
                    this.cerrarModal();
                }
            } catch (error) { console.error("Error:", error); }
        };
    }

    async cambiarEstadoSiguiente(taskId) {
        const tarea = this.parent.tareasGlobales.find(t => t.id === taskId);
        if (!tarea) return;

        const indexActual = this.estados.indexOf(tarea.status);
        if (indexActual < this.estados.length - 1) {
            const nuevoEstado = this.estados[indexActual + 1];
            await this.actualizarEstadoServidor(taskId, nuevoEstado);
        }
    }

    async actualizarEstadoServidor(taskId, nuevoEstado) {
        try {
            const res = await fetch('/aliado/actualizar_status_tarea', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_cliente: this.clienteId,
                    id_proyecto: this.proyectoId,
                    id_tarea: taskId,
                    nuevo_status: nuevoEstado
                })
            });
            if (res.ok) {
                // Actualizar localmente
                const tarea = this.parent.tareasGlobales.find(t => t.id === taskId);
                tarea.status = nuevoEstado;
                this.loadTasks(this.parent.tareasGlobales); // Re-renderizar tablero
            }
        } catch (error) { console.error("Error moviendo tarea:", error); }
    }

    renderizarTarea(t) {
        const contenedor = document.getElementById(`${t.status}List`) || document.getElementById('todoList');
        const badge = document.getElementById(`${t.status}Count`) || document.getElementById('todoCount');
        if (badge) badge.innerText = parseInt(badge.innerText || 0) + 1;

        // Procesar fecha para mostrar en español
        let fechaHtml = "";
        const ts = this._parseFecha(t.fecha_creacion);
        if (ts > 0) {
            const fechaObj = new Date(ts);
            const dia = fechaObj.getDate();
            const mes = fechaObj.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
            fechaHtml = `<div class="task-date"><i class="far fa-calendar-alt"></i> ${dia} ${mes}</div>`;
        }

        // Dentro del método renderizarTarea(t) en GestionTareas.js

        const taskHtml = `
            <div id="task-${t.id}" class="task-card ${t.categoria} ${t.prioridad}" draggable="true">
                <div class="task-card-header">
                    <div class="task-title">${t.titulo}</div>
                    <div class="task-actions">
                        <button title="Agregar nota" class="task-action-btn" onclick="gp.notasManager.abrirModalNota('${t.id}')">
                            <i class="fas fa-note-sticky"></i>
                        </button>

                        ${t.status === 'approve' ? `
                        <button title="Aprobar y Finalizar" class="task-action-btn move-btn" onclick="gp.tareasManager.cambiarEstadoSiguiente('${t.id}')">
                            <i class="fas fa-check-double"></i>
                        </button>` : ''}
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
                    <ul class="list-note"></ul>
                </details>
            </div>`;

        contenedor.insertAdjacentHTML('beforeend', taskHtml);

        // Inyectar notas
        if (t.historial_notas && Array.isArray(t.historial_notas)) {
            t.historial_notas.forEach(nota => {
                this.parent.notasManager.inyectarNotaVisual(t.id, nota.comentario);
            });
        }
    }

    setupDragAndDrop() {
        const board = document.getElementById('boardContainer');
        board.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-card')) {
                e.dataTransfer.setData('text/plain', e.target.id.replace('task-', ''));
            }
        });

        document.querySelectorAll('.task-list').forEach(list => {
            list.addEventListener('dragover', e => e.preventDefault());
            list.addEventListener('drop', async (e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('text/plain');
                const nuevoStatus = list.dataset.status;
                await this.actualizarEstadoServidor(taskId, nuevoStatus);
            });
        });
    }
}