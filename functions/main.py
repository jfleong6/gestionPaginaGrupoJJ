from firebase_functions import https_fn
from app import app

@https_fn.on_request()
def gestioncontrol(req):
    # Firebase Functions Gen 2 usa objetos de solicitud de Werkzeug/Flask.
    # Para integrarlo correctamente con nuestra app de Flask:
    with app.request_context(req.environ):
        return app.full_dispatch_request()

# Para pruebas locales
if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True, port=5000)