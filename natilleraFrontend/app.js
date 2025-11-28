// app.js (SPA) - Modal por semana (Opción B)
// Ajusta API_BASE si tu backend usa otro puerto
const API_BASE = 'http://localhost:4000/api';

document.addEventListener('DOMContentLoaded', () => {

  // DOM
  const formSocio = document.getElementById('form-socio');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const btnToggleEstado = document.getElementById('btn-toggle-estado');
  const btnNewSocio = document.getElementById('btn-new-socio');
  const tablaSociosBody = document.querySelector('#tabla-socios tbody');
  const filterStatus = document.getElementById('filter-status');
  const searchInput = document.getElementById('search-input');

  const selectSocioPagos = document.getElementById('select-socio-pagos');
  const semanasGrid = document.getElementById('semanas-grid');

  // Modal pago
  const modalPago = document.getElementById('modal-pago');
  const modalPagoClose = document.getElementById('modal-pago-close');
  const formPago = document.getElementById('form-pago');
  const p_pago_id = document.getElementById('p_pago_id');
  const p_socio_id = document.getElementById('p_socio_id');
  const p_semana = document.getElementById('p_semana');
  const p_fecha_pago = document.getElementById('p_fecha_pago');
  const p_forma_pago = document.getElementById('p_forma_pago');
  const p_valor = document.getElementById('p_valor');
  const p_nombre_pagador = document.getElementById('p_nombre_pagador');
  const p_firma_recibe = document.getElementById('p_firma_recibe');
  const p_estado = document.getElementById('p_estado');
  const modalSemanaTitle = document.getElementById('modal-semana');

  const toastEl = document.getElementById('toast');

  // state
  let socios = [];
  let pagosCache = {}; // pagosCache[socioId] = [array de pagos]
  let editingSocioId = null;

  // UTILS
  function toast(msg, t = 2200) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    setTimeout(()=> toastEl.classList.add('hidden'), t);
  }

  function formatNombre(s) {
    return `${s.nombre1} ${s.nombre2||''} ${s.apellido1} ${s.apellido2||''}`.replace(/\s+/g,' ').trim();
  }

  // LOAD initial
  loadSocios();
  loadRifas(); // muestra rifas simples

  // EVENT: buscar / filtro
  searchInput.addEventListener('input', debounce(loadSocios, 350));
  filterStatus.addEventListener('change', loadSocios);

  // Nuevo socio btn: scroll a form
  btnNewSocio.addEventListener('click', () => {
    window.scrollTo({top:0, behavior:'smooth'});
    resetSocioForm();
  });

  // FORM SOCIO: crear/editar
  formSocio.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(formSocio).entries());
    try {
      let res;
      if (editingSocioId) {
        // editar
        res = await fetch(`${API_BASE}/socios/${editingSocioId}`, {
          method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
        });
      } else {
        // crear
        res = await fetch(`${API_BASE}/socios`, {
          method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
        });
      }
      const json = await res.json();
      if (!json.ok) {
        toast(json.error || 'Error al guardar socio');
        return;
      }
      toast(editingSocioId ? 'Socio actualizado' : 'Socio creado');
      resetSocioForm();
      await loadSocios();
    } catch (err) {
      console.error(err);
      toast('Error de red');
    }
  });

  btnCancelEdit.addEventListener('click', () => {
    resetSocioForm();
  });

  // toggle habilitar/inhabilitar
  btnToggleEstado.addEventListener('click', async () => {
    if (!editingSocioId) return;
    const socio = socios.find(s => s.id == editingSocioId);
    const nuevo = socio.estado === 'ACTIVO' ? 'INHABILITADO' : 'ACTIVO';
    if (!confirm(`¿${nuevo === 'INHABILITADO' ? 'Inhabilitar' : 'Reactivar'} socio?`)) return;
    try {
      const res = await fetch(`${API_BASE}/socios/${editingSocioId}/estado`, {
        method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ estado: nuevo })
      });
      const json = await res.json();
      if (!json.ok) { toast('Error cambiando estado'); return; }
      toast('Estado actualizado');
      resetSocioForm();
      await loadSocios();
    } catch (e) { console.error(e); toast('Error servidor'); }
  });

  // cargar socios
  async function loadSocios() {
    const q = searchInput.value.trim();
    const status = filterStatus.value;
    const url = new URL(`${API_BASE}/socios`, window.location.origin);
    if (q) url.searchParams.set('search', q);
    if (status) url.searchParams.set('status', status);

    try {
      const res = await fetch(url.toString());
      const json = await res.json();
      socios = json.socios || [];
      renderSociosTable();
      renderSelectSocios();
    } catch (e) { console.error(e); toast('No se pudo cargar socios'); }
  }

  function renderSociosTable() {
    tablaSociosBody.innerHTML = '';
    socios.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.documento}</td>
        <td>${formatNombre(s)}</td>
        <td>${s.correo||''} <br><small>${s.telefono||''}</small></td>
        <td><span class="badge ${s.estado==='ACTIVO' ? 'paid' : 'late'}">${s.estado}</span></td>
        <td>
          <button class="btn secondary btn-edit" data-id="${s.id}"><i class="fa fa-edit"></i> Editar</button>
          <button class="btn primary btn-view-pagos" data-id="${s.id}"><i class="fa fa-table"></i> Ver Pagos</button>
        </td>
      `;
      tablaSociosBody.appendChild(tr);
    });

    // bind buttons
    document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      startEditSocio(id);
    }));
    document.querySelectorAll('.btn-view-pagos').forEach(b => b.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      selectSocioPagos.value = id;
      onSelectSocioForPayments();
      window.scrollTo({top: document.getElementById('pagos-section').offsetTop - 20, behavior: 'smooth'});
    }));
  }

  // render select socios
  function renderSelectSocios() {
    selectSocioPagos.innerHTML = '<option value="">-- Seleccione --</option>';
    socios.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${formatNombre(s)} (${s.documento})`;
      selectSocioPagos.appendChild(opt);
    });
  }

  // start edit
  function startEditSocio(id) {
    const s = socios.find(x => x.id == id);
    editingSocioId = id;
    document.getElementById('form-title').textContent = 'Editar socio';
    document.getElementById('socio-id').value = id;
    document.getElementById('documento').value = s.documento || '';
    document.getElementById('nombre1').value = s.nombre1 || '';
    document.getElementById('nombre2').value = s.nombre2 || '';
    document.getElementById('apellido1').value = s.apellido1 || '';
    document.getElementById('apellido2').value = s.apellido2 || '';
    document.getElementById('correo').value = s.correo || '';
    document.getElementById('telefono').value = s.telefono || '';
    document.getElementById('foto_url').value = s.foto_url || '';
    document.getElementById('firma_url').value = s.firma_url || '';

    btnCancelEdit.classList.remove('hidden');
    btnToggleEstado.classList.remove('hidden');
    btnToggleEstado.textContent = s.estado === 'ACTIVO' ? 'Inhabilitar' : 'Habilitar';
    btnToggleEstado.classList.toggle('danger', s.estado === 'ACTIVO');
    btnToggleEstado.classList.toggle('primary', s.estado !== 'ACTIVO');
  }

  function resetSocioForm() {
    editingSocioId = null;
    document.getElementById('form-title').textContent = 'Crear Socio';
    formSocio.reset();
    document.getElementById('socio-id').value = '';
    btnCancelEdit.classList.add('hidden');
    btnToggleEstado.classList.add('hidden');
    btnToggleEstado.textContent = 'Inhabilitar';
    btnToggleEstado.classList.remove('primary');
    btnToggleEstado.classList.add('danger');
  }

  // ---------------------------
  // PAGOS: selección socio => cargar 52 semanas
  // ---------------------------
  selectSocioPagos.addEventListener('change', onSelectSocioForPayments);

  async function onSelectSocioForPayments() {
    const socioId = selectSocioPagos.value;
    if (!socioId) {
      semanasGrid.innerHTML = '';
      return;
    }
    // fetch pagos (debe haber 52 filas creadas al crear socio)
    try {
      const res = await fetch(`${API_BASE}/socios/${socioId}/pagos`);
      const json = await res.json();
      const pagos = json.pagos || [];
      pagosCache[socioId] = pagos; // cache local
      renderSemanasGrid(socioId, pagos);
    } catch (e) {
      console.error(e);
      toast('Error cargando pagos');
    }
  }

  function renderSemanasGrid(socioId, pagos) {
    semanasGrid.innerHTML = '';
    // create map by semana
    const map = {};
    pagos.forEach(p => map[p.semana] = p);

    const today = new Date();

    for (let s = 1; s <= 52; s++) {
      const p = map[s] || { semana: s, estado: 'PENDIENTE' };
      const card = document.createElement('div');
      card.className = 'semana-card';
      const left = document.createElement('div');
      left.className = 'semana-left';
      const num = document.createElement('div');
      num.className = 'semana-number';
      num.textContent = `Semana ${s}`;
      const status = document.createElement('div');
      status.className = 'semana-status';
      // determine color
      let badgeClass = 'pending';
      if (p.estado === 'PAGADO') badgeClass = 'paid';
      else {
        // if fecha_pago exists, consider paid; else if week is past a rough date, mark late.
        if (p.fecha_pago) badgeClass = 'paid';
        // optionally mark late if current date beyond some threshold: we don't have week dates,
        // use heuristic: if (s <= currentWeekOfYear) and not paid => late
        const currentWeek = getWeekNumber(today);
        if (s <= currentWeek && p.estado !== 'PAGADO') badgeClass = 'late';
      }
      const span = document.createElement('span');
      span.className = `badge ${badgeClass}`;
      span.textContent = p.estado || 'PENDIENTE';
      status.appendChild(span);

      left.appendChild(num);
      left.appendChild(status);

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '8px';
      // show short info
      const info = document.createElement('div');
      info.style.fontSize = '13px';
      info.style.color = '#6b7280';
      info.innerHTML = p.valor ? `${formatCurrency(p.valor)} • ${p.nombre_pagador||''}` : '<small>Sin pago</small>';
      const btn = document.createElement('button');
      btn.className = 'btn secondary';
      btn.textContent = 'Registrar pago';
      btn.dataset.socioId = socioId;
      btn.dataset.semana = s;
      btn.dataset.pagoId = p.id || '';
      btn.addEventListener('click', () => openPagoModal(socioId, s, p));
      right.appendChild(info);
      right.appendChild(btn);

      card.appendChild(left);
      card.appendChild(right);
      semanasGrid.appendChild(card);
    }
  }

  // Helper to get week number (ISO)
  function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date - yearStart) / 86400000) + 1)/7);
  }

  function formatCurrency(v) {
    if (!v) return '$0';
    return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(Number(v));
  }

  // Open modal to register/edit payment
  function openPagoModal(socioId, semana, pagoObj) {
    // pagoObj may be empty skeleton
    p_socio_id.value = socioId;
    p_semana.value = semana;
    modalSemanaTitle.textContent = semana;
    p_pago_id.value = pagoObj && pagoObj.id ? pagoObj.id : '';
    p_fecha_pago.value = pagoObj && pagoObj.fecha_pago ? pagoObj.fecha_pago : '';
    p_forma_pago.value = pagoObj && pagoObj.forma_pago ? pagoObj.forma_pago : '';
    p_valor.value = pagoObj && pagoObj.valor ? pagoObj.valor : '';
    p_nombre_pagador.value = pagoObj && pagoObj.nombre_pagador ? pagoObj.nombre_pagador : '';
    p_firma_recibe.value = pagoObj && pagoObj.firma_recibe ? pagoObj.firma_recibe : '';
    p_estado.value = pagoObj && pagoObj.estado ? pagoObj.estado : 'PENDIENTE';

    modalPago.classList.remove('hidden');
  }

  modalPagoClose.addEventListener('click', () => modalPago.classList.add('hidden'));
  document.getElementById('btn-cancel-pago').addEventListener('click', () => modalPago.classList.add('hidden'));

  // Save pago
  formPago.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pagoId = p_pago_id.value;
    const socioId = p_socio_id.value;
    const body = {
      fecha_pago: p_fecha_pago.value || null,
      forma_pago: p_forma_pago.value || null,
      valor: p_valor.value || null,
      nombre_pagador: p_nombre_pagador.value || null,
      firma_recibe: p_firma_recibe.value || null,
      estado: p_estado.value || 'PENDIENTE',
      usuario: 'Admin'
    };

    try {
      if (!pagoId) {
        // In theory pagos deben existir (52 creadas al crear socio). si no, el backend necesita endpoint POST /api/pagos
        // fallback: intentar crear vía POST /api/pagos (si existe). Si no existe, mostrar error.
        const tryCreate = await fetch(`${API_BASE}/pagos`, {
          method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ socio_id: socioId, semana: p_semana.value, ...body })
        }).catch(()=>null);

        if (tryCreate && tryCreate.ok) {
          toast('Pago registrado');
        } else {
          // si no hay endpoint POST, intentamos buscar el pagoId recargando y encontrando id por semana
          const pagosRes = await fetch(`${API_BASE}/socios/${socioId}/pagos`);
          const pagosJson = await pagosRes.json();
          const pago = (pagosJson.pagos || []).find(px => String(px.semana) === String(p_semana.value));
          if (pago && pago.id) {
            // actualizar existente
            await fetch(`${API_BASE}/pagos/${pago.id}`, {
              method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
            });
            toast('Pago guardado');
          } else {
            toast('No fue posible crear el pago (falta endpoint POST /api/pagos)');
          }
        }
      } else {
        // actualizar existente
        const res = await fetch(`${API_BASE}/pagos/${pagoId}`, {
          method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
        });
        const j = await res.json();
        if (!j.ok) {
          toast(j.error || 'Error guardar pago');
          return;
        }
        toast('Pago guardado');
      }
      modalPago.classList.add('hidden');
      // refresh pagos
      await onSelectSocioForPayments();
    } catch (e) {
      console.error(e);
      toast('Error guardando pago');
    }
  });

  // ---------------------
  // RIFAS (simple lista)
  // ---------------------
  const formRifa = document.getElementById('form-rifa');
  const listaRifas = document.getElementById('lista-rifas');

  formRifa.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(formRifa).entries());
    try {
      const res = await fetch(`${API_BASE}/rifas`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.ok) { toast('Error creando rifa'); return; }
      toast('Rifa creada');
      formRifa.reset();
      loadRifas();
    } catch (err) { console.error(err); toast('Error rifas'); }
  });

  async function loadRifas() {
    try {
      const res = await fetch(`${API_BASE}/rifas`);
      const json = await res.json();
      const arr = json.rifas || [];
      listaRifas.innerHTML = arr.map(r => `<div class="rifa-item"><strong>${r.nombre}</strong> — ${r.fecha_evento}</div>`).join('');
    } catch (e) { console.error(e); }
  }

  // ---------------------
  // helper debounce
  // ---------------------
  function debounce(fn, wait=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

}); // DOMContentLoaded end
