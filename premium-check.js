(function() {
  if (localStorage.getItem("hsk_premium_active") !== "true") {
    const path = window.location.pathname;
    const redirect = path.substring(0, path.lastIndexOf("/") + 1) + "index.html";
    window.location.href = redirect;
  }
})();
