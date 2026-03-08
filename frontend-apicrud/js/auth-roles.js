/**
 * Login y control de acceso por roles para el frontend.
 * Roles soportados: administrador, vendedor, cajero.
 */
(() => {
  "use strict";

  const storageKeySesion = "inventarioSesionUsuario";
  const paginaActual = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const esPaginaIndex = paginaActual === "index.html" || paginaActual === "";

  function obtenerSesion() {
    try {
      const sesionTexto = localStorage.getItem(storageKeySesion);
      return sesionTexto ? JSON.parse(sesionTexto) : null;
    } catch (error) {
      console.error("No fue posible leer la sesion:", error);
      return null;
    }
  }

  function guardarSesion(sesion) {
    localStorage.setItem(storageKeySesion, JSON.stringify(sesion));
  }

  function limpiarSesion() {
    localStorage.removeItem(storageKeySesion);
  }

  function obtenerUrlsLoginCandidatas() {
    if (window.API_LOGIN_URL) {
      return [window.API_LOGIN_URL];
    }

    // Forzar backend API local por defecto para evitar 405 del servidor estatico (Live Server).
    return ["http://localhost:3000/api/login"];
  }

  async function validarRespuestaHttp(respuesta) {
    if (respuesta.ok) {
      return;
    }

    let mensajeError = `Error HTTP ${respuesta.status}`;

    try {
      const dataError = await respuesta.json();
      if (dataError?.message) {
        mensajeError = dataError.message;
      }
    } catch (error) {
      console.error("No fue posible interpretar el error HTTP:", error);
    }

    throw new Error(mensajeError);
  }

  async function loginUsuario(usuario, contrasena) {
    const urls = obtenerUrlsLoginCandidatas();
    let ultimaRespuesta = null;
    let ultimoErrorConexion = null;

    for (const url of urls) {
      try {
        const respuesta = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario, contrasena }),
        });

        ultimaRespuesta = respuesta;

        if ((respuesta.status === 404 || respuesta.status === 405) && urls.indexOf(url) < urls.length - 1) {
          continue;
        }

        await validarRespuestaHttp(respuesta);
        return await respuesta.json();
      } catch (error) {
        ultimoErrorConexion = error;
      }
    }

    if (ultimaRespuesta) {
      await validarRespuestaHttp(ultimaRespuesta);
    }

    throw (
      ultimoErrorConexion ||
      new Error("No fue posible conectar con la API de login en http://localhost:3000/api/login.")
    );
  }

  function establecerUsuarioEnTopbar(sesion) {
    const etiquetaUsuario = document.querySelector("#userDropdown .small");
    if (!etiquetaUsuario) {
      return;
    }

    const nombre = sesion?.usuario || "Usuario";
    const rol = sesion?.rol || "sin-rol";
    etiquetaUsuario.textContent = `${nombre} (${rol})`;
  }

  function ocultarModuloUsuarios() {
    const collapseUsuarios = document.getElementById("collapseUsuarios");
    if (collapseUsuarios) {
      const navItem = collapseUsuarios.closest("li.nav-item");
      if (navItem) {
        navItem.classList.add("d-none");
      }
    }

    document.querySelectorAll('a[href="listado-usuarios.html"], a[href="crear-usuario.html"]').forEach((enlace) => {
      enlace.classList.add("d-none");
      enlace.setAttribute("aria-disabled", "true");
      enlace.addEventListener("click", (evento) => {
        evento.preventDefault();
      });
    });
  }

  function bloquearPaginasUsuariosSiNoAdmin(rol) {
    const esAdmin = rol === "administrador";
    const paginaUsuarios = paginaActual === "listado-usuarios.html" || paginaActual === "crear-usuario.html";

    if (!esAdmin && paginaUsuarios) {
      alert("No tienes permisos para acceder al modulo de usuarios.");
      window.location.href = "index.html";
    }
  }

  function desactivarBotonesEliminarProductos() {
    const selectores = [
      "button.btn-eliminar",
      "a.btn-eliminar",
      "button.btn.btn-danger",
      "a.btn.btn-danger",
    ];

    document.querySelectorAll(selectores.join(",")).forEach((boton) => {
      const texto = (boton.textContent || "").toLowerCase();
      if (!texto.includes("eliminar")) {
        return;
      }

      boton.classList.add("disabled");
      boton.setAttribute("title", "Accion no permitida para rol vendedor");
      boton.setAttribute("aria-disabled", "true");

      if (boton.tagName === "BUTTON") {
        boton.disabled = true;
      }

      if (boton.tagName === "A") {
        boton.dataset.hrefOriginal = boton.getAttribute("href") || "#";
        boton.setAttribute("href", "#");
      }
    });
  }

  function bloquearEliminacionProductosVendedor(rol) {
    const esVendedor = rol === "vendedor";
    if (!esVendedor || paginaActual !== "listado-pro.html") {
      return;
    }

    desactivarBotonesEliminarProductos();

    const observador = new MutationObserver(() => {
      desactivarBotonesEliminarProductos();
    });

    observador.observe(document.body, { childList: true, subtree: true });

    document.addEventListener(
      "click",
      (evento) => {
        const elemento = evento.target.closest("button, a");
        if (!elemento) {
          return;
        }

        const texto = (elemento.textContent || "").toLowerCase();
        if (texto.includes("eliminar")) {
          evento.preventDefault();
          evento.stopPropagation();
          alert("El rol vendedor no puede borrar productos.");
        }
      },
      true,
    );
  }

  function aplicarPermisosPorRol(sesion) {
    const rol = String(sesion?.rol || "").toLowerCase();

    if (!rol) {
      return;
    }

    if (rol === "vendedor" || rol === "cajero") {
      ocultarModuloUsuarios();
    }

    bloquearPaginasUsuariosSiNoAdmin(rol);
    bloquearEliminacionProductosVendedor(rol);
  }

  function conectarLogout() {
    const botonConfirmarLogout = document.querySelector("#logoutModal .btn-primary");
    if (!botonConfirmarLogout) {
      return;
    }

    botonConfirmarLogout.addEventListener("click", (evento) => {
      evento.preventDefault();
      limpiarSesion();
      window.location.href = "index.html";
    });
  }

  function bloquearInterfazHastaLogin() {
    const wrapper = document.getElementById("wrapper");
    if (!wrapper) {
      return;
    }

    wrapper.style.filter = "blur(2px)";
    wrapper.style.pointerEvents = "none";
    wrapper.style.userSelect = "none";
  }

  function desbloquearInterfaz() {
    const wrapper = document.getElementById("wrapper");
    if (!wrapper) {
      return;
    }

    wrapper.style.filter = "";
    wrapper.style.pointerEvents = "";
    wrapper.style.userSelect = "";
  }

  function inicializarLoginEnIndex() {
    if (!esPaginaIndex) {
      return;
    }

    const formLogin = document.getElementById("form-login");
    const inputUsuario = document.getElementById("login-usuario");
    const inputContrasena = document.getElementById("login-contrasena");
    const alertaLogin = document.getElementById("login-alerta");
    const modalLogin = document.getElementById("loginModal");

    if (!formLogin || !modalLogin || !window.jQuery) {
      return;
    }

    const sesion = obtenerSesion();

    if (!sesion) {
      bloquearInterfazHastaLogin();
      window.jQuery(modalLogin).modal({
        backdrop: "static",
        keyboard: false,
        show: true,
      });
    } else {
      desbloquearInterfaz();
      window.jQuery(modalLogin).modal("hide");
    }

    formLogin.addEventListener("submit", async (evento) => {
      evento.preventDefault();

      const usuario = inputUsuario?.value?.trim() || "";
      const contrasena = inputContrasena?.value?.trim() || "";

      alertaLogin.classList.add("d-none");
      alertaLogin.textContent = "";

      try {
        const sesionUsuario = await loginUsuario(usuario, contrasena);
        guardarSesion(sesionUsuario);
        establecerUsuarioEnTopbar(sesionUsuario);
        aplicarPermisosPorRol(sesionUsuario);

        desbloquearInterfaz();
        window.jQuery(modalLogin).modal("hide");
      } catch (error) {
        const mensajeError =
          error.message === "Error HTTP 401"
            ? "Credenciales incorrectas. Verifica usuario y contrasena."
            : `No fue posible iniciar sesion: ${error.message}`;
        alertaLogin.textContent = mensajeError;
        alertaLogin.classList.remove("d-none");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const sesion = obtenerSesion();

    if (!sesion && !esPaginaIndex) {
      alert("Debes iniciar sesion para continuar.");
      window.location.href = "index.html";
      return;
    }

    if (sesion) {
      establecerUsuarioEnTopbar(sesion);
      aplicarPermisosPorRol(sesion);
    }

    conectarLogout();
    inicializarLoginEnIndex();
  });
})();
