class GestionNotas {
    constructor(clienteId, proyectoId) {
        this.clienteId = clienteId;
        this.proyectoId = proyectoId;
        this.currentTaskId = null;
    }

    abrirModalNota(taskId) {
        this.currentTaskId = taskId;
        document.getElementById('modal-overlay-task-notas').classList.remove('hidden');
    }

    cerrarModalNota() {
        document.getElementById('modal-overlay-task-notas').classList.add('hidden');
        document.getElementById('taskFormNote').reset();
        this.currentTaskId = null;
    }

    setupFormularioNotas() {
        const form = document.getElementById('taskFormNote');
        if (!form) return;
        form.onsubmit = async (e) => {
            e.preventDefault();
            const notaTexto = document.getElementById('taskNote').value;
            const payload = {
                id_cliente: this.clienteId,
                id_proyecto: this.proyectoId,
                id_tarea: this.currentTaskId,
                nota: notaTexto
            };

            try {
                const res = await fetch('/aliado/agregar_nota', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    // Actualizar variable global en el padre
                    const tarea = gp.tareasGlobales.find(t => t.id === this.currentTaskId);
                    if (tarea) {
                        if (!tarea.historial_notas) tarea.historial_notas = [];
                        tarea.historial_notas.push({ comentario: notaTexto, fecha: new Date() });
                    }
                    
                    this.inyectarNotaVisual(this.currentTaskId, notaTexto);
                    this.actualizarContadorNotas(this.currentTaskId);
                    this.cerrarModalNota();
                }
            } catch (error) { console.error("Error al guardar nota:", error); }
        };
    }

    inyectarNotaVisual(taskId, texto) {
        const taskElement = document.getElementById(`task-${taskId}`);
        if (!taskElement) return;
        const listNote = taskElement.querySelector('.list-note');
        if (listNote) {
            const li = document.createElement('li');
            li.textContent = texto;
            listNote.appendChild(li);
        }
    }

    actualizarContadorNotas(taskId) {
        const taskElement = document.getElementById(`task-${taskId}`);
        const summary = taskElement.querySelector('summary');
        const tarea = gp.tareasGlobales.find(t => t.id === taskId);
        if (summary && tarea) {
            summary.innerText = `Notas (${tarea.historial_notas.length})`;
        }
    }
}