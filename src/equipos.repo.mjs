
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
