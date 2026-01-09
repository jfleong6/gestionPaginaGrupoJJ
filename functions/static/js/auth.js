const firebaseConfig = {
    apiKey: "AIzaSyAZBn_XdJGpwtdhgLCafMc1U8tTlucy14U",
    authDomain: "gestioncontrol-grupojj.firebaseapp.com",
    projectId: "gestioncontrol-grupojj",
    storageBucket: "gestioncontrol-grupojj.firebasestorage.app",
    messagingSenderId: "268060053642",
    appId: "1:268060053642:web:b90f5ef9f9e02afda05d73",
    measurementId: "G-TDN9DBN7X0"
};
// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // FORZAR PERSISTENCIA LOCAL
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        // 1. Autenticar
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const idToken = await userCredential.user.getIdToken();

        // 2. Enviar al Backend
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken })
        });
        
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        
        const result = await response.json();
        if (result.status === 'success') {
            window.location.href = '/dashboard';
        }
    } catch (error) {
        console.error("Error detallado:", error);
        alert("Error: " + error.message);
    }
});