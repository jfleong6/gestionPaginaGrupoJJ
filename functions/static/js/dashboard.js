// 1. Referencias a los contenedores
const secciones = {
    'inicio': document.getElementById('content-inicio'),
    'clientes': document.getElementById('content-clientes'),
    'proyectos': document.getElementById('content-proyectos'),
    'modulo-proyecto': document.getElementById('content-modulo-proyecto')
};

document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;

            // UI Update
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.getElementById('section-title').innerText = section.toUpperCase();

            // Cargar Función de la sección
            cargarSeccion(section);

            // Cerrar sidebar en móvil
            if (window.innerWidth <= 768) sidebar.classList.remove('active');
        });
    });

    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('active'));

    // Carga inicial
    renderInicio(document.getElementById('content-inicio'));
    renderClientes(document.getElementById('content-clientes'));
    renderProyectos(document.getElementById('content-proyectos'));
    cargarSeccion('inicio');

});

function cargarSeccion(name) {

    // 2. Ocultar todas las secciones usando classList
    Object.values(secciones).forEach(section => {
        if (section) section.classList.add("hidden");
    });

    // 3. Mostrar la sección seleccionada
    const targetId = `content-${name}`; // Construimos el ID dinámicamente
    const currentContainer = document.getElementById(targetId);

    if (currentContainer) {
        currentContainer.classList.remove("hidden");
    } else {
        console.error("No se encontró el contenedor:", targetId);
        return;
    }
}

async function iniciarGestion(id_proyecto, id_cliente) {
    Object.values(secciones).forEach(section => {
        if (section) section.classList.add("hidden");
    });

    // 1. Buscamos los datos completos del proyecto
    const res = await fetch(`/aliado/obtener_proyecto/${id_proyecto}`);
    console.log(res.status);
    const data = await res.json();
    console.log(data);
    // 2. Iniciamos la clase POO (gp es global para acceder desde los onclick)
    window.gp = await new GestionProyecto('content-modulo-proyecto', data.proyecto);
    window.gp.init();
    document.getElementById('content-modulo-proyecto').classList.remove("hidden");
}