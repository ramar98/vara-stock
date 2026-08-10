const db = require("../config/db");

const obtenerProductos = async () => {
    const [rows] = await db.query(`
        SELECT
            p.id,
            p.codigo,
            p.nombre,
            p.descripcion,
            p.categoria_id,
            p.marca_id,
            p.proveedor_id,

            c.nombre AS categoria,
            m.nombre AS marca,
            pr.nombre AS proveedor,

            COUNT(DISTINCT v.id) AS variantes,

            COALESCE(SUM(v.stock_actual), 0) AS stock,

            COALESCE(MIN(v.precio_costo), 0) AS precio_costo,
            COALESCE(MAX(v.precio_venta), 0) AS precio_venta,

            (
                SELECT pi.ruta
                FROM producto_imagenes pi
                WHERE pi.producto_id = p.id
                ORDER BY pi.principal DESC, pi.id ASC
                LIMIT 1
            ) AS imagen

        FROM productos p

        LEFT JOIN categorias c
            ON c.id = p.categoria_id

        LEFT JOIN marcas m
            ON m.id = p.marca_id

        LEFT JOIN proveedores pr
            ON pr.id = p.proveedor_id

        LEFT JOIN producto_variantes v
            ON v.producto_id = p.id

        WHERE p.activo = TRUE

        GROUP BY
            p.id,
            p.codigo,
            p.nombre,
            p.descripcion,
            p.categoria_id,
            p.marca_id,
            p.proveedor_id,
            c.nombre,
            m.nombre,
            pr.nombre

        ORDER BY p.nombre ASC
    `);

    return rows;
};

const obtenerProductoPorId = async (id) => {
    const [productos] = await db.query(
        `
            SELECT
                p.id,
                p.codigo,
                p.nombre,
                p.descripcion,
                p.categoria_id,
                p.marca_id,
                p.proveedor_id,
                p.activo,
                p.created_at,
                p.updated_at,

                c.nombre AS categoria,
                m.nombre AS marca,
                pr.nombre AS proveedor

            FROM productos p

            LEFT JOIN categorias c
                ON c.id = p.categoria_id

            LEFT JOIN marcas m
                ON m.id = p.marca_id

            LEFT JOIN proveedores pr
                ON pr.id = p.proveedor_id

            WHERE p.id = ?
              AND p.activo = TRUE

            LIMIT 1
        `,
        [id],
    );

    if (productos.length === 0) {
        return null;
    }

    const producto = productos[0];

    const [variantes] = await db.query(
        `
            SELECT
                v.id,
                v.producto_id,
                v.color_id,
                v.talle_id,
                v.codigo_barras,
                v.precio_costo,
                v.precio_venta,
                v.stock_actual,
                v.stock_minimo,

                c.nombre AS color,
                t.nombre AS talle

            FROM producto_variantes v

            LEFT JOIN colores c
                ON c.id = v.color_id

            LEFT JOIN talles t
                ON t.id = v.talle_id

            WHERE v.producto_id = ?

            ORDER BY c.nombre, t.nombre
        `,
        [id],
    );

    const [imagenes] = await db.query(
        `
            SELECT
                id,
                producto_id,
                ruta,
                principal,
                created_at

            FROM producto_imagenes

            WHERE producto_id = ?

            ORDER BY principal DESC, id ASC
        `,
        [id],
    );

    return {
        ...producto,
        variantes,
        imagenes,
    };
};

const crearProducto = async (data) => {
    const {
        codigo,
        nombre,
        descripcion = null,
        categoria_id = null,
        marca_id = null,
        proveedor_id = null,
    } = data;

    const [result] = await db.query(
        `
            INSERT INTO productos
            (
                codigo,
                nombre,
                descripcion,
                categoria_id,
                marca_id,
                proveedor_id
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            codigo,
            nombre,
            descripcion,
            categoria_id,
            marca_id,
            proveedor_id,
        ],
    );

    return obtenerProductoPorId(result.insertId);
};

const actualizarProducto = async (id, data) => {
    const {
        codigo,
        nombre,
        descripcion = null,
        categoria_id = null,
        marca_id = null,
        proveedor_id = null,
    } = data;

    const [result] = await db.query(
        `
            UPDATE productos

            SET
                codigo = ?,
                nombre = ?,
                descripcion = ?,
                categoria_id = ?,
                marca_id = ?,
                proveedor_id = ?

            WHERE id = ?
              AND activo = TRUE
        `,
        [
            codigo,
            nombre,
            descripcion,
            categoria_id,
            marca_id,
            proveedor_id,
            id,
        ],
    );

    if (result.affectedRows === 0) {
        return null;
    }

    return obtenerProductoPorId(id);
};

const eliminarProducto = async (id) => {
    const [result] = await db.query(
        `
            UPDATE productos
            SET activo = FALSE
            WHERE id = ?
              AND activo = TRUE
        `,
        [id],
    );

    return result.affectedRows > 0;
};

module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
};