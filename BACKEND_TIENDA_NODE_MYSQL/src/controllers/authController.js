const { getPool } = require("../database/connection")
const { handleError } = require("../utils/errorHandler")

// Login de usuario
const login = async (req, res) => {
  try {
    const usuario = String(req.body?.usuario || "").trim()
    const contrasena = String(req.body?.contrasena || "").trim()

    if (!usuario || !contrasena) {
      return res.status(400).json({ message: "Usuario y contrasena son requeridos" })
    }

    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      const [rows] = await connection.query(
        "SELECT id, rol, usuario FROM roles WHERE LOWER(usuario) = LOWER(?) AND contrasena = ?",
        [usuario, contrasena],
      )

      if (rows.length > 0) {
        res.status(200).json(rows[0])
      } else {
        res.status(401).json({ message: "Credenciales incorrectas" })
      }
    } finally {
      connection.release()
    }
  } catch (error) {
    handleError(res, error, "Error al verificar el inicio de sesion")
  }
}

module.exports = {
  login,
}
