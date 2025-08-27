// Récupérer le service d'authentification
const auth = firebase.auth();
const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  // On utilise l'email tel quel
  const email = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    // Tentative de connexion
    await auth.signInWithEmailAndPassword(email, password);
    console.log("Connexion OK → redirection…");
    window.location.href = "chatbot.html?user=" + encodeURIComponent(email);
  } catch (err) {
    console.error("Erreur de connexion :", err.code, err.message);

    // Si l'utilisateur n'existe pas encore, on le crée
    if (err.code === "auth/user-not-found") {
      try {
        await auth.createUserWithEmailAndPassword(email, password);
        console.log("Utilisateur créé → redirection…");
        window.location.href = "chatbot.html?user=" + encodeURIComponent(email);
      } catch (e2) {
        errorMsg.textContent = "Création impossible : " + e2.message;
        console.error("Erreur création :", e2.code, e2.message);
      }
    } else {
      // Autres erreurs (mot de passe trop court, mauvais format, etc.)
      errorMsg.textContent = "Erreur : " + err.message;
    }
  }
});
