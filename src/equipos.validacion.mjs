// Validamos los datos de un equipo
export function validarEquipo(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body))
        return { error: 'Debes enviar un objeto con los datos del equipo' };

    const { codigo, nombre, categoria } = body;

    // Comprobamos que todos los campos sean textos
    if (typeof codigo !== 'string' || typeof nombre !== 'string' || typeof categoria !== 'string')
        return { error: 'Todos los campos deben ser textos' };

    // Eliminamos los espacios sobrantes
    const equipo = { codigo: codigo.trim(), nombre: nombre.trim(), categoria: categoria.trim() };

    // Comprobamos que no haya campos vacios
    if (!equipo.codigo || !equipo.nombre || !equipo.categoria)
        return { error: 'Los campos no pueden estar vacios' };

    // Comprobamos las longitudes
    if (equipo.codigo.length > 20)
        return { error: 'El codigo no puede superar los 20 caracteres' };
    if (equipo.nombre.length > 100)
        return { error: 'El nombre no puede superar los 100 caracteres' };
    if (equipo.categoria.length > 50)
        return { error: 'La categoria no puede superar los 50 caracteres' };

    return { datos: equipo };
}

// Validamos que el identificador sea un entero positivo
export function validarId(id) {
    return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) <= 2147483647;
}