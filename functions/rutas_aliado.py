from flask import Blueprint, request, jsonify, session
from firebase_admin import firestore
import datetime
aliado_bp = Blueprint('aliado', __name__)
db = firestore.client()

@aliado_bp.route('/crear_cliente', methods=['POST'])
def crear_cliente():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    try:
        uid_aliado = session.get('user') # El ID del documento del aliado
        data = request.get_json()
        
        # Datos del cliente
        nuevo_cliente = {
            "nombre": data.get('nombre'),
            "documento": data.get('documento'),
            "correo": data.get('correo'),
            "celular": data.get('celular'),
            "whatsapp": data.get('whatsapp'),
            "fecha_registro": firestore.SERVER_TIMESTAMP,
            "proyectos_activos": 0,
            "deuda": False,
            "estado": "activo"
        }

        # REFERENCIA A SUBCOLECCIÓN: users/{uid}/clientes
        # Esto crea el cliente dentro de la carpeta del aliado actual
        doc_ref = db.collection('users').document(uid_aliado).collection('clientes').add(nuevo_cliente)
        
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
            
            # --- EL CAMBIO CLAVE ---
            # Consultamos la subcolección de proyectos de ESTE cliente específico
            proyectos_ref = db.collection('users').document(uid_aliado)\
                              .collection('clientes').document(doc.id)\
                              .collection('proyectos').get()
            
            # Agregamos el conteo al objeto que va para el JS
            cliente_data['proyectos_conteo'] = len(proyectos_ref)
            # -----------------------

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


        nuevo_proyecto = {
            "nombre_negocio": data.get('nombre_negocio'),
            "categoria": data.get('categoria'),
            "eslogan": data.get('eslogan'),
            "contacto": data.get('contacto'), 
            "branding": data.get('branding'), 
            "recursos": data.get('recursos'), 
            "observaciones": data.get('observaciones'),
            "fecha_creacion": firestore.SERVER_TIMESTAMP, # Para ordenamiento exacto
            "fecha_display": datetime.datetime.now(), # Para mostrar al usuario
            "estado": "activo",
            "aliado_propietario": uid_aliado,
            "deuda": False
        }

        # 3. Guardar en ruta jerárquica
        # .add() devuelve (timestamp, doc_reference)
        update_time, doc_ref = db.collection('users').document(uid_aliado)\
                                 .collection('clientes').document(cliente_id)\
                                 .collection('proyectos').add(nuevo_proyecto)

        nuevo_proyecto_id = doc_ref.id # <--- ID Correcto

        # 4. Actualizar contador en el cliente
        db.collection('users').document(uid_aliado)\
          .collection('clientes').document(cliente_id).update({
              "proyectos_conteo": firestore.Increment(1)
          })
        
        # 5. CREAR COLECCIÓN RAÍZ 'proyectos'
        # Añadimos el nombre del negocio también aquí para facilitar búsquedas globales
        db.collection('proyectos').document(nuevo_proyecto_id).set({
            "proyecto_id": nuevo_proyecto_id,
            "nombre_negocio": data.get('nombre_negocio'),
            "cliente_id": cliente_id,
            "aliado_id": uid_aliado,
            "deuda": False,
            "fecha_registro": firestore.SERVER_TIMESTAMP
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
        clientes_ref = db.collection('users').document(uid_aliado).collection('clientes').stream()
        
        total_clientes = 0
        activos = 0
        inactivos = 0

        for cli_doc in clientes_ref:
            total_clientes += 1
            # Entramos a la subcolección de proyectos de cada cliente
            proyectos = db.collection('users').document(uid_aliado)\
                          .collection('clientes').document(cli_doc.id)\
                          .collection('proyectos').stream()
            
            for p in proyectos:
                p_data = p.to_dict()
                # Lógica: Si el estado es 'activo' suma a activos, si no a inactivos
                if p_data.get('estado') == 'activo':
                    activos += 1
                else:
                    inactivos += 1

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
        detalles_ref = db.collection('users').document(uid_aliado)\
                         .collection('clientes').document(cliente_id)\
                         .collection('proyectos').document(id_proyecto).get()
        
        # Combinamos ambos diccionarios
        data_completa = {**proyecto_data, **detalles_ref.to_dict()}
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