
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './db.mjs';

import {
    obtenerEquipos,
    obtenerCategorias,
    obtenerEquipoPorId,
    obtenerHistorialEquipo,
    crearEquipo,
    actualizarEquipo,
    eliminarEquipo,
    crearPrestamo,
    devolverPrestamo
} from './equipos.repo.mjs';

import { validarEquipo, validarId } from './equipos.validacion.mjs';

// Creamos la aplicacion de Express
const app = express();

// Obtenemos la ruta de la carpeta actual
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuramos EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// Permitimos recibir datos JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Gestionamos los errores de PostgreSQL en un unico sitio

function responderErrorAPI(error, res, operacion = '') {
    console.error('Error en la API:', error.message);

    // Errores controlados de la aplicación
    if (error.status) {
        return res.status(error.status).json({
            error: error.message
        });
    }

    // Código repetido o colisión con el índice único
    if (error.code === '23505') {
        return res.status(409).json({
            error: 'Ya existe un equipo o préstamo con esos datos'
        });
    }

    // Violación de clave foránea
    if (error.code === '23503') {
        if (operacion === 'eliminar') {
            return res.status(409).json({
                error: 'No se puede eliminar un equipo que tiene préstamos'
            });
        }

        if (operacion === 'prestar') {
            return res.status(400).json({
                error: 'El usuario indicado no existe'
            });
        }
    }

    return res.status(500).json({
        error: 'Error interno del servidor'
    });
}



// Mostramos el listado de equipos
app.get('/equipos', async (req, res) => {
    try {
        // Leemos y normalizamos los filtros
        const busqueda = typeof req.query.busqueda === 'string'
            ? req.query.busqueda.trim()
            : '';

        const categoria = typeof req.query.categoria === 'string'
            ? req.query.categoria
            : '';

        let disponible = typeof req.query.disponible === 'string'
            ? req.query.disponible
            : '';

        if (!['', 'true', 'false'].includes(disponible)) {
            disponible = '';
        }

        let orden = typeof req.query.orden === 'string'
            ? req.query.orden
            : 'codigo';

        if (!['codigo', 'nombre'].includes(orden)) {
            orden = 'codigo';
        }

        // La pagina debe ser un numero entero mayor o igual que 1
        let pagina = 1;

        if (
            typeof req.query.page === 'string' &&
            /^\d+$/.test(req.query.page) &&
            Number(req.query.page) >= 1
        ) {
            pagina = Number(req.query.page);
        }

        const limite = 5;
        const offset = (pagina - 1) * limite;

        // Consultamos los equipos y las categorias
        const filtros = {
            busqueda,
            categoria,
            disponible,
            orden,
            limite,
            offset
        };

        const resultado = await obtenerEquipos(filtros);
        const categorias = await obtenerCategorias();

        const totalPaginas = Math.ceil(resultado.total / limite);

        // Conservamos los filtros en los enlaces de paginacion
        const parametros = new URLSearchParams();

        if (busqueda) parametros.set('busqueda', busqueda);
        if (categoria) parametros.set('categoria', categoria);
        if (disponible) parametros.set('disponible', disponible);

        parametros.set('orden', orden);

        res.render('equipos', {
            equipos: resultado.equipos,
            categorias,
            busqueda,
            categoria,
            disponible,
            orden,
            pagina,
            totalPaginas,
            filtrosQuery: parametros.toString()
        });

    } catch (error) {
        console.error('Error al obtener los equipos:', error.message);
        res.status(500).send('Error al consultar los equipos');
    }
});

// Mostramos el detalle de un equipo
app.get('/equipos/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // Comprobamos que el id sea un numero entero positivo
        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).send('El identificador no es valido');
        }

        // Buscamos el equipo
        const equipo = await obtenerEquipoPorId(id);

        // Comprobamos que exista
        if (!equipo) {
            return res.status(404).send('El equipo no existe');
        }

        // Consultamos su historial de prestamos
        const historial = await obtenerHistorialEquipo(id);

        res.render('equipo', {
            equipo,
            historial
        });

    } catch (error) {
        console.error('Error al obtener el equipo:', error.message);
        res.status(500).send('Error al consultar el equipo');
    }
});

// Creamos un equipo
app.post('/api/equipos', async (req, res) => {
    // Validamos los datos recibidos
    const validacion = validarEquipo(req.body);

    if (validacion.error) {
        return res.status(400).json({
            error: validacion.error
        });
    }

    try {
        const equipo = await crearEquipo(validacion.datos);

        // Indicamos la ruta del equipo creado
        res.location(`/api/equipos/${equipo.id}`);

        return res.status(201).json(equipo);

    } catch (error) {
        return responderErrorAPI(error, res);
    }
});

// Actualizamos un equipo
app.put('/api/equipos/:id', async (req, res) => {
    const id = req.params.id;

    // Validamos el identificador
    if (!validarId(id)) {
        return res.status(400).json({
            error: 'El identificador no es valido'
        });
    }

    // Validamos los datos recibidos
    const validacion = validarEquipo(req.body);

    if (validacion.error) {
        return res.status(400).json({
            error: validacion.error
        });
    }

    try {
        const resultado = await actualizarEquipo(
            id,
            validacion.datos
        );

        // Comprobamos si existe el equipo
        if (resultado.rowCount === 0) {
            return res.status(404).json({
                error: 'El equipo no existe'
            });
        }

        return res.status(200).json(resultado.rows[0]);

    } catch (error) {
        return responderErrorAPI(error, res);
    }
});

// Eliminamos un equipo
app.delete('/api/equipos/:id', async (req, res) => {
    const id = req.params.id;

    // Validamos el identificador
    if (!validarId(id)) {
        return res.status(400).json({
            error: 'El identificador no es valido'
        });
    }

    try {
        const filasEliminadas = await eliminarEquipo(id);

        // Comprobamos si existe el equipo
        if (filasEliminadas === 0) {
            return res.status(404).json({
                error: 'El equipo no existe'
            });
        }

        // Respondemos sin contenido
        return res.status(204).end();

    } catch (error) {
        return responderErrorAPI(error, res, 'eliminar');
    }
});

// Ruta para crear un préstamo
app.post('/api/prestamos', async (req, res) => {
    const { equipoId, usuarioId } = req.body;

    // Validamos los identificadores
    if (!validarId(String(equipoId)) || !validarId(String(usuarioId))) {
        return res.status(400).json({
            error: 'Los identificadores del equipo y del usuario no son válidos'
        });
    }

    try {
        const prestamo = await crearPrestamo(equipoId, usuarioId);

        return res.status(201).json(prestamo);

    } catch (error) {
        return responderErrorAPI(error, res, 'prestar');
    }
});

// Ruta para registrar una devolución
app.post('/api/prestamos/:id/devolucion', async (req, res) => {
    const id = req.params.id;

    if (!validarId(id)) {
        return res.status(400).json({
            error: 'El identificador del préstamo no es válido'
        });
    }

    try {
        const prestamo = await devolverPrestamo(id);

        return res.status(200).json(prestamo);

    } catch (error) {
        return responderErrorAPI(error, res);
    }
});



// Gestionamos los errores de las peticiones
app.use((error, req, res, next) => {
    // JSON mal formado
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: 'El JSON enviado no es valido'
        });
    }

    // Otros errores
    console.error('Error del servidor:', error.message);

    return res.status(500).json({
        error: 'Error interno del servidor'
    });
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;

// Comprobamos la conexion con PostgreSQL antes de iniciar
try {
    await pool.query('SELECT 1');

    console.log('Conexion con PostgreSQL correcta');

    app.listen(PORT, () => {
        console.log(`Servidor iniciado en http://localhost:${PORT}`);
    });

} catch (error) {
    console.error('Error al conectar con PostgreSQL:', error.message);
    process.exit(1);
}
