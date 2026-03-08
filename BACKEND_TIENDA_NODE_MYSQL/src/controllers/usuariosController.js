const { getPool } = require("../database/connection")
const { handleError } = require("../utils/errorHandler")

// Obtener todos los usuarios o uno por ID
const getUsuarios = async (req, res) => {
  try {
    const { id } = req.params
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      if (id) {
        const [rows] = await connection.query(
          "SELECT id, rol, usuario, created_at, updated_at FROM roles WHERE id = ?",
          [id],
        )

        if (rows.length > 0) {
          res.json(rows[0])
        } else {
          res.status(404).json({ message: "Usuario no encontrado" })
        }
      } else {
        const [rows] = await connection.query(
          "SELECT id, rol, usuario, created_at, updated_at FROM roles ORDER BY id DESC",
        )
        res.json(rows)
      }
    } finally {
      connection.release()
    }
  } catch (error) {
    handleError(res, error, "Error al obtener usuarios")
  }
}

// Crear usuario
const createUsuario = async (req, res) => {
  try {
    const { rol, usuario, contrasena } = req.body

    if (!rol || !usuario || !contrasena) {
      return res.status(400).json({ message: "Rol, usuario y contrasena son requeridos" })
    }

    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      // Inserta fechas de forma explicita para tablas antiguas sin defaults.
      const [result] = await connection.query(
        "INSERT INTO roles (rol, usuario, contrasena, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [rol, usuario, contrasena],
      )

      const [rows] = await connection.query(
        "SELECT id, rol, usuario, created_at, updated_at FROM roles WHERE id = ?",
        [result.insertId],
      )

      res.status(201).json({
        message: "Usuario creado con exito",
        data: rows[0] || null,
      })
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        res.status(409).json({ message: "El usuario ya existe" })
      } else {
        throw err
      }
    } finally {
      connection.release()
    }
  } catch (error) {
    handleError(res, error, "Error al crear usuario")
  }
}

// Actualizar usuario
const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { rol, usuario, contrasena } = req.body

    if (!rol || !usuario) {
      return res.status(400).json({ message: "Rol y usuario son requeridos" })
    }

    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      let result

      if (contrasena) {
        const [resUpdate] = await connection.query(
          "UPDATE roles SET rol = ?, usuario = ?, contrasena = ?, updated_at = NOW() WHERE id = ?",
          [rol, usuario, contrasena, id],
        )
        result = resUpdate
      } else {
        const [resUpdate] = await connection.query(
          "UPDATE roles SET rol = ?, usuario = ?, updated_at = NOW() WHERE id = ?",
          [rol, usuario, id],
        )
        result = resUpdate
      }

      if (result.affectedRows > 0) {
        const [rows] = await connection.query(
          "SELECT id, rol, usuario, created_at, updated_at FROM roles WHERE id = ?",
          [id],
        )

        res.json({
          message: "Usuario actualizado con exito",
          data: rows[0] || null,
        })
      } else {
        res.status(404).json({ message: "Usuario no encontrado" })
      }
    } finally {
      connection.release()
    }
  } catch (error) {
    handleError(res, error, "Error al actualizar usuario")
  }
}

// Eliminar usuario
const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params

    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      const [result] = await connection.query("DELETE FROM roles WHERE id = ?", [id])

      if (result.affectedRows > 0) {
        res.json({ message: "Usuario eliminado con exito" })
      } else {
        res.status(404).json({ message: "Usuario no encontrado" })
      }
    } finally {
      connection.release()
    }
  } catch (error) {
    handleError(res, error, "Error al eliminar usuario")
  }
}

module.exports = {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
}
