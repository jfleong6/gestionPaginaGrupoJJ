class GestionProyecto {
    constructor(containerId, proyecto) {
        this.container = document.getElementById(containerId);
        this.p = proyecto;
        this.seccionActual = 'info';
    }

    render() {
        this.container.innerHTML = `
            <div class="gestion-container">
                <div class="gestion-header">
                    <div class="header-info">
                        <button onclick="aliado.cargarEtapa(4)" class="btn-regresar">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <h2>${this.p.nombre_negocio}</h2>
                    </div>
                    <div class="link-publico">
                        <span>Página Final:</span>
                        <a href="/v/${this.p.proyecto_id}" target="_blank" id="link-final">
                            .../v/${this.p.proyecto_id}
                        </a>
                        <button class="btn-copy" onclick="gp.copiarLink()"><i class="fa-solid fa-copy"></i></button>
                    </div>
                </div>

                <nav class="gestion-tabs">
                    <button class="tab-link active" onclick="gp.cambiarTab(this, 'info')">Información</button>
                    <button class="tab-link" onclick="gp.cambiarTab(this, 'bitacora')">Bitácora</button>
                    <button class="tab-link" onclick="gp.cambiarTab(this, 'pagos')">Pagos</button>
                </nav>

                <div id="gestion-dinamica" class="gestion-content">
                    ${this.viewInfo()}
                </div>
            </div>
        `;
    }

    cambiarTab(btn, tab) {
        // Estética de botones
        document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const content = document.getElementById('gestion-dinamica');
        if (tab === 'info') content.innerHTML = this.viewInfo();
        if (tab === 'bitacora') this.viewBitacora(content);
        if (tab === 'pagos') this.viewPagos(content);
    }

    viewInfo() {
        return `
            <div class="card-gestion animate__animated animate__fadeIn">
                <h3>Datos Originales del Proyecto</h3>
                <form id="form-edit-proyecto" onsubmit="gp.actualizarProyecto(event)">
                    <div class="grid-form">
                        <label>Nombre Negocio: <input type="text" name="nombre_negocio" value="${this.p.nombre_negocio}"></label>
                        <label>Eslogan: <input type="text" name="eslogan" value="${this.p.eslogan}"></label>
                        <label>Categoría: <input type="text" name="categoria" value="${this.p.categoria}"></label>
                    </div>
                    <button type="submit" class="btn-primario">Guardar Cambios</button>
                </form>
            </div>
        `;
    }

    async viewBitacora(target) {
        target.innerHTML = `
            <div class="bitacora-container animate__animated animate__fadeIn">
                <div class="form-bitacora">
                    <textarea id="txt-bitacora" placeholder="Escribe el avance de hoy..."></textarea>
                    <button onclick="gp.guardarBitacora()" class="btn-accion">Registrar Bitácora</button>
                </div>
                <div id="lista-bitacoras" class="timeline"> Cargando historial... </div>
            </div>
        `;
        // Aquí llamarías a: fetch('/aliado/obtener_bitacoras/' + this.p.proyecto_id)
    }

    async viewPagos(target) {
        target.innerHTML = `
            <div class="pagos-container animate__animated animate__fadeIn">
                <div class="header-pagos">
                    <h3>Registro de Pagos</h3>
                    <button onclick="gp.nuevoPago()" class="btn-pago">+ Registrar Pago</button>
                </div>
                <div class="resumen-deuda ${this.p.deuda ? 'con-deuda' : 'al-dia'}">
                    ${this.p.deuda ? 'Pendiente de Pago' : 'Al Día'}
                </div>
                <table class="tabla-app">
                    <thead><tr><th>Fecha</th><th>Monto</th><th>Concepto</th></tr></thead>
                    <tbody id="lista-pagos-body"></tbody>
                </table>
            </div>
        `;
    }

    copiarLink() {
        const link = `https://gestioncontrol-grupojj.web.app/v/${this.p.proyecto_id}`;
        navigator.clipboard.writeText(link);
        alert("Link copiado al portapapeles");
    }
}