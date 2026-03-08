/**
 * Busqueda global para el Topbar del Dashboard.
 *
 * Permite buscar y listar registros de:
 * - productos
 * - clientes
 * - pedidos
 * - usuarios (solo rol administrador)
 */
(() => {
  "use strict";

  const storageKeySesion = "inventarioSesionUsuario";

  const formDesktop = document.getElementById("form-busqueda-topbar-desktop");
  const inputDesktop = document.getElementById("input-busqueda-topbar-desktop");
  const formMobile = document.getElementById("form-busqueda-topbar-mobile");
  const inputMobile = document.getElementById("input-busqueda-topbar-mobile");

  const contenedorResultados = document.getElementById("contenedor-resultados-busqueda");
  const resumenBusqueda = document.getElementById("resumen-busqueda");
  const listadoResultados = document.getElementById("listado-resultados-busqueda");
  const btnLimpiarBusqueda = document.getElementById("btn-limpiar-busqueda");

  const modulosBusqueda = [
    { clave: "productos", titulo: "Productos", endpoint: "/productos" },
    { clave: "clientes", titulo: "Clientes", endpoint: "/clientes" },
    { clave: "pedidos", titulo: "Pedidos", endpoint: "/pedidos" },
    { clave: "usuarios", titulo: "Usuarios", endpoint: "/usuarios" },
  ];

  /**
   * Lee la sesion actual desde localStorage.
   * @returns {{id:number,rol:string,usuario:string}|null}
   */
  function obtenerSesionActual() {
    try {
      const sesionTexto = localStorage.getItem(storageKeySesion);
      return sesionTexto ? JSON.parse(sesionTexto) : null;
    } catch (error) {
      console.error("No fue posible leer la sesion para busqueda:", error);
      return null;
    }
  }

  /**
   * Normaliza texto para comparaciones de busqueda (minuscula y sin tildes).
   * @param {string|number|null|undefined} valor
   * @returns {string}
   */
  function normalizarTexto(valor) {
    return String(valor ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  /**
   * Escapa texto para pintar HTML de forma segura.
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
   * Devuelve bases candidatas para la API.
   * @returns {string[]}
   */
  function obtenerBasesApiCandidatas() {
    const candidatas = ["http://localhost:3000/api"];

    if (window.location.protocol !== "file:") {
      candidatas.push(`${window.location.origin}/api`);
    }

    return [...new Set(candidatas)];
  }

  /**
   * Une base + endpoint y evita doble slash.
   * @param {string} baseApi
   * @param {string} endpoint
   * @returns {string}
   */
  function construirUrl(baseApi, endpoint) {
    return `${baseApi}${endpoint}`.replace(/([^:]\/)\/+/, "$1");
  }

  /**
   * Ejecuta fetch a un endpoint de API con fallback entre bases candidatas.
   * @param {string} endpoint
   * @returns {Promise<any[]>}
   */
  async function consultarEndpointConFallback(endpoint) {
    const bases = obtenerBasesApiCandidatas();
    let ultimoError = null;

    for (const base of bases) {
      try {
        const url = construirUrl(base, endpoint);
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
          if ((respuesta.status === 404 || respuesta.status === 405) && bases.indexOf(base) < bases.length - 1) {
            continue;
          }

          throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const data = await respuesta.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        ultimoError = error;
      }
    }

    throw ultimoError || new Error("No fue posible consultar la API.");
  }

  /**
   * Indica si el modulo es visible para el rol actual.
   * @param {string} claveModulo
   * @param {string} rolUsuario
   * @returns {boolean}
   */
  function tienePermisoModulo(claveModulo, rolUsuario) {
    if (claveModulo !== "usuarios") {
      return true;
    }

    return normalizarTexto(rolUsuario) === "administrador";
  }

  /**
   * Filtra una lista de registros por termino de busqueda.
   * @param {any[]} registros
   * @param {string} termino
   * @returns {any[]}
   */
  function filtrarRegistros(registros, termino) {
    const terminoNormalizado = normalizarTexto(termino);

    return registros.filter((registro) => {
      const textoRegistro = normalizarTexto(Object.values(registro).join(" "));
      return textoRegistro.includes(terminoNormalizado);
    });
  }

  /**
   * Mapea un registro a una representacion corta para pintar en la tabla.
   * @param {string} claveModulo
   * @param {any} registro
   * @returns {{id:string, descripcion:string}}
   */
  function construirFilaResultado(claveModulo, registro) {
    if (claveModulo === "productos") {
      return {
        id: registro.id,
        descripcion: `${registro.nombre || ""} | ${registro.descripcion || ""} | $${registro.precio || 0} | Stock: ${registro.stock || 0}`,
      };
    }

    if (claveModulo === "clientes") {
      return {
        id: registro.id_cliente,
        descripcion: `${registro.nombre || ""} ${registro.apellido || ""} | ${registro.email || ""} | ${registro.celular || ""}`,
      };
    }

    if (claveModulo === "pedidos") {
      return {
        id: registro.id,
        descripcion: `Cliente: ${registro.id_cliente || "N/D"} | Pago: ${registro.metodo_pago || "N/D"} | Fecha: ${registro.fecha || "N/D"}`,
      };
    }

    return {
      id: registro.id,
      descripcion: `${registro.usuario || ""} | Rol: ${registro.rol || ""} | Creado: ${registro.created_at || "N/D"}`,
    };
  }

  /**
   * Renderiza todos los resultados de busqueda agrupados por modulo.
   * @param {string} termino
   * @param {{clave:string,titulo:string,resultados:any[],error:string|null}[]} resultadosPorModulo
   * @returns {void}
   */
  function renderizarResultados(termino, resultadosPorModulo) {
    const totalResultados = resultadosPorModulo.reduce((acumulado, item) => acumulado + item.resultados.length, 0);

    if (!totalResultados && !resultadosPorModulo.some((item) => item.error)) {
      resumenBusqueda.textContent = `No se encontraron resultados para "${termino}".`;
      listadoResultados.innerHTML = "";
      contenedorResultados.classList.remove("d-none");
      return;
    }

    resumenBusqueda.textContent = `Se encontraron ${totalResultados} registro(s) para "${termino}".`;

    listadoResultados.innerHTML = resultadosPorModulo
      .map((modulo) => {
        if (modulo.error) {
          return `
            <div class="mb-3">
              <h6 class="font-weight-bold text-danger mb-2">${escaparHtml(modulo.titulo)}</h6>
              <div class="alert alert-warning mb-0">No se pudo consultar este modulo: ${escaparHtml(modulo.error)}</div>
            </div>
          `;
        }

        const filasHtml = modulo.resultados
          .map((registro) => {
            const fila = construirFilaResultado(modulo.clave, registro);
            return `
              <tr>
                <td>${escaparHtml(fila.id)}</td>
                <td>${escaparHtml(fila.descripcion)}</td>
              </tr>
            `;
          })
          .join("");

        if (!filasHtml) {
          return `
            <div class="mb-3">
              <h6 class="font-weight-bold text-primary mb-2">${escaparHtml(modulo.titulo)}</h6>
              <p class="text-muted mb-0">Sin coincidencias en este modulo.</p>
            </div>
          `;
        }

        return `
          <div class="mb-4">
            <h6 class="font-weight-bold text-primary mb-2">${escaparHtml(modulo.titulo)} (${modulo.resultados.length})</h6>
            <div class="table-responsive">
              <table class="table table-sm table-bordered mb-0">
                <thead class="thead-light">
                  <tr>
                    <th>ID</th>
                    <th>Descripcion</th>
                  </tr>
                </thead>
                <tbody>${filasHtml}</tbody>
              </table>
            </div>
          </div>
        `;
      })
      .join("");

    contenedorResultados.classList.remove("d-none");
  }

  /**
   * Ejecuta la busqueda global en los modulos permitidos.
   * @param {string} termino
   * @returns {Promise<void>}
   */
  async function ejecutarBusquedaGlobal(termino) {
    const sesion = obtenerSesionActual();
    const rolUsuario = normalizarTexto(sesion?.rol || "");

    const modulosPermitidos = modulosBusqueda.filter((modulo) => tienePermisoModulo(modulo.clave, rolUsuario));

    try {
      const resultadosPorModulo = await Promise.all(
        modulosPermitidos.map(async (modulo) => {
          try {
            const dataModulo = await consultarEndpointConFallback(modulo.endpoint);
            const registrosFiltrados = filtrarRegistros(dataModulo, termino);
            return {
              clave: modulo.clave,
              titulo: modulo.titulo,
              resultados: registrosFiltrados,
              error: null,
            };
          } catch (error) {
            return {
              clave: modulo.clave,
              titulo: modulo.titulo,
              resultados: [],
              error: error.message,
            };
          }
        }),
      );

      renderizarResultados(termino, resultadosPorModulo);
    } catch (error) {
      resumenBusqueda.textContent = "No fue posible ejecutar la busqueda global.";
      listadoResultados.innerHTML = `<div class="alert alert-danger mb-0">${escaparHtml(error.message)}</div>`;
      contenedorResultados.classList.remove("d-none");
    }
  }

  /**
   * Obtiene el termino desde la caja visible de busqueda.
   * @returns {string}
   */
  function obtenerTerminoActual() {
    if (document.activeElement === inputMobile || (inputMobile && inputMobile.value.trim())) {
      return inputMobile.value.trim();
    }

    return inputDesktop?.value?.trim() || "";
  }

  /**
   * Limpia el resultado de busqueda y campos de texto.
   * @returns {void}
   */
  function limpiarBusqueda() {
    if (inputDesktop) {
      inputDesktop.value = "";
    }

    if (inputMobile) {
      inputMobile.value = "";
    }

    if (contenedorResultados) {
      contenedorResultados.classList.add("d-none");
    }

    if (resumenBusqueda) {
      resumenBusqueda.textContent = "";
    }

    if (listadoResultados) {
      listadoResultados.innerHTML = "";
    }
  }

  /**
   * Maneja submit de formularios de busqueda.
   * @param {Event} evento
   * @returns {Promise<void>}
   */
  async function manejarSubmitBusqueda(evento) {
    try {
      evento.preventDefault();

      const termino = obtenerTerminoActual();
      if (!termino) {
        limpiarBusqueda();
        return;
      }

      resumenBusqueda.textContent = "Buscando...";
      listadoResultados.innerHTML = "";
      contenedorResultados.classList.remove("d-none");

      await ejecutarBusquedaGlobal(termino);
    } catch (error) {
      console.error("Error al procesar la busqueda:", error);
      resumenBusqueda.textContent = "No se pudo procesar la busqueda.";
      listadoResultados.innerHTML = `<div class="alert alert-danger mb-0">${escaparHtml(error.message)}</div>`;
      contenedorResultados.classList.remove("d-none");
    }
  }

  /**
   * Inicializa eventos del buscador de topbar.
   * @returns {void}
   */
  function inicializarBuscadorTopbar() {
    if (!formDesktop || !inputDesktop || !contenedorResultados || !resumenBusqueda || !listadoResultados) {
      return;
    }

    formDesktop.addEventListener("submit", manejarSubmitBusqueda);

    if (formMobile && inputMobile) {
      formMobile.addEventListener("submit", manejarSubmitBusqueda);
    }

    if (btnLimpiarBusqueda) {
      btnLimpiarBusqueda.addEventListener("click", limpiarBusqueda);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    inicializarBuscadorTopbar();
  });
})();
