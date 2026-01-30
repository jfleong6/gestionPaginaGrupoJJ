from flask import Blueprint, request, jsonify, session
from firebase_admin import firestore, storage
from datetime import datetime
import uuid
from PIL import Image
import io
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# --- FUNCIÓN AUXILIAR DE OPTIMIZACIÓN ---
def optimizar_imagen(archivo_entrada, ancho_max=1200, calidad=70):
    """
    Recibe un objeto de archivo, lo redimensiona y lo convierte a WEBP.
    Retorna un buffer de memoria listo para subir a Storage.
    """
    try:
        img = Image.open(archivo_entrada)
        
        # 1. Convertir a RGB (necesario para formatos con transparencia como PNG)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # 2. Redimensionar proporcionalmente si supera el ancho máximo
        if img.width > ancho_max:
            proporcion = ancho_max / float(img.width)
            alto = int(float(img.height) * proporcion)
            img = img.resize((ancho_max, alto), Image.Resampling.LANCZOS)
            
        # 3. Guardar en un buffer de memoria en formato WEBP
        buffer = io.BytesIO()
        img.save(buffer, format="WEBP", quality=calidad, method=6)
        buffer.seek(0)
        
        return buffer
    except Exception as e:
        print(f"Error optimizando imagen: {e}")
        return None



admin_bp = Blueprint('admin', __name__)
db = firestore.client()

@admin_bp.route('/api/proyectos_todos')
def admin_api_proyectos_todos():
    if session.get('role') != 'admin':
        return jsonify({"status": "error", "message": "Acceso denegado"}), 403
    
    try:
        # Traemos la colección rápida que alimentas desde rutas_aliado
        proyectos_ref = db.collection('proyectos').stream()
        lista = []
        for doc in proyectos_ref:
            p = doc.to_dict()
            # Añadimos el ID por si no lo tiene el dict
            p['id_interno'] = doc.id
            lista.append(p)
        return jsonify({"status": "success", "data": lista}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@admin_bp.route('/api/aplicar_excepcion', methods=['POST'])
def aplicar_excepcion():
    if session.get('role') != 'admin':
        return jsonify({"status": "error", "message": "No autorizado"}), 403
    
    try:
        data = request.get_json()
        id_aliado = data.get('id_aliado')
        id_cliente = data.get('id_cliente')
        id_proyecto = data.get('id_proyecto')
        tipo = data.get('tipo_excepcion')

        # 1. Obtener los datos actuales del proyecto para conocer el cobro_inicial
        proy_real_ref = db.collection('users').document(id_aliado)\
                         .collection('clientes').document(id_cliente)\
                         .collection('proyectos').document(id_proyecto)
        
        proy_snap = proy_real_ref.get()
        if not proy_snap.exists:
            return jsonify({"status": "error", "message": "Proyecto no encontrado"}), 404
        
        datos_proyecto = proy_snap.to_dict()
        finanzas_actuales = datos_proyecto.get('finanzas', {})
        
        # Obtenemos el valor que ya está en la base de datos
        valor_inicial_actual = finanzas_actuales.get('cobro_inicial', 0)
        saldo_a_favor_actual = finanzas_actuales.get('saldo_a_favor', 0)

        # 2. Crear el registro del bono usando ese valor dinámico
        registro_bono = {
            "id_pago": str(uuid.uuid4())[:8],
            "fecha": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "monto": valor_inicial_actual, # <-- Ahora toma el valor real del proyecto
            "metodo": "Excepción Administrativa",
            "concepto": f"Bono aplicado: {tipo.upper()}",
            "comprobante": "n/a",
            "admin_control": True
        }

        updates = {}
        
        if tipo == 'bono':
            # Cargamos el saldo a favor con el valor que se le "perdona"
            updates["finanzas.saldo_a_favor"] = saldo_a_favor_actual+valor_inicial_actual
            updates["deuda"] = False
            updates["bono_bienvenida_aplicado"] = True
            
        elif tipo == 'propio':
            updates["finanzas.mensualidad_base"] = 0
            updates["es_proyecto_propio"] = True
            registro_bono["monto"] = 0 # Para proyectos propios el monto del log es 0
            registro_bono["concepto"] = "Exoneración de mensualidad (Proyecto Propio)"

        # Agregar al historial
        updates["finanzas.historial_pagos"] = firestore.ArrayUnion([registro_bono])

        # 3. Sincronizar con la colección global
        proy_global_ref = db.collection('proyectos').document(id_proyecto)

        batch = db.batch()
        batch.update(proy_real_ref, updates)
        batch.update(proy_global_ref, updates)
        batch.commit()

        return jsonify({
            "status": "success", 
            "message": f"Bono por ${valor_inicial_actual:,} aplicado correctamente."
        }), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    
@admin_bp.route('/api/cron/cobro_mensual', methods=['GET', 'POST'])
def cron_cobro_mensual():
    # Seguridad: Solo el Cron de Google o tú como Admin pueden disparar esto
    is_cron = request.headers.get('X-Appengine-Cron') == 'true'
    if not is_cron and session.get('role') != 'admin':
        return jsonify({"status": "error", "message": "Acceso denegado"}), 403

    try:
        proyectos_ref = db.collection('proyectos').stream()
        batch = db.batch()
        
        ahora = datetime.now()
        # Formato de fecha para el historial: 29/01/2026 19:15:00
        fecha_log = ahora.strftime("%d/%m/%Y %H:%M:%S")
        mes_anio = ahora.strftime('%m/%Y')
        
        conteo = 0

        for doc in proyectos_ref:
            p_id = doc.id
            data = doc.to_dict()
            
            finanzas = data.get('finanzas', {})
            mensualidad = finanzas.get('mensualidad_base', 0)
            es_propio = data.get('es_proyecto_propio', False)
            estado = data.get('estado', 'activo')

            # Cobrar solo si: es mayor a 0, NO es propio y está ACTIVO
            if mensualidad > 0 and not es_propio and estado == 'activo':
                saldo_actual = finanzas.get('saldo_a_favor', 0)
                nuevo_saldo = saldo_actual - mensualidad

                # Registro para el historial de pagos
                registro_cargo = {
                    "id_pago": f"AUTO-{ahora.strftime('%m%y')}-{p_id[:4]}".upper(),
                    "fecha": fecha_log,
                    "monto": -mensualidad, # Negativo porque es un cobro
                    "metodo": "Sistema Automático",
                    "concepto": f"Mensualidad automática - Período {mes_anio}",
                    "comprobante": "n/a",
                    "admin_control": True
                }

                updates = {
                    "finanzas.saldo_a_favor": nuevo_saldo,
                    "finanzas.historial_pagos": firestore.ArrayUnion([registro_cargo]),
                    "deuda": True if nuevo_saldo < 0 else False
                }

                # Sincronización en ambas rutas de Firebase
                ref_global = db.collection('proyectos').document(p_id)
                ref_real = db.collection('users').document(data['aliado_id'])\
                             .collection('clientes').document(data['cliente_id'])\
                             .collection('proyectos').document(p_id)

                batch.update(ref_global, updates)
                batch.update(ref_real, updates)
                
                conteo += 1

        # Ejecutar todos los cobros en un solo movimiento
        if conteo > 0:
            batch.commit()
            
        return jsonify({
            "status": "success", 
            "message": f"Proceso completado. Se aplicaron {conteo} cobros mensuales."
        }), 200

    except Exception as e:
        print(f"Error en Cron de Cobro: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500    
