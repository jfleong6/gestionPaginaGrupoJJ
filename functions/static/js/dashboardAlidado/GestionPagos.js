class GestionPagos {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        const p = this.parent.p;
        const target = document.getElementById('tab-pagos');
        if (!target || !p.finanzas) return;

        const f = p.finanzas;

        // --- LÓGICA DE SALDO DINÁMICO ---
        const totalPagado = f.historial_pagos.reduce((acc, pago) => acc + pago.monto, 0);
        const saldoCalculado = totalPagado - f.cobro_inicial;

        let claseSaldo, etiquetaSaldo, descripcionSaldo, montoMostrar;

        if (saldoCalculado < 0) {
            claseSaldo = 'saldo-pendiente';
            etiquetaSaldo = 'Saldo Pendiente';
            descripcionSaldo = 'Pendiente por cubrir';
            montoMostrar = Math.abs(saldoCalculado);
        } else {
            claseSaldo = 'saldo-favor';
            etiquetaSaldo = 'Saldo a Favor';
            descripcionSaldo = 'Crédito para mensualidades';
            montoMostrar = saldoCalculado;
        }

        // --- LÓGICA DE LA TABLA (Orden: Más reciente primero) ---
        // Se crea una copia para no alterar el array original del estado
        const historialOrdenado = [...f.historial_pagos].reverse();

        target.innerHTML = `
            <div class="pagos-container animate__animated animate__fadeIn">
                
                <div class="pagos-resumen-grid">
                    <div class="resumen-card base">
                        <label>Cobro Inicial</label>
                        <div class="monto">$${f.cobro_inicial.toLocaleString()}</div>
                        <small>Creación de proyecto</small>
                    </div>

                    <div class="resumen-card mensualidad">
                        <label>Mensualidad</label>
                        <div class="monto">$${f.mensualidad_base.toLocaleString()}</div>
                        <small>Suscripción activa</small>
                    </div>

                    <div class="resumen-card ${claseSaldo}">
                        <label>${etiquetaSaldo}</label>
                        <div class="monto">$${montoMostrar.toLocaleString()}</div>
                        <small>${descripcionSaldo}</small>
                    </div>
                </div>

                <div class="acciones-pago-container">
                    <div class="info-text">
                        <i class="fas fa-shield-check"></i>
                        <span>Reporta tus comprobantes para actualizar tu estado de cuenta.</span>
                    </div>
                    <button class="btn-reportar-pago" onclick="gp.pagosManager.abrirModalPago()">
                        <i class="fas fa-plus"></i> Reportar Nuevo Pago
                    </button>
                </div>

                <div class="historial-container">
                    <h4 class="seccion-titulo"><i class="fas fa-history"></i> Historial de Transacciones</h4>
                    <div class="tabla-responsive">
                        <table class="tabla-pagos">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Concepto</th>
                                    <th>Monto</th>
                                    <th style="text-align: center;">Soporte</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${historialOrdenado.length > 0 ? historialOrdenado.map(pago => `
                                    <tr>
                                        <td>${pago.fecha ? new Date(pago.fecha).toLocaleDateString() : 'Reciente'}</td>
                                        <td><strong>${pago.concepto}</strong></td>
                                        <td class="monto-tabla">$${pago.monto.toLocaleString()}</td>
                                        <td style="text-align: center;">
                                            <a href="${pago.soporte_url || '#'}" target="_blank" class="btn-ver-soporte">
                                                <i class="fas fa-image"></i> Ver
                                            </a>
                                        </td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="4" class="tabla-vacia">No hay pagos registrados aún.</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="modal-reportar-pago" class="modal-overlay hidden">
                <div class="modal-content animate__animated animate__zoomIn">
                    <div class="modal-header">
                        <h3>Reportar Nuevo Pago</h3>
                        <button class="close-modal" onclick="gp.pagosManager.cerrarModalPago()">&times;</button>
                    </div>
                    <form id="form-reportar-pago" class="task-form">
                        <div class="form-group">
                            <label>Monto a reportar ($)</label>
                            <input type="number" id="pagoMonto" value="${montoMostrar > 0 && saldoCalculado < 0 ? montoMostrar : f.mensualidad_base}" required>
                        </div>
                        <div class="form-group">
                            <label>Concepto</label>
                            <select id="pagoConcepto">
                                <option value="Pago Inicial de Creación">Pago Inicial de Creación</option>
                                <option value="Mensualidad Servicio">Mensualidad Servicio</option>
                                <option value="Saldo Extra / Abono">Saldo Extra / Abono</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Comprobante (Imagen)</label>
                            <input type="file" id="pagoSoporte" accept="image/*" required>
                        </div>
                        <button type="submit" class="btn-submit">Enviar Reporte de Pago</button>
                    </form>
                </div>
            </div>
        `;

        this.setupFormularioPago();
    }

    abrirModalPago() {
        document.getElementById('modal-reportar-pago').classList.remove('hidden');
    }

    cerrarModalPago() {
        document.getElementById('modal-reportar-pago').classList.add('hidden');
    }

    setupFormularioPago() {
        const form = document.getElementById('form-reportar-pago');
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('.btn-submit');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

            const formData = new FormData();
            formData.append('id_cliente', this.parent.p.cliente_id);
            formData.append('id_proyecto', this.parent.p.proyecto_id);
            formData.append('monto', document.getElementById('pagoMonto').value);
            formData.append('concepto', document.getElementById('pagoConcepto').value);
            formData.append('soporte', document.getElementById('pagoSoporte').files[0]);

            try {
                const res = await fetch('/aliado/registrar_pago', { method: 'POST', body: formData });
                const data = await res.json();

                if (res.ok && data.status === "success") {
                    alert("Pago reportado con éxito.");
                    this.parent.p.finanzas.historial_pagos.push(data.nuevo_pago);
                    this.parent.p.deuda = data.estado_deuda;
                    this.cerrarModalPago();
                    this.render();
                }
            } catch (error) {
                console.error("Error:", error);
                alert("Error al enviar el pago.");
            } finally {
                btn.disabled = false;
                btn.innerText = 'Enviar Reporte de Pago';
            }
        };
    }
}