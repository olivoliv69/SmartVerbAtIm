const auth = firebase.auth();
const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  // ⚡ Ici : on prend l'email EXACT tapé par l'utilisateur
  const email = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    console.log("Connexion OK → redirection…");
    window.location.href = "chatbot.html?user=" + encodeURIComponent(email);
  } catch (err) {
    console.error("Erreur connexion :", err.code, err.message);

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
      errorMsg.textContent = "Erreur : " + err.message;
    }
  }
});
