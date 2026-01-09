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
            if(window.innerWidth <= 768) sidebar.classList.remove('active');
        });
    });

    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('active'));

    // Carga inicial
    cargarSeccion('inicio');
});

function cargarSeccion(name) {
    const container = document.getElementById('content-area');
    
    // Switch para llamar funciones de otros archivos
    switch(name) {
        case 'inicio':
            if(typeof renderInicio === 'function') renderInicio(container);
            break;
        case 'clientes':
            if(typeof renderClientes === 'function') renderClientes(container);
            break;
        case 'proyectos':
            if(typeof renderProyectos === 'function') renderProyectos(container);
            break;
    }
}