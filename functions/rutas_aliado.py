from flask import Blueprint, request, jsonify, session
from firebase_admin import firestore

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
                proyecto['id'] = proy_doc.id
                proyecto['cliente_id'] = cliente_id
                proyecto['cliente_nombre'] = cliente_nombre # Para saber de quién es el proyecto
                proyectos_globales.append(proyecto)

        return jsonify({"status": "success", "data": proyectos_globales}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    
@aliado_bp.route('/crear_proyecto/<cliente_id>', methods=['POST'])
def crear_proyecto(cliente_id):
    # 1. Verificar sesión
    if 'user' not in session:
        return jsonify({"status": "error", "message": "Sesión no válida"}), 401
    
    try:
        uid_aliado = session.get('user')
        data = request.get_json()

        # 2. Estructurar el documento según lo enviado por el JS
        # Mantenemos la organización por categorías para que sea fácil de leer después
        nuevo_proyecto = {
            "nombre_negocio": data.get('nombre_negocio'),
            "categoria": data.get('categoria'),
            "eslogan": data.get('eslogan'),
            
            # Sub-diccionarios que vienen del payload de JS
            "contacto": data.get('contacto'), # whatsapp, email, instagram, social_extra
            "branding": data.get('branding'), # colores (lista), fuente
            "recursos": data.get('recursos'), # logo_url, mapa_url
            
            # Metadatos del sistema
            "fecha_creacion": firestore.SERVER_TIMESTAMP,
            "estado": "activo",
            "aliado_propietario": uid_aliado
        }

        # 3. Guardar en la ruta jerárquica: users -> aliado -> clientes -> cliente -> proyectos
        doc_ref = db.collection('users').document(uid_aliado)\
                    .collection('clientes').document(cliente_id)\
                    .collection('proyectos').add(nuevo_proyecto)

        # 4. (Opcional) Incrementar el contador de proyectos en el cliente
        # Esto hace que la tabla de clientes se actualice automáticamente
        db.collection('users').document(uid_aliado)\
          .collection('clientes').document(cliente_id).update({
              "proyectos_conteo": firestore.Increment(1)
          })

        return jsonify({
            "status": "success", 
            "message": "Proyecto creado exitosamente",
            "proyecto_id": doc_ref[1].id
        }), 200

    except Exception as e:
        print(f"Error en crear_proyecto: {str(e)}")
        return jsonify({"status": "error", "message": "Error interno del servidor"}), 500
    
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