
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const BASE_URL = 'http://localhost:3000';
const CODIGO = `TEST-${randomUUID().slice(0, 8)}`.toUpperCase();

let pruebasCorrectas = 0;

async function peticion(ruta, opciones = {}) {
    const respuesta = await fetch(`${BASE_URL}${ruta}`, opciones);
    const texto = await respuesta.text();

    let datos = null;

    try {
        datos = texto ? JSON.parse(texto) : null;
    } catch {
        datos = texto;
    }

    return {
        status: respuesta.status,
        datos,
        texto
    };
}

function comprobar(condicion, mensaje) {
    assert.ok(condicion, mensaje);
    pruebasCorrectas++;
    console.log(`OK: ${mensaje}`);
}

async function crearEquipo(codigo, nombre = 'Equipo de pruebas') {
    const respuesta = await peticion('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            codigo,
            nombre,
            categoria: 'Pruebas'
        })
    });

    assert.equal(respuesta.status, 201, `No se pudo crear ${codigo}`);
    return respuesta.datos;
}

async function detalleEquipo(id) {
    const respuesta = await peticion(`/equipos/${id}`);

    assert.equal(respuesta.status, 200, 'No se pudo consultar el detalle');

    return respuesta.texto;
}


async function comprobarDetalle(id) {
    const respuesta = await peticion(`/equipos/${id}`);

    assert.equal(respuesta.status, 200, 'No se pudo consultar el detalle');

    return respuesta.texto;
}


async function ejecutarPruebas() {
    console.log('\nINICIANDO PRUEBAS DE LA API\n');

    // Creamos equipos propios para esta ejecución
    const equipoA = await crearEquipo(`${CODIGO}-A`);
    const equipoB = await crearEquipo(`${CODIGO}-B`);
    const equipoC = await crearEquipo(`${CODIGO}-C`);
    const equipoD = await crearEquipo(`${CODIGO}-D`);
    const equipoE = await crearEquipo(`${CODIGO}-E`);
    const equipoF = await crearEquipo(`${CODIGO}-F`);

    console.log('Equipos de prueba creados.\n');

    // Alta, repetido, datos inválidos y JSON roto
    let respuesta = await peticion('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            codigo: `${CODIGO}-A`,
            nombre: 'Equipo repetido',
            categoria: 'Pruebas'
        })
    });

    comprobar(respuesta.status === 409, 'Alta repetida devuelve 409');

    respuesta = await peticion('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            codigo: '',
            nombre: 'Equipo inválido',
            categoria: 'Pruebas'
        })
    });

    comprobar(respuesta.status === 400, 'Datos inválidos devuelven 400');

    respuesta = await peticion('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"codigo":'
    });

    comprobar(respuesta.status === 400, 'JSON roto devuelve 400');

    // PUT correcto
    respuesta = await peticion(`/api/equipos/${equipoA.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            codigo: `${CODIGO}-A`,
            nombre: 'Equipo actualizado',
            categoria: 'Pruebas'
        })
    });

    comprobar(respuesta.status === 200, 'PUT correcto devuelve 200');

    // PUT de un equipo inexistente
    respuesta = await peticion('/api/equipos/999999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            codigo: `${CODIGO}-X`,
            nombre: 'Equipo inexistente',
            categoria: 'Pruebas'
        })
    });

    comprobar(respuesta.status === 404, 'PUT inexistente devuelve 404');

    // PUT con código que ya pertenece a otro equipo
    respuesta = await peticion(`/api/equipos/${equipoA.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            codigo: equipoB.codigo,
            nombre: 'Código duplicado',
            categoria: 'Pruebas'
        })
    });

    comprobar(respuesta.status === 409, 'PUT con código repetido devuelve 409');

    // DELETE de un equipo sin historial
    respuesta = await peticion(`/api/equipos/${equipoC.id}`, {
        method: 'DELETE'
    });

    comprobar(respuesta.status === 204, 'DELETE sin historial devuelve 204');

    // DELETE de un equipo inexistente
    respuesta = await peticion('/api/equipos/999999', {
        method: 'DELETE'
    });

    comprobar(respuesta.status === 404, 'DELETE inexistente devuelve 404');

    // Préstamo correcto para el equipo D
    respuesta = await peticion('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            equipoId: equipoD.id,
            usuarioId: 1
        })
    });

    comprobar(respuesta.status === 201, 'Préstamo para preparar DELETE');

    // DELETE con historial
    respuesta = await peticion(`/api/equipos/${equipoD.id}`, {
        method: 'DELETE'
    });

    comprobar(respuesta.status === 409, 'DELETE con préstamo devuelve 409');

    // Préstamo correcto
    respuesta = await peticion('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            equipoId: equipoA.id,
            usuarioId: 1
        })
    });

    comprobar(respuesta.status === 201, 'Préstamo correcto devuelve 201');

    const prestamoA = respuesta.datos;

    // Préstamo duplicado
    respuesta = await peticion('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            equipoId: equipoA.id,
            usuarioId: 1
        })
    });

    comprobar(respuesta.status === 409, 'Préstamo duplicado devuelve 409');

    // Devolución
    respuesta = await peticion(
        `/api/prestamos/${prestamoA.id}/devolucion`,
        { method: 'POST' }
    );

    comprobar(respuesta.status === 200, 'Devolución correcta devuelve 200');

    // Segunda devolución
    respuesta = await peticion(
        `/api/prestamos/${prestamoA.id}/devolucion`,
        { method: 'POST' }
    );

    comprobar(respuesta.status === 409, 'Segunda devolución devuelve 409');

    // Rollback con usuario inexistente
    respuesta = await peticion('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            equipoId: equipoE.id,
            usuarioId: 999999
        })
    });

    comprobar(respuesta.status === 400, 'Usuario inexistente devuelve 400');

    // Consultamos el detalle del equipo después del rollback

    const detalleRollback = await comprobarDetalle(equipoE.id);

    comprobar(
        detalleRollback.includes('Disponible'),
        'Después del rollback, el equipo sigue disponible'
    );

    comprobar(
        detalleRollback.includes('no tiene ningún préstamo activo'),
        'Después del rollback, no existe ningún préstamo activo'
    );


    comprobar(
        detalleRollback.includes(equipoE.codigo),
        'El detalle del equipo aparece después del rollback'
    );

    comprobar(
        /disponible/i.test(detalleRollback),
        'El detalle muestra información de disponibilidad'
    );

    console.log(
        '\nRevisa también el detalle anterior: debe indicar que el equipo ' +
        'está disponible y que no tiene ningún préstamo activo.'
    );

    // Dos peticiones simultáneas al mismo equipo
    const peticiones = await Promise.all([
        peticion('/api/prestamos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipoId: equipoF.id,
                usuarioId: 1
            })
        }),
        peticion('/api/prestamos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipoId: equipoF.id,
                usuarioId: 1
            })
        })
    ]);

    const estados = peticiones.map(p => p.status).sort();

    comprobar(
        estados[0] === 201 && estados[1] === 409,
        'Dos préstamos simultáneos devuelven un 201 y un 409'
    );

    // Consultamos el detalle del equipo después de la simultaneidad
    
    const detalleSimultaneo = await comprobarDetalle(equipoF.id);

    comprobar(
        detalleSimultaneo.includes('Prestado'),
        'Después de la simultaneidad, el equipo aparece como prestado'
    );

    comprobar(
        detalleSimultaneo.includes('Usuario:'),
        'El detalle muestra el usuario del préstamo activo'
    );

    const cuerpoTabla = detalleSimultaneo.match(/<tbody>([\s\S]*?)<\/tbody>/);

    const filasPrestamos = cuerpoTabla
        ? (cuerpoTabla[1].match(/<tr>/g) || []).length
        : 0;

    comprobar(
        filasPrestamos === 1,
        'El historial contiene un único préstamo'
    );


    comprobar(
        detalleSimultaneo.includes(equipoF.codigo),
        'El detalle del equipo simultáneo se puede consultar'
    );

    const prestamosCreados = peticiones.filter(p => p.status === 201);

    comprobar(
        prestamosCreados.length === 1,
        'Solo se ha creado un préstamo en la simultaneidad'
    );

    console.log(
        '\nRevisa el detalle del equipo F: debe aparecer un único préstamo activo.'
    );

    console.log('\n--------------------------------');
    console.log(`PRUEBAS AUTOMÁTICAS SUPERADAS: ${pruebasCorrectas}`);
    console.log('--------------------------------\n');
}

ejecutarPruebas().catch(error => {
    console.error('\nERROR EN LAS PRUEBAS:');
    console.error(error.message);
    process.exitCode = 1;
});
