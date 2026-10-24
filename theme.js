(() => {
  const storageKey = "escuela-dominical-theme";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let savedTheme = null;

  try {
    savedTheme = localStorage.getItem(storageKey);
  } catch {
    // La preferencia del sistema sigue funcionando si el almacenamiento está bloqueado.
  }

  const initialTheme = savedTheme === "dark" || savedTheme === "light"
    ? savedTheme
    : (systemTheme.matches ? "dark" : "light");

  document.documentElement.dataset.theme = initialTheme;

  function updateThemeColor(theme) {
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      if (!meta.dataset.lightColor) meta.dataset.lightColor = meta.content;
      meta.content = theme === "dark" ? "#141510" : meta.dataset.lightColor;
    });
  }

  function updateButton(button, theme) {
    const nextTheme = theme === "dark" ? "claro" : "oscuro";
    button.innerHTML = `<span aria-hidden="true">${theme === "dark" ? "☀" : "☾"}</span><span>Modo ${nextTheme}</span>`;
    button.setAttribute("aria-label", `Cambiar a modo ${nextTheme}`);
    button.title = `Cambiar a modo ${nextTheme}`;
    button.setAttribute("aria-pressed", String(theme === "dark"));
  }

  function applyTheme(theme, persist = false) {
    document.documentElement.dataset.theme = theme;
    updateThemeColor(theme);
    const button = document.querySelector(".theme-toggle");
    if (button) updateButton(button, theme);

    if (persist) {
      savedTheme = theme;
      try {
        localStorage.setItem(storageKey, theme);
      } catch {
        // El cambio sigue activo durante esta visita.
      }
    }
  }

  function mountToggle() {
    const button = document.createElement("button");
    button.className = "theme-toggle";
    button.type = "button";
    button.addEventListener("click", () => {
      applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
    });
    document.body.append(button);
    applyTheme(document.documentElement.dataset.theme);
  }

  updateThemeColor(initialTheme);

  systemTheme.addEventListener("change", (event) => {
    if (!savedTheme) applyTheme(event.matches ? "dark" : "light");
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggle, { once: true });
  } else {
    mountToggle();
  }
})();
