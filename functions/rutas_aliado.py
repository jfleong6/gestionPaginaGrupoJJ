from flask import Blueprint, request, jsonify, session
from firebase_admin import firestore, storage
from datetime import datetime
import uuid
from PIL import Image
import io

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



aliado_bp = Blueprint('aliado', __name__)
db = firestore.client()

@aliado_bp.route('/crear_cliente', methods=['POST'])
def crear_cliente():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    try:
        uid_aliado = session.get('user') 
        data = request.get_json()
        
        # Datos del cliente
        nuevo_cliente = {
            "nombre": data.get('nombre'),
            "documento": data.get('documento'),
            "correo": data.get('correo'),
            "celular": data.get('celular'),
            "whatsapp": data.get('whatsapp'),
            "fecha_registro": firestore.SERVER_TIMESTAMP,
            "proyectos_conteo": 0, # Iniciamos en 0 explícitamente
            "deuda": False,
            "estado": "activo"
        }


        doc_ref = db.collection('users').document(uid_aliado).collection('clientes').add(nuevo_cliente)

        db.collection('users').document(uid_aliado).set({
            'stats_total_clientes': firestore.Increment(1)
        }, merge=True)

        return jsonify({
            "status": "success", 
            "message": "Cliente agregado a tu lista personal",
            "id": doc_ref[1].id
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@aliado_bp.route('/obtener_clientes', methods=['GET'])
def obtener_clientes():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    try:
        uid_aliado = session.get('user')
        # Traemos todos los clientes del aliado actual
        clientes_ref = db.collection('users').document(uid_aliado).collection('clientes').stream()
        
        lista_clientes = []
        for doc in clientes_ref:
            cliente_data = doc.to_dict()
            cliente_data['id'] = doc.id
            cliente_data['proyectos_conteo'] = cliente_data.get('proyectos_conteo', 0)
            lista_clientes.append(cliente_data)
            
        return jsonify({"status": "success", "data": lista_clientes}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@aliado_bp.route('/obtener_todos_los_proyectos', methods=['GET'])
def obtener_todos_los_proyectos():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    try:
        uid_aliado = session.get('user')
        # 1. Obtener todos los clientes de este aliado
        clientes_ref = db.collection('users').document(uid_aliado).collection('clientes').stream()
        
        proyectos_globales = []

        for cli_doc in clientes_ref:
            cliente_data = cli_doc.to_dict()
            cliente_id = cli_doc.id
            cliente_nombre = cliente_data.get('nombre', 'Sin nombre')

            # 2. Por cada cliente, buscar sus proyectos en su subcolección
            proyectos_ref = db.collection('users').document(uid_aliado)\
                              .collection('clientes').document(cliente_id)\
                              .collection('proyectos').stream()

            for proy_doc in proyectos_ref:
                proyecto = proy_doc.to_dict()
                proyecto['proyecto_id'] = proy_doc.id
                proyecto['cliente_id'] = cliente_id
                proyecto['cliente_nombre'] = cliente_nombre # Para saber de quién es el proyecto
                proyectos_globales.append(proyecto)

        return jsonify({"status": "success", "data": proyectos_globales}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    
@aliado_bp.route('/crear_proyecto/<cliente_id>', methods=['POST'])
def crear_proyecto(cliente_id):
    if 'user' not in session:
        return jsonify({"status": "error", "message": "Sesión no válida"}), 401
    
    try:
        uid_aliado = session.get('user')
        data = request.get_json()

        # 1. OPTIMIZACIÓN: Leer datos del cliente UNA sola vez
        # Necesitamos el nombre para guardarlo en el proyecto y evitar consultas extra después
        cliente_ref = db.collection('users').document(uid_aliado)\
                        .collection('clientes').document(cliente_id).get()
        
        nombre_cliente = "Cliente Desconocido"
        if cliente_ref.exists:
            nombre_cliente = cliente_ref.to_dict().get('nombre', 'Sin Nombre')

        # Definir montos según categoría
        categoria = data.get('categoria', '').lower()
        if categoria in ['restaurante', 'portafolio', 'portafolios']:
            cobro_inicial = 100000
            mensualidad = 20000
        elif categoria in ['almacen', 'tienda']:
            cobro_inicial = 400000
            mensualidad = 40000
        else:
            cobro_inicial = 0
            mensualidad = 0

        nuevo_proyecto = {
            "nombre_negocio": data.get('nombre_negocio'),
            "categoria": data.get('categoria'),
            "eslogan": data.get('eslogan'),
            "contacto": data.get('contacto'), 
            "branding": data.get('branding'), 
            "recursos": data.get('recursos'), 
            "observaciones": data.get('observaciones'),
            "fecha_creacion": firestore.SERVER_TIMESTAMP,
            "fecha_display": datetime.now(),
            "estado": "activo",
            "aliado_propietario": uid_aliado,
            # --- CAMPOS NUEVOS PARA OPTIMIZACIÓN ---
            "cliente_id": cliente_id,
            "cliente_nombre": nombre_cliente,
            # ---------------------------------------
            "deuda": True, 
            "finanzas": {
                "cobro_inicial": cobro_inicial,
                "mensualidad_base": mensualidad,
                "saldo_a_favor": 0,
                "historial_pagos": []
            }
        }

        # 2. Guardar en ruta jerárquica (users -> clientes -> proyectos)
        update_time, doc_ref = db.collection('users').document(uid_aliado)\
                                 .collection('clientes').document(cliente_id)\
                                 .collection('proyectos').add(nuevo_proyecto)

        nuevo_proyecto_id = doc_ref.id 

        # 3. Actualizar contador LOCAL en el cliente (+1 proyecto para este cliente)
        db.collection('users').document(uid_aliado)\
          .collection('clientes').document(cliente_id).update({
              "proyectos_conteo": firestore.Increment(1)
          })
        
        # 4. OPTIMIZACIÓN: Actualizar contador GLOBAL en el perfil del aliado
        # Esto alimenta la gráfica de "Proyectos Activos" del dashboard
        db.collection('users').document(uid_aliado).set({
            'stats_proyectos_activos': firestore.Increment(1)
        }, merge=True)
        
        # 5. Guardar en Colección Global 'proyectos' (Referencia Rápida)
        db.collection('proyectos').document(nuevo_proyecto_id).set({
            "proyecto_id": nuevo_proyecto_id,
            "nombre_negocio": data.get('nombre_negocio'),
            "cliente_id": cliente_id,
            "aliado_id": uid_aliado,
            "cliente_nombre": nombre_cliente, # Guardamos el nombre aquí también
            "deuda": False
        })

        return jsonify({
            "status": "success", 
            "message": "Proyecto creado exitosamente",
            "proyecto_id": nuevo_proyecto_id
        }), 200

    except Exception as e:
        print(f"Error en crear_proyecto: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@aliado_bp.route('/obtener_estadisticas', methods=['GET'])
def obtener_estadisticas():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    try:
        uid_aliado = session.get('user')
        
        # OPTIMIZACIÓN: Leemos solo 1 documento (el perfil del aliado)
        user_doc = db.collection('users').document(uid_aliado).get()
        
        if not user_doc.exists:
             return jsonify({"status": "error", "message": "Usuario no encontrado"}), 404

        user_data = user_doc.to_dict()

        # Usamos .get('clave', 0) para evitar errores si los campos son nuevos
        total_clientes = user_data.get('stats_total_clientes', 0)
        activos = user_data.get('stats_proyectos_activos', 0)
        inactivos = user_data.get('stats_proyectos_inactivos', 0)

        return jsonify({
            "status": "success",
            "stats": {
                "clientes": total_clientes,
                "proyectosActivos": activos,
                "proyectosInactivos": inactivos
            }
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@aliado_bp.route('/obtener_proyecto/<string:id_proyecto>', methods=['GET'])
def obtener_proyecto(id_proyecto):
    # print(f"Solicitud para obtener proyecto ID: {id_proyecto}")
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    try:
        uid_aliado = session.get('user')
        
        # 1. Consultamos la colección global 'proyectos'
        proyecto_ref = db.collection('proyectos').document(id_proyecto).get()

        if not proyecto_ref.exists:
            return jsonify({"status": "error", "message": "Proyecto no encontrado"}), 404

        proyecto_data = proyecto_ref.to_dict()

        # 2. Seguridad: Verificar que el proyecto pertenece al aliado que consulta
        if proyecto_data.get('aliado_id') != uid_aliado:
            return jsonify({"status": "error", "message": "Acceso denegado"}), 403

        # 3. (Opcional) Si necesitas los datos extra que están en la subcolección del cliente
        # Aquí sí usamos la ruta jerárquica
        cliente_id = proyecto_data.get('cliente_id')
        # 1. Obtenemos el documento principal del proyecto
        proyecto_doc = db.collection('users').document(uid_aliado)\
                        .collection('clientes').document(cliente_id)\
                        .collection('proyectos').document(id_proyecto).get()

        if proyecto_doc.exists:
            # 2. Obtenemos todos los documentos de la subcolección 'tareas'
            tareas_query = db.collection('users').document(uid_aliado)\
                            .collection('clientes').document(cliente_id)\
                            .collection('proyectos').document(id_proyecto)\
                            .collection('tareas').stream()
            
            # Convertimos las tareas a una lista de diccionarios
            lista_tareas = []
            for tarea in tareas_query:
                t_data = tarea.to_dict()
                t_data['id'] = tarea.id  # Opcional: guardar el ID de la tarea
                lista_tareas.append(t_data)

            # 3. Combinamos todo en un solo objeto
            # Usamos proyecto_data (lo que ya tenías), el dict del documento y la nueva lista
            data_completa = {
                **proyecto_data, 
                **proyecto_doc.to_dict(),
                "tareas": lista_tareas  # Aquí inyectamos la subcolección
            }
    

        # print(data_completa)

        return jsonify({"status": "success", "proyecto": data_completa}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@aliado_bp.route('/agregar_tarea', methods=['POST'])
def agregar_tarea():

    # 1. Seguridad: Verificar sesión del aliado
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    uid_aliado = session.get('user')
    try:
        data = request.get_json()
        id_proyecto = data.get('id_proyecto') # El ID del documento en la colección global 'proyectos'
        
        if not id_proyecto:
            return jsonify({"status": "error", "message": "Falta el ID del proyecto"}), 400
        

        # 2. Estructurar la tarea
        nueva_tarea = {
            "titulo": data.get('titulo'),
            "descripcion": data.get('descripcion'),
            "categoria": data.get('categoria'),
            "prioridad": data.get('prioridad', 'medium'),
            "status": "todo",  # Siempre inicia en "Por hacer"
            "fecha_creacion": firestore.SERVER_TIMESTAMP,
            "creado_por": session.get('user')
        }

        # 3. Guardar en la sub-colección: proyectos -> {id_proyecto} -> tareas -> {auto_id}
        # Nota: Usamos la colección global 'proyectos' como punto de ancla
        doc_ref = db.collection('users').document(uid_aliado).collection('clientes').document(data.get('id_cliente')).collection('proyectos').document(id_proyecto).collection('tareas').add(nueva_tarea)

        return jsonify({
            "status": "success", 
            "message": "Tarea agregada",
            "id_tarea": doc_ref[1].id # doc_ref[1] es la referencia del documento en .add()
        }), 200

    except Exception as e:
        print(f"Error al agregar tarea: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    

@aliado_bp.route('/agregar_nota', methods=['POST'])
def agregar_nota():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    uid_aliado = session.get('user')
    try:
        data = request.get_json()
        id_cliente = data.get('id_cliente')
        id_proyecto = data.get('id_proyecto')
        id_tarea = data.get('id_tarea') # El ID del documento que ya existe
        texto_nota = data.get('nota')
        print(id_tarea)

        # 1. REFERENCIA: Debe terminar en el documento de la TAREA
        # No agregues .collection() después de esto
        tarea_ref = db.collection('users').document(uid_aliado)\
                    .collection('clientes').document(id_cliente)\
                    .collection('proyectos').document(id_proyecto)\
                    .collection('tareas').document(id_tarea)

        # 2. La nota que queremos meter en el array
        nueva_nota = {
            "comentario": texto_nota,
            "fecha": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "autor": uid_aliado
        }

        print(f"Ruta de destino: {tarea_ref.path}")

        # 3. EL CAMBIO REAL: Usar .set() con ArrayUnion
        # Esto NO crea un documento nuevo, sino que edita el existente 
        # agregando la nota al campo 'historial_notas'
        tarea_ref.set({
            "historial_notas": firestore.ArrayUnion([nueva_nota]),
            "ultima_actualizacion": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }, merge=True) # merge=True es vital para no borrar otros campos de la tarea
            
        return jsonify({"status": "success", "message": "Nota integrada en la tarea"}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@aliado_bp.route('/actualizar_status_tarea', methods=['POST'])
def actualizar_status_tarea():
    # 1. Verificación de sesión (igual que en agregar_nota)
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    uid_aliado = session.get('user')
    
    try:
        data = request.get_json()
        id_cliente = data.get('id_cliente')
        id_proyecto = data.get('id_proyecto')
        id_tarea = data.get('id_tarea')
        nuevo_status = data.get('nuevo_status')

        # Imprimir para depuración en consola
        print(f"Moviendo tarea {id_tarea} a estado: {nuevo_status}")

        # 2. REFERENCIA: Siguiendo tu estructura exacta de colecciones
        tarea_ref = db.collection('users').document(uid_aliado)\
                      .collection('clientes').document(id_cliente)\
                      .collection('proyectos').document(id_proyecto)\
                      .collection('tareas').document(id_tarea)

        # 3. ACTUALIZACIÓN: Usamos update o set con merge=True
        # Actualizamos el status y la fecha de última modificación
        tarea_ref.set({
            "status": nuevo_status,
            "ultima_actualizacion": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }, merge=True)

        return jsonify({
            "status": "success", 
            "message": f"Tarea actualizada a {nuevo_status}",
            "nuevo_status": nuevo_status
        }), 200

    except Exception as e:
        print(f"Error en actualizar_status_tarea: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500   

@aliado_bp.route('/actualizar_info_proyecto', methods=['POST'])
def actualizar_info_proyecto():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    try:
        uid_aliado = session.get('user')
        data = request.get_json()

        # Extraer IDs necesarios para las rutas de Firestore
        id_proyecto = data.get('id_proyecto')
        id_cliente = data.get('id_cliente')

        if not id_proyecto or not id_cliente:
            return jsonify({"status": "error", "message": "IDs de proyecto o cliente ausentes"}), 400

        # Construir el diccionario con los campos que permitimos editar
        # Siguiendo exactamente la estructura de tu JSON
        campos_actualizados = {
            "nombre_negocio": data.get('nombre_negocio'),
            "eslogan": data.get('eslogan'),
            "categoria": data.get('categoria'),
            "branding": {
                "fuente": data.get('branding', {}).get('fuente'),
                "colores": data.get('branding', {}).get('colores', [])
            },
            "contacto": {
                "whatsapp": data.get('contacto', {}).get('whatsapp'),
                "email": data.get('contacto', {}).get('email'),
                "instagram": data.get('contacto', {}).get('instagram'),
                "facebook": data.get('contacto', {}).get('facebook'),
                "linkedin": data.get('contacto', {}).get('linkedin'),
                "tiktok": data.get('contacto', {}).get('tiktok')
            },
            "ultima_edicion": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }

        # 1. ACTUALIZAR EN LA RUTA JERÁRQUICA (users -> clientes -> proyectos)
        # Usamos .set con merge=True para asegurar que no borramos campos como 'tareas'
        proyecto_jerarquico_ref = db.collection('users').document(uid_aliado)\
                                    .collection('clientes').document(id_cliente)\
                                    .collection('proyectos').document(id_proyecto)
        
        proyecto_jerarquico_ref.set(campos_actualizados, merge=True)

        # 2. ACTUALIZAR EN LA COLECCIÓN GLOBAL (proyectos)
        # Esto es vital para que 'obtener_proyecto' siga funcionando bien
        proyecto_global_ref = db.collection('proyectos').document(id_proyecto)
        
        # Opcional: Verificar que el aliado es el dueño antes de editar la global
        doc_global = proyecto_global_ref.get()
        if doc_global.exists and doc_global.to_dict().get('aliado_id') == uid_aliado:
            proyecto_global_ref.set(campos_actualizados, merge=True)

        return jsonify({
            "status": "success", 
            "message": "Información del proyecto actualizada correctamente"
        }), 200

    except Exception as e:
        print(f"Error al actualizar proyecto: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@aliado_bp.route('/registrar_pago', methods=['POST'])
def registrar_pago():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    uid_aliado = session.get('user')
    
    try:
        # 1. Recoger datos del formulario
        id_cliente = request.form.get('id_cliente')
        id_proyecto = request.form.get('id_proyecto')
        monto = int(request.form.get('monto'))
        concepto = request.form.get('concepto')
        archivo = request.files.get('soporte')

        if not archivo:
            return jsonify({"status": "error", "message": "Falta el comprobante"}), 400

        # 2. OPTIMIZAR LA IMAGEN antes de subirla
        buffer_optimizado = optimizar_imagen(archivo)
        
        if not buffer_optimizado:
            return jsonify({"status": "error", "message": "Error al procesar la imagen"}), 500

        # 3. Subir a Firebase Storage
        bucket = storage.bucket()
        # Generamos un nombre único con extensión .webp
        nombre_archivo = f"pagos/{uid_aliado}/{id_proyecto}/{uuid.uuid4().hex}.webp"
        blob = bucket.blob(nombre_archivo)
        
        blob.upload_from_file(buffer_optimizado, content_type="image/webp")
        blob.make_public()
        url_soporte = blob.public_url

        # 4. Preparar el objeto de pago para Firestore
        nuevo_pago = {
            "id": str(uuid.uuid4())[:8],
            "fecha": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "monto": monto,
            "concepto": concepto,
            "soporte_url": url_soporte,
            "autor": uid_aliado
        }

        # 5. Actualización en Batch para asegurar que se guarde en ambos lugares
        # A. Ruta jerárquica
        ref_jerarquica = db.collection('users').document(uid_aliado)\
                           .collection('clientes').document(id_cliente)\
                           .collection('proyectos').document(id_proyecto)
        
        # B. Ruta global
        ref_global = db.collection('proyectos').document(id_proyecto)

        datos_actualizacion = {
            "finanzas.historial_pagos": firestore.ArrayUnion([nuevo_pago]),
            "deuda": False # Se pone en false al recibir el reporte (puedes cambiar esto a validación manual)
        }

        ref_jerarquica.update(datos_actualizacion)
        ref_global.update(datos_actualizacion)

        return jsonify({
            "status": "success", 
            "nuevo_pago": nuevo_pago,
            "estado_deuda": False
        }), 200

    except Exception as e:
        print(f"Error crítico en registrar_pago: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500   
