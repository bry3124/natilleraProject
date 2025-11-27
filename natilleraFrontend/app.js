// app.js
const API = 'http://localhost:4000/api';

async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return res.json();
}

// SOCIOS
const formSocio = document.getElementById('form-socio');
const tablaSociosBody = document.querySelector('#tabla-socios tbody');
const pagosSection = document.getElementById('pagos-section');

formSocio.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(formSocio).entries());
    try {
        await fetchJson(API + '/socios', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(fd)});
        formSocio.reset();
        loadSocios();
    } catch (err) { alert('Error: '+err.message); }
});

async function loadSocios() {
    const socios = await fetchJson(API + '/socios');
    tablaSociosBody.innerHTML = '';
    socios.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${s.nombre1} ${s.nombre2||''} ${s.apellido1} ${s.apellido2||''}</td>
                        <td>${s.correo||''}</td><td>${s.telefono||''}</td>
                        <td>
                        <button data-id="${s.id}" class="ver-pagos">Pagos</button>
                        <button data-id="${s.id}" class="editar-socio">Editar</button>
                        </td>`;
        tablaSociosBody.appendChild(tr);
    });
    document.querySelectorAll('.ver-pagos').forEach(b => b.onclick = () => openPagos(b.dataset.id));
    document.querySelectorAll('.editar-socio').forEach(b => b.onclick = () => editarSocio(b.dataset.id));
}

// editar socio sencillo (carga en el formulario)
async function editarSocio(id) {
    const s = await fetchJson(API + '/socios/' + id);
    formSocio.nombre1.value = s.nombre1;
    formSocio.nombre2.value = s.nombre2 || '';
    formSocio.apellido1.value = s.apellido1;
    formSocio.apellido2.value = s.apellido2 || '';
    formSocio.correo.value = s.correo || '';
    formSocio.telefono.value = s.telefono || '';
    // cambiar submit para hacer PUT
    formSocio.onsubmit = async function(e) {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(formSocio).entries());
        await fetchJson(API + '/socios/' + id, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(fd)});
        formSocio.reset();
        formSocio.onsubmit = null;
        loadSocios();
    };
}

// PAGOS: mostrar plantilla 52 semanas
let socioActualId = null;
async function openPagos(socioId) {
    socioActualId = socioId;
    const socio = await fetchJson(API + `/socios/${socioId}`);
    document.getElementById('socio-nombre').textContent = `${socio.nombre1} ${socio.apellido1}`;
    document.getElementById('socio-nombre').dataset.id = socioId;
    document.getElementById('socios-section').style.display = 'none';
    pagosSection.style.display = 'block';
    loadPagos(socioId);
}

document.getElementById('volver-lista').addEventListener('click', () => {
    pagosSection.style.display = 'none';
    document.getElementById('socios-section').style.display = 'block';
});

async function loadPagos(socioId) {
    const pagos = await fetchJson(API + `/socios/${socioId}/pagos`);
    const tbody = document.querySelector('#tabla-pagos tbody');
    tbody.innerHTML = '';
    // aseguramos 52 filas (por si algo)
    for (let s=1; s<=52; s++) {
        const p = pagos.find(x => x.semana === s) || {semana:s, fecha_pago:'', forma_pago:'', valor:'', nombre_pagador:'', firma_recibe:'', estado:'PENDIENTE'};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${s}</td>
        <td><input type="date" value="${p.fecha_pago ? p.fecha_pago : ''}" data-week="${s}" class="fecha"></td>
        <td><input data-week="${s}" class="forma" value="${p.forma_pago || ''}"></td>
        <td><input data-week="${s}" class="valor" value="${p.valor || ''}"></td>
        <td><input data-week="${s}" class="pagador" value="${p.nombre_pagador || ''}"></td>
        <td><input data-week="${s}" class="firma" value="${p.firma_recibe || ''}"></td>
        <td>
            <select data-week="${s}" class="estado">
            <option ${p.estado === 'PENDIENTE' ? 'selected':''}>PENDIENTE</option>
            <option ${p.estado === 'PAGADO' ? 'selected':''}>PAGADO</option>
            <option ${p.estado === 'ANULADO' ? 'selected':''}>ANULADO</option>
            </select>
        </td>
        <td><button data-week="${s}" class="guardar">Guardar</button></td>`;
        tbody.appendChild(tr);
    }
    document.querySelectorAll('.guardar').forEach(btn => btn.onclick = guardarPago);
}

async function guardarPago(e) {
    const semana = Number(e.target.dataset.week);
    const tr = e.target.closest('tr');
    const fecha_pago = tr.querySelector('.fecha').value || null;
    const forma_pago = tr.querySelector('.forma').value;
    const valor = tr.querySelector('.valor').value;
    const nombre_pagador = tr.querySelector('.pagador').value;
    const firma_recibe = tr.querySelector('.firma').value;
    const estado = tr.querySelector('.estado').value;
    try {
        await fetchJson(API + '/pagos', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ socio_id: socioActualId, semana, fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado})
        });
        alert('Pago guardado');
        loadPagos(socioActualId);
    } catch (err) { alert('Error guardando: '+err.message); }
}

// RIFAS
const formRifa = document.getElementById('form-rifa');
const listaRifas = document.getElementById('lista-rifas');
const detallesRifa = document.getElementById('detalles-rifa');
const numerosGrid = document.getElementById('numeros-grid');
let rifaActual = null;

formRifa.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(formRifa).entries());
    try {
        const r = await fetchJson(API + '/rifas', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(fd)});
        formRifa.reset();
        loadRifas();
    } catch (err) { alert('Error creando rifa: '+err.message); }
});

async function loadRifas() {
    const r = await fetchJson(API + '/rifas');
    listaRifas.innerHTML = '';
    r.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `${item.nombre} - ${item.fecha_evento} <button data-id="${item.id}" class="ver-rifa">Ver</button>`;
        listaRifas.appendChild(li);
    });
    document.querySelectorAll('.ver-rifa').forEach(b => b.onclick = () => verRifa(b.dataset.id));
}

async function verRifa(id) {
    rifaActual = id;
    const r = await fetchJson(API + '/rifas');
    const found = r.find(x=>x.id===id);
    document.getElementById('rifa-nombre').textContent = found.nombre;
    detallesRifa.style.display = 'block';
    const nums = await fetchJson(API + `/rifas/${id}/numeros`);
    numerosGrid.innerHTML = '';
    nums.forEach(n => {
        const div = document.createElement('div');
        div.className = 'numero' + (n.socio_id ? ' taken' : '');
        div.textContent = n.numero;
        div.dataset.numero = n.numero;
        div.dataset.socio = n.socio_id;
        div.onclick = () => asignarNumero(n.numero);
        numerosGrid.appendChild(div);
    });
}

async function asignarNumero(numero) {
    const socio = prompt('ID del socio para asignar el número ' + numero + '\n(Pega el id del socio desde listado).');
    if (!socio) return;
    try {
        await fetchJson(API + `/rifas/${rifaActual}/numero/assign`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({numero, socio_id: socio})});
        verRifa(rifaActual);
    } catch (err) { alert('Error asignando: '+err.message); }
}

document.getElementById('sorteo-btn').addEventListener('click', async () => {
    if (!confirm('Realizar sorteo?')) return;
    try {
        const res = await fetchJson(API + `/rifas/${rifaActual}/sorteo`, {method:'POST'});
        document.getElementById('resultado-sorteo').textContent = `Ganador: número ${res.ganador} - socio: ${res.socio_id} - premio: ${res.premio}`;
        loadRifas();
        verRifa(rifaActual);
    } catch (err) { alert('Error sorteando: '+err.message); }
});

// inicializa
loadSocios();
loadRifas();
