class ModuloClientes {
    constructor(containerId) {
        this.container = containerId;
        this.modal = null;
        this.listaClientes = []; // Cache local de datos
    }

    async init() {
        this.renderLayout();
        this.setupElements();
        this.setupEventListeners();
        await this.cargarDatos(); // Simulación de Firebase
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="module-header">
                <div class="search-bar">
                    <select id="search-type">
                        <option value="nombre">Nombre</option>
                        <option value="documento">Documento</option>
                    </select>
                    <input type="text" id="search-input" placeholder="Buscar...">
                    <button id="btn-search" class="btn-primary"><i class="fa-solid fa-search"></i></button>
                </div>
                <button id="btn-add-client" class="btn-primary btn-success">
                    <i class="fa-solid fa-plus"></i> Nuevo Cliente
                </button>
            </div>

            <div class="table-container">
                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>Documento</th>
                            <th>Nombre Completo</th>
                            <th>Proyectos</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="client-table-body">
                        </tbody>
                </table>
            </div>

            <div id="modal-new-client" class="modal">
                <div class="modal-content">
                    <h3><i class="fa-solid fa-user-plus"></i> Registro de Cliente</h3>
                    <hr>
                    <form id="form-cliente-new">
                        <input type="text" id="m-nombre" placeholder="Nombre completo" required>
                        <input type="text" id="m-doc" placeholder="Documento / NIT" required>
                        <input type="email" id="m-correo" placeholder="Correo electrónico" required>
                        <div class="form-grid">
                            <input type="text" id="m-cel" placeholder="Celular">
                            <input type="text" id="m-wa" placeholder="WhatsApp">
                        </div>
                        <div style="text-align: right; margin-top: 20px;">
                            <button type="button" id="btn-cancel" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary">Guardar Cliente</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    setupElements() {
        this.modal = document.getElementById('modal-new-client');
        this.tableBody = document.getElementById('client-table-body');
    }

    setupEventListeners() {
        // Abrir y cerrar modal
        document.getElementById('btn-add-client').onclick = () => this.toggleModal(true);
        document.getElementById('btn-cancel').onclick = () => this.toggleModal(false);

        // Envío de Formulario
        document.getElementById('form-cliente-new').onsubmit = (e) => {
            e.preventDefault();
            this.guardarCliente();
        };

        // Buscador
        document.getElementById('btn-search').onclick = () => this.filtrar();
    }

    toggleModal(show) {
        this.modal.style.display = show ? 'flex' : 'none';
    }

    async cargarDatos() {
        try {
            const response = await fetch('/aliado/obtener_clientes');
            const resultado = await response.json();

            if (resultado.status === "success") {
                this.listaClientes = resultado.data; // Guardamos los clientes del aliado
                this.renderTable(this.listaClientes);
            }
        } catch (error) {
            console.error("Error cargando clientes:", error);
        }
    }

    renderTable(data) {
        this.tableBody.innerHTML = data.map(cli => `
        <tr>
            <td><b>${cli.documento}</b></td>
            <td>${cli.nombre}</td>
            <td>${cli.proyectos_conteo || 0} proyectos</td> 
            <td>
                <span class="status-badge ${cli.estado == "activo" ? 'status-ok' : 'status-debt'}">
                    ${cli.estado}
                </span>
            </td>
            <td>
                <button class="btn-icon" onclick="verProyectos('${cli.id}')">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
    }

    agregarFilaUI(cliente, id) {
        // 1. Usamos la misma referencia 'this.tableBody' que usas en renderTable
        if (!this.tableBody) return;

        // 2. Crear el elemento TR
        const tr = document.createElement('tr');

        // Opcional: Agregar una clase para animación si tienes CSS para ello
        // tr.classList.add('fade-in'); 

        // 3. Inyectar el HTML EXACTO siguiendo tu estructura visual
        // Nota: Como es nuevo, proyectos es 0 y estado es 'activo' por defecto
        tr.innerHTML = `
        <td><b>${cliente.documento}</b></td>
        <td>${cliente.nombre}</td>
        <td>0 proyectos</td> 
        <td>
            <span class="status-badge status-ok">
                activo
            </span>
        </td>
        <td>
            <button class="btn-icon" onclick="verProyectos('${id}')">
                <i class="fa-solid fa-eye"></i>
            </button>
        </td>
    `;

        // 4. Insertar la fila al PRINCIPIO de la tabla (prepend) para que se vea arriba
        this.tableBody.prepend(tr);
    }

    async guardarCliente() {
        // 1. Recoger datos del formulario
        const datosCliente = {
            nombre: document.getElementById('m-nombre').value,
            documento: document.getElementById('m-doc').value,
            correo: document.getElementById('m-correo').value,
            celular: document.getElementById('m-cel').value,
            whatsapp: document.getElementById('m-wa').value,
            // Inicializamos valores por defecto para que la tabla no falle
            proyectos_conteo: 0,
            estado: 'activo'
        };

        try {
            const response = await fetch('/aliado/crear_cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosCliente)
            });

            const resultado = await response.json();

            if (resultado.status === "success") {
                // --- OPTIMIZACIÓN AQUÍ ---

                // A. Actualizamos el contador visual y la variable interna
                if (this.stats) {
                    this.stats.clientes += 1;
                    const counterElement = document.getElementById('count-clientes');
                    if (counterElement) counterElement.innerText = this.stats.clientes;
                }

                // B. Inyectamos la fila manualmente (pasamos el ID que nos dio Firebase)
                this.agregarFilaUI(datosCliente, resultado.id);

                alert("¡Cliente guardado exitosamente!");
                this.toggleModal(false);

                // C. Limpiar formulario (Opcional pero recomendado)
                document.getElementById('form-crear-cliente').reset();

            } else {
                alert("Error: " + resultado.message);
            }
        } catch (error) {
            console.error("Error en la petición:", error);
        }
    }

    filtrar() {
        const val = document.getElementById('search-input').value.toLowerCase();
        const tipo = document.getElementById('search-type').value;

        const filtrados = this.listaClientes.filter(c => {
            if (tipo === 'nombre') return c.nombre.toLowerCase().includes(val);
            return c.doc.includes(val);
        });

        this.renderTable(filtrados);
    }
}

// Función global para main.js
function renderClientes(container) {
    if (!window.moduloCliente) {
        window.moduloCliente = new ModuloClientes(container);
        moduloCliente.init();
    }
}