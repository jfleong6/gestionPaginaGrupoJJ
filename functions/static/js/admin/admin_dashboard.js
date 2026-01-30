// Lógica de navegación similar a dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Ocultar todos
            document.querySelectorAll('.content').forEach(c => c.classList.add('hidden'));
            // Mostrar actual
            document.getElementById(`content-${section}`).classList.remove('hidden');
            document.getElementById('section-title').innerText = section.replace('-', ' ').toUpperCase();
        });
    });

    if (toggleBtn) toggleBtn.addEventListener('click', () => sidebar.classList.toggle('active'));

    cargarProyectosGlobales();
});

async function cargarProyectosGlobales() {
    const res = await fetch('/admin/api/proyectos_todos');
    const json = await res.json();
    const tbody = document.getElementById('lista-proyectos-global');

    if (json.status === 'success') {
        tbody.innerHTML = json.data.map(p => {
            // Validamos si ya se aplicaron las excepciones anteriormente
            const yaTieneBono = p.bono_bienvenida_aplicado || p.finanzas?.cobro_inicial === 0;
            const yaEsPropio = p.es_proyecto_propio || p.finanzas?.mensualidad_base === 0;

            return `
                <tr style="border-bottom: 1px solid #f8fafc;" data-id-proyecto="${p.id_interno}">
                    <td style="padding: 12px;">
                        <strong>${p.nombre_negocio}</strong><br>
                        <small style="color: #64748b;">${p.cliente_nombre}</small>
                    </td>
                    <td><span class="badge-aliado">${p.aliado_id || 'Admin'}</span></td>
                    <td>
                        <small>Inicial: $${p.finanzas?.cobro_inicial || 0}</small><br>
                        <small>Mes: $${p.finanzas?.mensualidad_base || 0}</small>
                    </td>
                    <td>
                        <button class="btn-admin btn-bono" 
                            ${yaTieneBono ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} 
                            onclick="aplicarExcepcion('${p.aliado_id}','${p.cliente_id}','${p.id_interno}', 'bono')">
                            ${yaTieneBono ? '✅ Bono' : '🎁 Bono'}
                        </button>

                        <button class="btn-admin btn-mío" 
                            ${yaEsPropio ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} 
                            onclick="aplicarExcepcion('${p.aliado_id}','${p.cliente_id}','${p.id_interno}', 'propio')">
                            ${yaEsPropio ? '✅ Mío' : '🏠 Mío'}
                        </button>

                        <button class="btn-admin btn-ver" 
                            onclick="verTareas('${p.id_interno}', '${p.aliado_id}', '${p.cliente_id}')">
                            📋 Tareas
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

async function verTareas(idProy, idAliado, idCli) {
    // Aquí llamaríamos a iniciarGestion de tu GestionProyecto.js
    // Pero como eres admin, pasamos los IDs correctos para que cargue el proyecto
    document.querySelectorAll('.content').forEach(c => c.classList.add('hidden'));
    const res = await fetch(`/aliado/obtener_proyecto/${idProy}`); // O una ruta admin similar
    const data = await res.json();
    window.gp = new GestionProyecto('content-modulo-proyecto', data.proyecto);
    window.gp.init();
    document.getElementById('content-modulo-proyecto').classList.remove('hidden');
}
async function aplicarExcepcion(idAliado, idCliente, idProy, tipo) {
    const confirmar = confirm(`¿Estás seguro de aplicar la excepción de tipo "${tipo}"?`);
    if (!confirmar) return;

    // 1. Buscamos la fila y el botón específico ANTES del fetch para tener la referencia
    const tbody = document.getElementById('lista-proyectos-global');
    const fila = tbody.querySelector(`tr[data-id-proyecto="${idProy}"]`);
    
    // Buscamos el botón que coincide con el tipo (bono o mío) dentro de esa fila
    const btnClase = tipo === 'bono' ? '.btn-bono' : '.btn-mío';
    const boton = fila.querySelector(btnClase);

    try {
        const res = await fetch('/admin/api/aplicar_excepcion', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id_aliado: idAliado, 
                id_cliente: idCliente, 
                id_proyecto: idProy, 
                tipo_excepcion: tipo
            })
        });

        const json = await res.json();

        if (json.status === 'success') {
            // 2. DESHABILITAR EL BOTÓN
            boton.disabled = true;
            boton.style.opacity = "0.5";
            boton.style.cursor = "not-allowed";
            boton.innerHTML = "✅ Bono";
            
            alert('Excepción registrada en el historial.');
        } else {
            alert('Error: ' + json.message);
        }
    } catch (err) {
        console.error("Error en la petición:", err);
        alert("No se pudo conectar con el servidor.");
    }
}
