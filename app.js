// Initialisation Firebase
const auth = firebase.auth();

const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('username').value + "@chatbot.com"; 
    const password = document.getElementById('password').value;

    try {
        // Connexion utilisateur
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = "chatbot.html?user=" + encodeURIComponent(email);
    } catch (error) {
        // Si l'utilisateur n'existe pas, on le crée
        if (error.code === "auth/user-not-found") {
            await auth.createUserWithEmailAndPassword(email, password);
            window.location.href = "chatbot.html?user=" + encodeURIComponent(email);
        } else {
            errorMsg.textContent = "Erreur : " + error.message;
        }
    }
});
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDP6Wix-qehAnUq9FYmMAYdbEiqKYQnXWs",
  authDomain: "smartverbatims.firebaseapp.com",
  projectId: "smartverbatims",
  storageBucket: "smartverbatims.firebasestorage.app",
  messagingSenderId: "1043743921058",
  appId: "1:1043743921058:web:637f9bc10cc3859e86d8fb",
  measurementId: "G-R64GD8CJLS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
