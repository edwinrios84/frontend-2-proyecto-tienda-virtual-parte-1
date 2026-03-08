/**
 * CRUD de la tabla `roles` de MySQL `inventario_db`.
 * Nota: en este proyecto, el backend expone la tabla `roles` desde /api/usuarios.
 *
 * Funciona con:
 * - listado-usuarios.html: consultar/listar, editar, eliminar y buscar
 * - crear-usuario.html: crear
 */
(() => {
  "use strict";

  const tablaUsuariosBody = document.getElementById("tabla-usuarios");
  const formularioUsuario = document.getElementById("formulario-usuario");
  const inputBusqueda = document.querySelector('input[type="search"]');

  let listaRoles = [];

  /**
   * Obtiene URLs candidatas para la API de roles.
   * Prioriza variable global, luego origen actual y como fallback localhost:3000.
   * @returns {string[]}
   */
  function obtenerApiRolesUrlsCandidatas() {
    if (window.API_USUARIOS_URL) {
      return [window.API_USUARIOS_URL];
    }

    const urlsCandidatas = [];

    // Priorizar el backend local, que es donde corre la API en este proyecto.
    urlsCandidatas.push("http://localhost:3000/api/usuarios");

    if (window.location.protocol !== "file:") {
      urlsCandidatas.push(`${window.location.origin}/api/usuarios`);
    }

    return [...new Set(urlsCandidatas)];
  }

  const apiRolesUrlsCandidatas = obtenerApiRolesUrlsCandidatas();
  let apiRolesUrlActiva = null;

  /**
   * Construye una URL final a partir de la base y una ruta opcional.
   * @param {string} apiBaseUrl
   * @param {string} ruta
   * @returns {string}
   */
  function construirUrlApi(apiBaseUrl, ruta = "") {
    if (!ruta) {
      return apiBaseUrl;
    }
    return `${apiBaseUrl}/${String(ruta).replace(/^\/+/, "")}`;
  }

  /**
   * Ejecuta fetch con fallback de base URL para evitar 404 por puerto/origen.
   * - Si ya existe una URL activa, usa solo esa (evita confundir 404 reales de recurso).
   * - Si aun no existe, prueba candidatas hasta encontrar una que no responda 404.
   * @param {string} ruta
   * @param {RequestInit} opciones
   * @returns {Promise<Response>}
   */
  async function fetchRolesConFallback(ruta = "", opciones = {}) {
    const metodoHttp = (opciones.method || "GET").toUpperCase();
    const basesAIntentar = apiRolesUrlActiva
      ? [apiRolesUrlActiva, ...apiRolesUrlsCandidatas.filter((urlBase) => urlBase !== apiRolesUrlActiva)]
      : apiRolesUrlsCandidatas;
    let ultimaRespuesta = null;
    let ultimoErrorConexion = null;

    for (const baseUrl of basesAIntentar) {
      try {
        const respuesta = await fetch(construirUrlApi(baseUrl, ruta), opciones);
        ultimaRespuesta = respuesta;

        // Si la base no sirve (404/405), intenta la siguiente candidata.
        if (
          (respuesta.status === 404 || respuesta.status === 405) &&
          basesAIntentar.indexOf(baseUrl) < basesAIntentar.length - 1
        ) {
          continue;
        }

        apiRolesUrlActiva = baseUrl;
        return respuesta;
      } catch (error) {
        ultimoErrorConexion = error;
      }
    }

    if (ultimaRespuesta) {
      return ultimaRespuesta;
    }

    throw ultimoErrorConexion || new Error("No fue posible conectar con la API de roles.");
  }

  /**
   * Escapa texto para evitar inyeccion de HTML en la tabla.
   * @param {string|number|null|undefined} texto
   * @returns {string}
   */
  function escaparHtml(texto) {
    return String(texto ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /**
   * Convierte una respuesta HTTP fallida en Error con mensaje legible.
   * @param {Response} respuesta
   * @returns {Promise<void>}
   */
  async function validarRespuestaHttp(respuesta) {
    if (respuesta.ok) {
      return;
    }

    let mensajeError = `Error HTTP ${respuesta.status}`;

    try {
      const cuerpoError = await respuesta.json();
      if (cuerpoError?.message) {
        mensajeError = cuerpoError.message;
      }
    } catch (error) {
      console.error("No fue posible interpretar el error HTTP:", error);
    }

    throw new Error(mensajeError);
  }

  /**
   * Consulta todos los roles.
   * @returns {Promise<Array>}
   */
  async function consultarRoles() {
    try {
      const respuesta = await fetchRolesConFallback();
      await validarRespuestaHttp(respuesta);
      const datos = await respuesta.json();
      return Array.isArray(datos) ? datos : [];
    } catch (error) {
      console.error("Error en consultarRoles:", error);
      throw error;
    }
  }

  /**
   * Consulta un rol por su ID.
   * @param {number|string} idRol
   * @returns {Promise<Object>}
   */
  async function consultarRolPorId(idRol) {
    try {
      const respuesta = await fetchRolesConFallback(idRol);
      await validarRespuestaHttp(respuesta);
      return await respuesta.json();
    } catch (error) {
      console.error("Error en consultarRolPorId:", error);
      throw error;
    }
  }

  /**
   * Crea un rol (registro de la tabla roles).
   * @param {{rol: string, usuario: string, contrasena: string}} datosRol
   * @returns {Promise<Object>}
   */
  async function crearRol(datosRol) {
    try {
      const respuesta = await fetchRolesConFallback("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosRol),
      });

      await validarRespuestaHttp(respuesta);
      return await respuesta.json();
    } catch (error) {
      console.error("Error en crearRol:", error);
      throw error;
    }
  }

  /**
   * Edita un rol por ID.
   * @param {number|string} idRol
   * @param {{rol: string, usuario: string, contrasena?: string}} datosRol
   * @returns {Promise<Object>}
   */
  async function editarRol(idRol, datosRol) {
    try {
      const respuesta = await fetchRolesConFallback(idRol, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosRol),
      });

      await validarRespuestaHttp(respuesta);
      return await respuesta.json();
    } catch (error) {
      console.error("Error en editarRol:", error);
      throw error;
    }
  }

  /**
   * Elimina un rol por ID.
   * @param {number|string} idRol
   * @returns {Promise<Object>}
   */
  async function eliminarRol(idRol) {
    try {
      const respuesta = await fetchRolesConFallback(idRol, {
        method: "DELETE",
      });

      await validarRespuestaHttp(respuesta);
      return await respuesta.json();
    } catch (error) {
      console.error("Error en eliminarRol:", error);
      throw error;
    }
  }

  /**
   * Normaliza y valida datos del formulario crear usuario/rol.
   * @returns {{rol: string, usuario: string, contrasena: string}}
   */
  function obtenerDatosFormulario() {
    const rol = document.getElementById("rol")?.value?.trim() ?? "";
    const usuario = document.getElementById("usuario")?.value?.trim() ?? "";
    const contrasena = document.getElementById("contrasena")?.value?.trim() ?? "";
    const confirmarContrasena = document.getElementById("confirmar_contrasena")?.value?.trim() ?? "";

    if (!rol || rol.toLowerCase().includes("seleccionar")) {
      throw new Error("Debes seleccionar un rol valido.");
    }

    if (!usuario) {
      throw new Error("El usuario es obligatorio.");
    }

    if (!contrasena) {
      throw new Error("La contrasena es obligatoria.");
    }

    if (contrasena !== confirmarContrasena) {
      throw new Error("La confirmacion de contrasena no coincide.");
    }

    return { rol, usuario, contrasena };
  }

  /**
   * Muestra los registros en la tabla.
   * @param {Array} roles
   * @returns {void}
   */
  function renderizarTablaRoles(roles) {
    if (!tablaUsuariosBody) {
      return;
    }

    if (!roles.length) {
      tablaUsuariosBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">No hay registros para mostrar.</td>
        </tr>
      `;
      return;
    }

    const filas = roles
      .map((rolActual) => {
        const fechaCreacion = rolActual.created_at
          ? new Date(rolActual.created_at).toLocaleString("es-CO")
          : "N/D";
        const fechaActualizacion = rolActual.updated_at
          ? new Date(rolActual.updated_at).toLocaleString("es-CO")
          : "N/D";

        return `
          <tr>
            <td>${escaparHtml(rolActual.id)}</td>
            <td>${escaparHtml(rolActual.usuario)}</td>
            <td>${escaparHtml(rolActual.rol)}</td>
            <td>${escaparHtml(fechaCreacion)}</td>
            <td>${escaparHtml(fechaActualizacion)}</td>
            <td>
              <button type="button" class="btn btn-sm btn-warning btn-editar mr-1" data-id="${escaparHtml(rolActual.id)}">
                Editar
              </button>
              <button type="button" class="btn btn-sm btn-danger btn-eliminar" data-id="${escaparHtml(rolActual.id)}">
                Eliminar
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    tablaUsuariosBody.innerHTML = filas;
  }

  /**
   * Carga y pinta el listado.
   * @returns {Promise<void>}
   */
  async function cargarListadoRoles() {
    try {
      listaRoles = await consultarRoles();
      renderizarTablaRoles(listaRoles);
    } catch (error) {
      alert(`No se pudo cargar el listado de roles: ${error.message}`);
    }
  }

  /**
   * Filtra por rol o usuario en memoria.
   * @param {string} criterio
   * @returns {void}
   */
  function filtrarRoles(criterio) {
    const criterioNormalizado = (criterio ?? "").toLowerCase();

    const listaFiltrada = listaRoles.filter((item) => {
      const rol = String(item.rol ?? "").toLowerCase();
      const usuario = String(item.usuario ?? "").toLowerCase();
      return rol.includes(criterioNormalizado) || usuario.includes(criterioNormalizado);
    });

    renderizarTablaRoles(listaFiltrada);
  }

  /**
   * Orquesta la edicion de un registro.
   * @param {number|string} idRol
   * @returns {Promise<void>}
   */
  async function manejarEdicion(idRol) {
    try {
      const rolActual = await consultarRolPorId(idRol);

      const nuevoRol = prompt("Editar rol:", rolActual.rol ?? "");
      if (nuevoRol === null) {
        return;
      }

      const nuevoUsuario = prompt("Editar nombre de usuario:", rolActual.usuario ?? "");
      if (nuevoUsuario === null) {
        return;
      }

      const nuevaContrasena = prompt("Nueva contrasena (opcional):", "");
      if (nuevaContrasena === null) {
        return;
      }

      const datosRol = {
        rol: nuevoRol.trim(),
        usuario: nuevoUsuario.trim(),
      };

      if (!datosRol.rol || !datosRol.usuario) {
        throw new Error("Rol y usuario son campos obligatorios.");
      }

      if (nuevaContrasena.trim()) {
        datosRol.contrasena = nuevaContrasena.trim();
      }

      await editarRol(idRol, datosRol);
      await cargarListadoRoles();
      alert("Registro actualizado correctamente.");
    } catch (error) {
      alert(`No fue posible editar el registro: ${error.message}`);
    }
  }

  /**
   * Orquesta la eliminacion de un registro.
   * @param {number|string} idRol
   * @returns {Promise<void>}
   */
  async function manejarEliminacion(idRol) {
    const confirmaEliminacion = confirm("Deseas eliminar este registro de roles?");
    if (!confirmaEliminacion) {
      return;
    }

    try {
      await eliminarRol(idRol);
      await cargarListadoRoles();
      alert("Registro eliminado correctamente.");
    } catch (error) {
      alert(`No fue posible eliminar el registro: ${error.message}`);
    }
  }

  /**
   * Registra eventos para la vista de listado.
   * @returns {void}
   */
  function inicializarListado() {
    if (!tablaUsuariosBody) {
      return;
    }

    tablaUsuariosBody.addEventListener("click", (evento) => {
      const botonEditar = evento.target.closest(".btn-editar");
      const botonEliminar = evento.target.closest(".btn-eliminar");

      if (botonEditar?.dataset.id) {
        manejarEdicion(botonEditar.dataset.id);
      }

      if (botonEliminar?.dataset.id) {
        manejarEliminacion(botonEliminar.dataset.id);
      }
    });

    if (inputBusqueda) {
      inputBusqueda.addEventListener("input", (evento) => {
        filtrarRoles(evento.target.value);
      });
    }
  }

  /**
   * Registra evento submit para la vista crear.
   * @returns {void}
   */
  function inicializarFormulario() {
    if (!formularioUsuario) {
      return;
    }

    formularioUsuario.addEventListener("submit", async (evento) => {
      evento.preventDefault();

      try {
        const datosRol = obtenerDatosFormulario();
        await crearRol(datosRol);
        formularioUsuario.reset();
        alert("Registro creado correctamente en la tabla roles.");
      } catch (error) {
        alert(`No fue posible crear el registro: ${error.message}`);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    inicializarListado();
    inicializarFormulario();

    if (tablaUsuariosBody) {
      await cargarListadoRoles();
    }
  });
})();
