/**
 * CRUD de la tabla `productos` de MySQL `inventario_db`.
 * Nota: en este proyecto, la API de productos se expone en /api/productos.
 *
 * Funciona en:
 * - listado-pro.html: consultar/listar, editar, eliminar y filtrar
 * - crear-pro.html: crear
 */
(() => {
  "use strict";

  const tablaProductosBody = document.getElementById("tabla-productos");
  const formularioProducto = document.getElementById("formulario-producto");
  const inputBusqueda = document.querySelector('input[type="search"]');
  const modalEditarProducto = document.getElementById("modal-editar-producto");
  const formularioEditarProducto = document.getElementById("formulario-editar-producto");
  const inputEditarId = document.getElementById("editar-producto-id");
  const inputEditarNombre = document.getElementById("editar-nombre-pro");
  const inputEditarDescripcion = document.getElementById("editar-descripcion-pro");
  const inputEditarPrecio = document.getElementById("editar-precio-pro");
  const inputEditarStock = document.getElementById("editar-stock-pro");
  const inputEditarImagen = document.getElementById("editar-imagen-pro");

  let listaProductos = [];

  /**
   * Obtiene las URLs candidatas para la API de productos.
   * @returns {string[]}
   */
  function obtenerApiProductosUrlsCandidatas() {
    if (window.API_PRODUCTOS_URL) {
      return [window.API_PRODUCTOS_URL];
    }

    const urls = ["http://localhost:3000/api/productos"];

    if (window.location.protocol !== "file:") {
      urls.push(`${window.location.origin}/api/productos`);
    }

    return [...new Set(urls)];
  }

  const apiProductosUrlsCandidatas = obtenerApiProductosUrlsCandidatas();
  let apiProductosUrlActiva = null;

  /**
   * Construye una URL final uniendo base y ruta opcional.
   * @param {string} apiBaseUrl
   * @param {string|number} ruta
   * @returns {string}
   */
  function construirUrlApi(apiBaseUrl, ruta = "") {
    if (!ruta && ruta !== 0) {
      return apiBaseUrl;
    }

    return `${apiBaseUrl}/${String(ruta).replace(/^\/+/, "")}`;
  }

  /**
   * Ejecuta fetch con fallback de base URL para evitar errores por puerto/origen.
   * @param {string|number} ruta
   * @param {RequestInit} opciones
   * @returns {Promise<Response>}
   */
  async function fetchProductosConFallback(ruta = "", opciones = {}) {
    const basesAIntentar = apiProductosUrlActiva
      ? [apiProductosUrlActiva, ...apiProductosUrlsCandidatas.filter((base) => base !== apiProductosUrlActiva)]
      : apiProductosUrlsCandidatas;

    let ultimaRespuesta = null;
    let ultimoErrorConexion = null;

    for (const baseUrl of basesAIntentar) {
      try {
        const respuesta = await fetch(construirUrlApi(baseUrl, ruta), opciones);
        ultimaRespuesta = respuesta;

        if (
          (respuesta.status === 404 || respuesta.status === 405) &&
          basesAIntentar.indexOf(baseUrl) < basesAIntentar.length - 1
        ) {
          continue;
        }

        apiProductosUrlActiva = baseUrl;
        return respuesta;
      } catch (error) {
        ultimoErrorConexion = error;
      }
    }

    if (ultimaRespuesta) {
      return ultimaRespuesta;
    }

    throw ultimoErrorConexion || new Error("No fue posible conectar con la API de productos.");
  }

  /**
   * Escapa texto para evitar inyeccion HTML en renderizado.
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
   * Valida la respuesta HTTP y lanza mensaje de error legible.
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
      console.error("No fue posible leer el detalle del error:", error);
    }

    throw new Error(mensajeError);
  }

  /**
   * Consulta todos los productos.
   * @returns {Promise<Array>}
   */
  async function consultarProductos() {
    try {
      const respuesta = await fetchProductosConFallback();
      await validarRespuestaHttp(respuesta);
      const data = await respuesta.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error en consultarProductos:", error);
      throw error;
    }
  }

  /**
   * Consulta un producto por ID.
   * @param {number|string} idProducto
   * @returns {Promise<Object>}
   */
  async function consultarProductoPorId(idProducto) {
    try {
      const respuesta = await fetchProductosConFallback(idProducto);
      await validarRespuestaHttp(respuesta);
      return await respuesta.json();
    } catch (error) {
      console.error("Error en consultarProductoPorId:", error);
      throw error;
    }
  }

  /**
   * Crea un producto.
   * @param {{nombre:string,descripcion:string,precio:number,stock:number,imagen:string}} datosProducto
   * @returns {Promise<Object>}
   */
  async function crearProducto(datosProducto) {
    try {
      const respuesta = await fetchProductosConFallback("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosProducto),
      });

      await validarRespuestaHttp(respuesta);
      return await respuesta.json();
    } catch (error) {
      console.error("Error en crearProducto:", error);
      throw error;
    }
  }

  /**
   * Edita un producto por ID.
   * @param {number|string} idProducto
   * @param {{nombre:string,descripcion:string,precio:number,stock:number,imagen:string}} datosProducto
   * @returns {Promise<Object>}
   */
  async function editarProducto(idProducto, datosProducto) {
    try {
      const respuesta = await fetchProductosConFallback(idProducto, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosProducto),
      });

      await validarRespuestaHttp(respuesta);
      return await respuesta.json();
    } catch (error) {
      console.error("Error en editarProducto:", error);
      throw error;
    }
  }

  /**
   * Elimina un producto por ID.
   * @param {number|string} idProducto
   * @returns {Promise<Object>}
   */
  async function eliminarProducto(idProducto) {
    try {
      const respuesta = await fetchProductosConFallback(idProducto, {
        method: "DELETE",
      });

      await validarRespuestaHttp(respuesta);
      return await respuesta.json();
    } catch (error) {
      console.error("Error en eliminarProducto:", error);
      throw error;
    }
  }

  /**
   * Obtiene y valida datos del formulario de creacion.
   * @returns {{nombre:string,descripcion:string,precio:number,stock:number,imagen:string}}
   */
  function obtenerDatosFormularioProducto() {
    const nombre = document.getElementById("productos-select")?.value?.trim() ?? "";
    const precioTexto = document.getElementById("precio-pro")?.value?.trim() ?? "";
    const stockTexto = document.getElementById("stock-pro")?.value?.trim() ?? "";
    const descripcion = document.getElementById("descripcion-pro")?.value?.trim() ?? "";
    const imagen = document.getElementById("imagen-pro")?.getAttribute("src")?.trim() ?? "";

    if (!nombre || nombre.toLowerCase().includes("seleccionar")) {
      throw new Error("Debes seleccionar un producto valido.");
    }

    const precio = Number(precioTexto);
    if (Number.isNaN(precio) || precio <= 0) {
      throw new Error("El precio debe ser numerico y mayor a cero.");
    }

    const stock = Number(stockTexto);
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error("El stock debe ser un numero entero mayor o igual a cero.");
    }

    return {
      nombre,
      descripcion,
      precio,
      stock,
      imagen,
    };
  }

  /**
   * Renderiza la tabla de productos.
   * @param {Array} productos
   * @returns {void}
   */
  function renderizarTablaProductos(productos) {
    if (!tablaProductosBody) {
      return;
    }

    if (!productos.length) {
      tablaProductosBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">No hay productos para mostrar.</td>
        </tr>
      `;
      return;
    }

    const filas = productos
      .map((producto) => {
        const urlImagen = producto.imagen || "";
        const miniatura = urlImagen
          ? `<img src="${escaparHtml(urlImagen)}" alt="${escaparHtml(producto.nombre)}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;">`
          : "Sin imagen";

        return `
          <tr>
            <td>${escaparHtml(producto.id)}</td>
            <td>${escaparHtml(producto.nombre)}</td>
            <td>${escaparHtml(producto.descripcion || "")}</td>
            <td>${escaparHtml(producto.precio)}</td>
            <td>${escaparHtml(producto.stock)}</td>
            <td>${miniatura}</td>
            <td>
              <button type="button" class="btn btn-sm btn-warning btn-editar mr-1" data-id="${escaparHtml(producto.id)}">Editar</button>
              <button type="button" class="btn btn-sm btn-danger btn-eliminar" data-id="${escaparHtml(producto.id)}">Eliminar</button>
            </td>
          </tr>
        `;
      })
      .join("");

    tablaProductosBody.innerHTML = filas;
  }

  /**
   * Carga el listado de productos y lo renderiza.
   * @returns {Promise<void>}
   */
  async function cargarListadoProductos() {
    try {
      listaProductos = await consultarProductos();
      renderizarTablaProductos(listaProductos);
    } catch (error) {
      alert(`No fue posible cargar los productos: ${error.message}`);
    }
  }

  /**
   * Filtra la tabla local por nombre o descripcion.
   * @param {string} criterio
   * @returns {void}
   */
  function filtrarTablaProductos(criterio) {
    const texto = String(criterio ?? "").toLowerCase();

    const filtrados = listaProductos.filter((item) => {
      const nombre = String(item.nombre ?? "").toLowerCase();
      const descripcion = String(item.descripcion ?? "").toLowerCase();
      return nombre.includes(texto) || descripcion.includes(texto);
    });

    renderizarTablaProductos(filtrados);
  }

  function abrirModalEditarProducto() {
    if (!modalEditarProducto || !window.jQuery) {
      return;
    }
    window.jQuery(modalEditarProducto).modal("show");
  }

  function cerrarModalEditarProducto() {
    if (!modalEditarProducto || !window.jQuery) {
      return;
    }
    window.jQuery(modalEditarProducto).modal("hide");
  }

  /**
   * Carga datos en el formulario del modal para editar producto.
   * @param {Object} productoActual
   * @returns {void}
   */
  function cargarFormularioEdicion(productoActual) {
    inputEditarId.value = productoActual.id ?? "";
    inputEditarNombre.value = productoActual.nombre ?? "";
    inputEditarDescripcion.value = productoActual.descripcion ?? "";
    inputEditarPrecio.value = productoActual.precio ?? "";
    inputEditarStock.value = productoActual.stock ?? "";
    inputEditarImagen.value = productoActual.imagen ?? "";
  }

  /**
   * Obtiene y valida datos del formulario de edicion.
   * @returns {{id:string,nombre:string,descripcion:string,precio:number,stock:number,imagen:string}}
   */
  function obtenerDatosFormularioEdicion() {
    const id = inputEditarId.value.trim();
    const nombre = inputEditarNombre.value.trim();
    const descripcion = inputEditarDescripcion.value.trim();
    const precio = Number(inputEditarPrecio.value.trim());
    const stock = Number(inputEditarStock.value.trim());
    const imagen = inputEditarImagen.value.trim();

    if (!id) {
      throw new Error("No se encontro el ID del producto a editar.");
    }

    if (!nombre) {
      throw new Error("El nombre del producto es obligatorio.");
    }

    if (Number.isNaN(precio) || precio <= 0) {
      throw new Error("El precio debe ser mayor a cero.");
    }

    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error("El stock debe ser un entero mayor o igual a cero.");
    }

    return { id, nombre, descripcion, precio, stock, imagen };
  }

  /**
   * Gestiona la carga de un producto para editarlo desde modal.
   * @param {number|string} idProducto
   * @returns {Promise<void>}
   */
  async function manejarEdicionProducto(idProducto) {
    try {
      const productoActual = await consultarProductoPorId(idProducto);
      cargarFormularioEdicion(productoActual);
      abrirModalEditarProducto();
    } catch (error) {
      alert(`No fue posible cargar el producto para editar: ${error.message}`);
    }
  }

  /**
   * Gestiona la eliminacion de un producto.
   * @param {number|string} idProducto
   * @returns {Promise<void>}
   */
  async function manejarEliminacionProducto(idProducto) {
    const confirmar = confirm("Deseas eliminar este producto?");
    if (!confirmar) {
      return;
    }

    try {
      await eliminarProducto(idProducto);
      await cargarListadoProductos();
      alert("Producto eliminado correctamente.");
    } catch (error) {
      alert(`No fue posible eliminar el producto: ${error.message}`);
    }
  }

  /**
   * Inicializa eventos del listado de productos.
   * @returns {void}
   */
  function inicializarListadoProductos() {
    if (!tablaProductosBody) {
      return;
    }

    tablaProductosBody.addEventListener("click", (evento) => {
      const botonEditar = evento.target.closest(".btn-editar");
      const botonEliminar = evento.target.closest(".btn-eliminar");

      if (botonEditar?.dataset.id) {
        manejarEdicionProducto(botonEditar.dataset.id);
      }

      if (botonEliminar?.dataset.id) {
        manejarEliminacionProducto(botonEliminar.dataset.id);
      }
    });

    if (inputBusqueda) {
      inputBusqueda.addEventListener("input", (evento) => {
        filtrarTablaProductos(evento.target.value);
      });
    }
  }

  /**
   * Inicializa evento submit del formulario de edicion (modal).
   * @returns {void}
   */
  function inicializarFormularioEditarProducto() {
    if (!formularioEditarProducto) {
      return;
    }

    formularioEditarProducto.addEventListener("submit", async (evento) => {
      evento.preventDefault();

      try {
        const datosEditados = obtenerDatosFormularioEdicion();

        await editarProducto(datosEditados.id, {
          nombre: datosEditados.nombre,
          descripcion: datosEditados.descripcion,
          precio: datosEditados.precio,
          stock: datosEditados.stock,
          imagen: datosEditados.imagen,
        });

        cerrarModalEditarProducto();
        await cargarListadoProductos();
        alert("Producto actualizado correctamente.");
      } catch (error) {
        alert(`No fue posible editar el producto: ${error.message}`);
      }
    });
  }

  /**
   * Inicializa evento submit para crear producto.
   * @returns {void}
   */
  function inicializarFormularioProducto() {
    if (!formularioProducto) {
      return;
    }

    formularioProducto.addEventListener("submit", async (evento) => {
      evento.preventDefault();

      try {
        const datosProducto = obtenerDatosFormularioProducto();
        await crearProducto(datosProducto);
        formularioProducto.reset();
        alert("Producto creado correctamente.");
      } catch (error) {
        alert(`No fue posible crear el producto: ${error.message}`);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    inicializarListadoProductos();
    inicializarFormularioProducto();
    inicializarFormularioEditarProducto();

    if (tablaProductosBody) {
      await cargarListadoProductos();
    }
  });
})();
