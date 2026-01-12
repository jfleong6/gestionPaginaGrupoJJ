class DashboardInicio {
    constructor(container) {
        // Aseguramos que container sea el elemento DOM
        this.container = container;
        this.stats = {
            clientes: 0,
            proyectosActivos: 0,
            proyectosInactivos: 0
        };
    }

    async init() {
        this.renderLayout();
        await this.fetchFirebaseData();
        this.updateUI();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="stats-grid">
                <div class="card-kpi">
                    <div class="card-icon blue"><i class="fa-solid fa-users"></i></div>
                    <div class="card-info">
                        <h3>Clientes Totales</h3>
                        <p id="count-clientes">--</p>
                    </div>
                </div>

                <div class="card-kpi">
                    <div class="card-icon green"><i class="fa-solid fa-circle-check"></i></div>
                    <div class="card-info">
                        <h3>Proyectos Activos</h3>
                        <p id="count-activos">--</p>
                    </div>
                </div>

                <div class="card-kpi">
                    <div class="card-icon red"><i class="fa-solid fa-clock-rotate-left"></i></div>
                    <div class="card-info">
                        <h3>Inactivos / Pendientes</h3>
                        <p id="count-inactivos">--</p>
                    </div>
                </div>
            </div>
        `;
    }

    async fetchFirebaseData() {
        try {
            const response = await fetch('/aliado/obtener_estadisticas');
            const result = await response.json();

            if (result.status === "success") {
                this.stats = result.stats;
            } else {
                console.error("Error del servidor:", result.message);
            }
        } catch (error) {
            console.error("Error al conectar con la API de estadísticas:", error);
        }
    }

    updateUI() {
        // Usamos una pequeña animación de conteo o simplemente asignamos el valor
        document.getElementById('count-clientes').innerText = this.stats.clientes;
        document.getElementById('count-activos').innerText = this.stats.proyectosActivos;
        document.getElementById('count-inactivos').innerText = this.stats.proyectosInactivos;
    }
}

function renderInicio(container) {
    if (!window.moduloInicio) {
        window.moduloInicio = new DashboardInicio(container);
        moduloInicio.init();
    }
}