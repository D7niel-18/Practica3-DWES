
import pool from './db.mjs';

// Obtenemos los equipos aplicando los filtros y la paginacion
export async function obtenerEquipos(filtros) {
    const condiciones = [];
    const valores = [];

    // Busqueda por nombre
    if (filtros.busqueda) {
        valores.push(`%${filtros.busqueda}%`);
        condiciones.push(`nombre ILIKE $${valores.length}`);
    }

    // Filtro por categoria
    if (filtros.categoria) {
        valores.push(filtros.categoria);
        condiciones.push(`categoria = $${valores.length}`);
    }

    // Filtro por disponibilidad
    if (filtros.disponible !== '') {
        valores.push(filtros.disponible === 'true');
        condiciones.push(`disponible = $${valores.length}`);
    }

    // Construimos el WHERE si hay filtros
    let where = '';

    if (condiciones.length > 0) {
        where = 'WHERE ' + condiciones.join(' AND ');
    }

    // Solo permitimos ordenar por estas columnas
    const ordenes = {
        codigo: 'codigo',
        nombre: 'nombre'
    };

    const orden = ordenes[filtros.orden] || 'codigo';

    // Consultamos el numero total de resultados
    const consultaTotal = `
        SELECT COUNT(*) AS total
        FROM practica_prestamos.equipos
        ${where}
    `;

    const resultadoTotal = await pool.query(consultaTotal, valores);
    const total = Number(resultadoTotal.rows[0].total);

    // Añadimos limite y desplazamiento
    const valoresPaginacion = [...valores];

    valoresPaginacion.push(filtros.limite);
    const limiteParametro = valoresPaginacion.length;

    valoresPaginacion.push(filtros.offset);
    const offsetParametro = valoresPaginacion.length;

    // Consultamos los equipos de la pagina actual
    const consultaEquipos = `
        SELECT id, codigo, nombre, categoria, disponible
        FROM practica_prestamos.equipos
        ${where}
        ORDER BY ${orden}
        LIMIT $${limiteParametro}
        OFFSET $${offsetParametro}
    `;

    const resultadoEquipos = await pool.query(
        consultaEquipos,
        valoresPaginacion
    );

    return {
        equipos: resultadoEquipos.rows,
        total
    };
}

// Obtenemos todas las categorias diferentes
export async function obtenerCategorias() {
    const consulta = `
        SELECT DISTINCT categoria
        FROM practica_prestamos.equipos
        ORDER BY categoria
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
}

// Obtenemos un equipo y su posible prestamo activo
export async function obtenerEquipoPorId(id) {
    const consulta = `
        SELECT
            e.id,
            e.codigo,
            e.nombre,
            e.categoria,
            e.disponible,
            p.id AS prestamo_id,
            p.fecha_prestamo,
            u.nombre AS usuario_actual
        FROM practica_prestamos.equipos e
        LEFT JOIN practica_prestamos.prestamos p
            ON e.id = p.equipo_id
            AND p.fecha_devolucion IS NULL
        LEFT JOIN practica_prestamos.usuarios u
            ON p.usuario_id = u.id
        WHERE e.id = $1
    `;

    const resultado = await pool.query(consulta, [id]);

    return resultado.rows[0];
}

// Obtenemos el historial de prestamos de un equipo
export async function obtenerHistorialEquipo(id) {
    const consulta = `
        SELECT
            p.id,
            u.nombre AS usuario,
            p.fecha_prestamo,
            p.fecha_devolucion
        FROM practica_prestamos.prestamos p
        JOIN practica_prestamos.usuarios u
            ON p.usuario_id = u.id
        WHERE p.equipo_id = $1
        ORDER BY p.fecha_prestamo DESC
    `;

    const resultado = await pool.query(consulta, [id]);

    return resultado.rows;
}

// Creamos un equipo nuevo
export async function crearEquipo(equipo) {
    const consulta = `
        INSERT INTO practica_prestamos.equipos
            (codigo, nombre, categoria)
        VALUES ($1, $2, $3)
        RETURNING id, codigo, nombre, categoria, disponible
    `;

    const valores = [
        equipo.codigo,
        equipo.nombre,
        equipo.categoria
    ];

    const resultado = await pool.query(consulta, valores);

    return resultado.rows[0];
}

// Actualizamos los datos de un equipo
export async function actualizarEquipo(id, equipo) {
    const consulta = `
        UPDATE practica_prestamos.equipos
        SET codigo = $1,
            nombre = $2,
            categoria = $3
        WHERE id = $4
        RETURNING id, codigo, nombre, categoria, disponible
    `;

    const valores = [
        equipo.codigo,
        equipo.nombre,
        equipo.categoria,
        id
    ];

    const resultado = await pool.query(consulta, valores);

    return resultado;
}

// Eliminamos un equipo
export async function eliminarEquipo(id) {
    const consulta = `
        DELETE FROM practica_prestamos.equipos
        WHERE id = $1
    `;

    const resultado = await pool.query(consulta, [id]);

    return resultado.rowCount;
}

// Función para crear un préstamo
export async function crearPrestamo(equipoId, usuarioId) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Marcamos el equipo como no disponible si sigue libre
        const resultadoEquipo = await client.query(
            `UPDATE practica_prestamos.equipos
             SET disponible = false
             WHERE id = $1 AND disponible = true`,
            [equipoId]
        );

        if (resultadoEquipo.rowCount === 0) {
            // Comprobamos si el equipo existe
            const comprobacion = await client.query(
                `SELECT id
                 FROM practica_prestamos.equipos
                 WHERE id = $1`,
                [equipoId]
            );

            if (comprobacion.rowCount === 0) {
                const error = new Error('El equipo no existe');
                error.status = 404;
                throw error;
            }

            const error = new Error('El equipo no está disponible');
            error.status = 409;
            throw error;
        }

        // Creamos el préstamo
        const resultadoPrestamo = await client.query(
            `INSERT INTO practica_prestamos.prestamos
                (equipo_id, usuario_id)
             VALUES ($1, $2)
             RETURNING id, equipo_id, usuario_id,
                       fecha_prestamo, fecha_devolucion`,
            [equipoId, usuarioId]
        );

        await client.query('COMMIT');

        return resultadoPrestamo.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;

    } finally {
        client.release();
    }
}

// Función para registrar una devolución
export async function devolverPrestamo(id) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Registramos la devolución si todavía está activo
        const resultadoPrestamo = await client.query(
            `UPDATE practica_prestamos.prestamos
             SET fecha_devolucion = CURRENT_TIMESTAMP
             WHERE id = $1 AND fecha_devolucion IS NULL
             RETURNING id, equipo_id, usuario_id,
                       fecha_prestamo, fecha_devolucion`,
            [id]
        );

        if (resultadoPrestamo.rowCount === 0) {
            // Comprobamos si el préstamo existe
            const comprobacion = await client.query(
                `SELECT id
                 FROM practica_prestamos.prestamos
                 WHERE id = $1`,
                [id]
            );

            if (comprobacion.rowCount === 0) {
                const error = new Error('El préstamo no existe');
                error.status = 404;
                throw error;
            }

            const error = new Error('El préstamo ya está devuelto');
            error.status = 409;
            throw error;
        }

        const prestamo = resultadoPrestamo.rows[0];

        // Volvemos a poner el equipo como disponible
        await client.query(
            `UPDATE practica_prestamos.equipos
             SET disponible = true
             WHERE id = $1`,
            [prestamo.equipo_id]
        );

        await client.query('COMMIT');

        return prestamo;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;

    } finally {
        client.release();
    }
}
