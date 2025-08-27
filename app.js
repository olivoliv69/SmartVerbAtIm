const auth = firebase.auth();
const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  // On crée un email artificiel à partir du username
  const email = document.getElementById('username').value.trim() + "@chatbot.com";
  const password = document.getElementById('password').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = "chatbot.html?user=" + encodeURIComponent(email);
  } catch (err) {
    // Si l'user n'existe pas, on le crée
    if (err.code === "auth/user-not-found") {
      try {
        await auth.createUserWithEmailAndPassword(email, password);
        window.location.href = "chatbot.html?user=" + encodeURIComponent(email);
      } catch (e2) {
        errorMsg.textContent = "Erreur à la création : " + e2.message;
        console.error(e2);
      }
    } else {
      errorMsg.textContent = "Erreur : " + err.message;
      console.error(err);
    }
  }
});
