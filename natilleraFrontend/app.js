// app.js
const apiUrl = 'http://localhost:4000/api';

// DOM
const formSocio = document.getElementById('form-socio');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const btnDisableSocio = document.getElementById('btn-disable-socio');
const tablaSocios = document.querySelector('#tabla-socios tbody');
const selectSocioPagos = document.getElementById('select-socio-pagos');
const tablaPagos = document.querySelector('#tabla-pagos tbody');
const formRifa = document.getElementById('form-rifa');
const listaRifas = document.getElementById('lista-rifas');

let socios = [];
let socioEditando = null;

// ============================
// FUNCIONES SOCIOS
// ============================

async function cargarSocios() {
  const res = await fetch(`${apiUrl}/socios`);
  const data = await res.json();
  socios = data.socios;
  renderizarSocios();
  renderizarSelectPagos();
}

function renderizarSocios() {
  tablaSocios.innerHTML = '';
  socios.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.documento}</td>
      <td>${s.nombre1} ${s.nombre2||''} ${s.apellido1} ${s.apellido2||''}</td>
      <td>${s.correo||''} / ${s.telefono||''}</td>
      <td>${s.estado}</td>
      <td>
        <button class="btn secondary btn-edit" data-id="${s.id}">Editar</button>
        <button class="btn danger btn-disable" data-id="${s.id}">Inhabilitar</button>
      </td>
    `;
    tablaSocios.appendChild(tr);
  });
}

// Render select socio para pagos
function renderizarSelectPagos() {
  selectSocioPagos.innerHTML = '<option value="">Seleccionar socio...</option>';
  socios.forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = `${s.nombre1} ${s.apellido1} (${s.documento})`;
    selectSocioPagos.appendChild(option);
  });
}

// Crear / editar socio
formSocio.addEventListener('submit', async e => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(formSocio).entries());

  try {
    let res;
    if (socioEditando) {
      res = await fetch(`${apiUrl}/socios/${socioEditando.id}`, {
        method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(formData)
      });
    } else {
      res = await fetch(`${apiUrl}/socios`, {
        method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(formData)
      });
    }

    const data = await res.json();
    if(!data.ok) return alert(data.error);
    await cargarSocios();
    formSocio.reset();
    socioEditando = null;
    btnCancelEdit.classList.add('hidden');
    btnDisableSocio.classList.add('hidden');
  } catch(err) { console.error(err); alert('Error al guardar socio'); }
});

// Editar socio
tablaSocios.addEventListener('click', e => {
  if (e.target.classList.contains('btn-edit')) {
    const id = e.target.dataset.id;
    socioEditando = socios.find(s => s.id == id);
    for (const key in socioEditando) {
      const input = formSocio.querySelector(`[name=${key}]`);
      if(input) input.value = socioEditando[key] || '';
    }
    btnCancelEdit.classList.remove('hidden');
    btnDisableSocio.classList.remove('hidden');
  }
});

// Cancelar edición
btnCancelEdit.addEventListener('click', () => {
  socioEditando = null;
  formSocio.reset();
  btnCancelEdit.classList.add('hidden');
  btnDisableSocio.classList.add('hidden');
});

// Inhabilitar socio
tablaSocios.addEventListener('click', async e => {
  if(e.target.classList.contains('btn-disable')) {
    const id = e.target.dataset.id;
    if(!confirm('¿Deseas inhabilitar este socio?')) return;
    const res = await fetch(`${apiUrl}/socios/${id}/estado`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({estado:'INHABILITADO'})
    });
    await cargarSocios();
  }
});

// ============================
// PAGOS
// ============================

selectSocioPagos.addEventListener('change', cargarPagos);

async function cargarPagos() {
  const socioId = selectSocioPagos.value;
  if(!socioId) { tablaPagos.innerHTML=''; return; }

  const res = await fetch(`${apiUrl}/socios/${socioId}/pagos`);
  const data = await res.json();
  tablaPagos.innerHTML = '';
  data.pagos.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.semana}</td>
      <td><input type="date" value="${p.fecha_pago||''}" data-id="${p.id}" class="input-pago" data-field="fecha_pago"></td>
      <td><input value="${p.forma_pago||''}" data-id="${p.id}" class="input-pago" data-field="forma_pago"></td>
      <td><input type="number" value="${p.valor||0}" data-id="${p.id}" class="input-pago" data-field="valor"></td>
      <td><input value="${p.nombre_pagador||''}" data-id="${p.id}" class="input-pago" data-field="nombre_pagador"></td>
      <td><input value="${p.firma_recibe||''}" data-id="${p.id}" class="input-pago" data-field="firma_recibe"></td>
      <td>${p.estado}</td>
      <td><button class="btn primary btn-save-pago" data-id="${p.id}">Guardar</button></td>
    `;
    tablaPagos.appendChild(tr);
  });
}

// Guardar pago
tablaPagos.addEventListener('click', async e => {
  if(e.target.classList.contains('btn-save-pago')){
    const id = e.target.dataset.id;
    const inputs = tablaPagos.querySelectorAll(`.input-pago[data-id="${id}"]`);
    const body = {};
    inputs.forEach(inp => body[inp.dataset.field] = inp.value);
    body.estado = 'PAGADO';
    body.usuario = 'Admin';
    const res = await fetch(`${apiUrl}/pagos/${id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
    });
    const data = await res.json();
    if(!data.ok) return alert('Error al guardar pago');
    cargarPagos();
  }
});

// ============================
// RIFAS
// ============================

formRifa.addEventListener('submit', async e => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(formRifa).entries());
  const res = await fetch(`${apiUrl}/rifas`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(formData)
  });
  const data = await res.json();
  if(!data.ok) return alert('Error al crear rifa');
  formRifa.reset();
  cargarRifas();
});

async function cargarRifas() {
  const res = await fetch(`${apiUrl}/rifas`);
  const data = await res.json();
  listaRifas.innerHTML = data.rifas.map(r => `<div>${r.nombre} - ${r.fecha_evento}</div>`).join('');
}

// ============================
// INIT
// ============================
cargarSocios();
cargarRifas();
