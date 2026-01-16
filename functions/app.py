from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
import os
import firebase_admin
from firebase_admin import credentials, auth, firestore
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)

# Configuración para que Flask funcione correctamente detrás del proxy de Firebase
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# CLAVE SECRETA: Cambia esto por algo único para asegurar tus sesiones
app.secret_key = "GRUPO_JJ_SECURITY_KEY_2026"

# CONFIGURACIÓN CRUCIAL PARA FIREBASE HOSTING
# Firebase solo permite el paso de cookies llamadas '__session'
app.config.update(
    SESSION_COOKIE_NAME='__session',
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_SAMESITE='Lax',
)

# --- Inicialización de Firebase ---
# Obtenemos la ruta absoluta de la carpeta donde está este script
base_dir = os.path.dirname(os.path.abspath(__file__))
# Unimos la carpeta con el nombre exacto de tu archivo JSON
cert_path = os.path.join(base_dir, "service-account-key.json")

if not firebase_admin._apps:
    try:
        if os.path.exists(cert_path):
            # USAMOS cert_path en lugar del texto de ejemplo
            cred = credentials.Certificate(cert_path)
            firebase_admin.initialize_app(cred, {
                'storageBucket': 'gestioncontrol-grupojj.firebasestorage.app'
            })
            print(f"✅ Firebase cargado con éxito localmente desde: {cert_path}")
        else:
            # Si no existe el archivo (por ejemplo, en producción/nube)
            firebase_admin.initialize_app(options={
                'storageBucket': 'gestioncontrol-grupojj.firebasestorage.app'
            })
            print("Firebase inicializado con credenciales de entorno")
    except Exception as e:
        print(f"Error inicializando Firebase: {e}")

# Ahora el cliente de firestore funcionará porque la app ya está inicializada
db = firestore.client()


from rutas_aliado import aliado_bp
app.register_blueprint(aliado_bp, url_prefix='/aliado')
# --- Rutas ---

@app.route('/')
def index():
    # Si ya tiene sesión, enviarlo directo al dashboard
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        id_token = data.get('token')
        
        # 1. Verificar el token con Firebase Admin
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        
        # 2. Consultar datos y rol en Firestore
        # NOTA: Asegúrate que en Firestore la colección se llame 'users'
        user_doc = db.collection('users').document(uid).get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            user_role = user_data.get('role', 'aliado') # 'admin' o 'aliado'
            
            # 3. Guardar en la cookie __session
            session['user'] = uid
            session['role'] = user_role
            session['datos'] = user_data
            
            return jsonify({"status": "success", "role": user_role}), 200
        else:
            return jsonify({"status": "error", "message": "Usuario no encontrado en la base de datos"}), 404
            
    except Exception as e:
        print(f"Error en login: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 401

@app.route('/dashboard')
def dashboard():
    # Protección de ruta: Si no hay cookie __session válida
    if 'user' not in session:
        return redirect(url_for('index'))

    role = session.get('role')
    datos = session.get('datos')
    uid = session.get('user')

    if role == 'admin':
        return render_template('admin_dashboard.html', datos=datos, uid=uid)
    elif role == 'aliado':
        return render_template('aliado_dashboard.html', datos=datos, uid=uid)
    
    return render_template('login.html', error="Acceso denegado: Rol no reconocido.")

@app.route('/logout')
def logout():
    session.clear() # Borra la cookie __session
    return redirect(url_for('index'))

@app.route('/manifest.json')
def manifest():
    # Le dice a Flask que sirva el archivo desde la carpeta estática
    return send_from_directory('static', 'manifest.json', mimetype='application/json')

@app.route('/sw.js')
def service_worker():
    # El Service Worker TAMBIÉN debe servirse desde la raíz
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

@app.route('/logo.png')
def logo_root():
    # Opcional: para que /logo.png funcione directo
    return send_from_directory('static', 'logo.png', mimetype='image/png')

if __name__ == "__main__":
    app.run(debug=True)