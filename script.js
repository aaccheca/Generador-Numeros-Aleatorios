(function(){
  const $ = id => document.getElementById(id);
  const aInput = $('a');
  const cInput = $('c');
  const seedInput = $('seed');
  const nInput = $('n');
  const mSelect = $('mSelect');
  const mInfo = $('mInfo');
  const generateBtn = $('generate');
  const resetBtn = $('reset');
  const messageDiv = $('message');
  const tableBody = document.querySelector('#resultsTable tbody');
  const ctx = document.getElementById('scatterChart').getContext('2d');

  const chart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'u_k (normalizado)',
        data: [],
        backgroundColor: 'rgba(43,108,176,0.9)',
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {title: {display:true, text:'Índice k'}, beginAtZero: true},
        y: {title: {display:true, text:'u_k'}, min: 0, max: 1}
      }
    }
  });

  let lastX = null;
  let lastM = null;
  const exportBtn = document.getElementById('exportCsv');

  function populateMOptions(minG = 1, maxG = 14){
    if(!mSelect) return;
    mSelect.innerHTML = '';
    for(let g = minG; g <= maxG; g++){
      const val = Math.pow(2,g);
      const opt = document.createElement('option');
      opt.value = String(val);
      opt.textContent = `${val} (2^${g})`;
      mSelect.appendChild(opt);
    }
  }

  function nextPow2(n){
    if(!isFinite(n) || n < 1) return 2;
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  populateMOptions(1,14);
  if(mSelect){
    if(Array.from(mSelect.options).some(o=>o.value === '16')) mSelect.value = '';
    mInfo.textContent = `g = ${Math.log2(parseInt(mSelect.value,10))}`;
  }

  function showMessage(txt){ messageDiv.textContent = txt; }
  function clearMessage(){ messageDiv.textContent = ''; }
  function isIntegerString(s){ return /^-?\d+$/.test(String(s).trim()); }

  function validateInputs(m,a,c,seed,n){
    if(!isIntegerString(m) || !isIntegerString(a) || !isIntegerString(c) || !isIntegerString(seed) || !isIntegerString(n)){
      return 'Todos los parámetros deben ser enteros.';
    }
    m = parseInt(m,10);
    a = parseInt(a,10);
    c = parseInt(c,10);
    seed = parseInt(seed,10);
    n = parseInt(n,10);

    // New restriction: todos los parámetros deben ser > 0
    if(!(m > 1)) return 'El módulo m debe ser mayor que 1.';
    if(!(a > 0)) return 'El multiplicador a debe ser mayor que 0.';
    if(!(c > 0)) return 'El incremento c debe ser mayor que 0.';
    if(!(seed > 0 && seed < m)) return 'La semilla debe ser mayor que 0 y menor que m.';
    if(!(n > 0)) return 'La cantidad n debe ser mayor que 0.';
    return null;
  }

  function generateLCG(m,a,c,seed,n){
    const X = [];
    let x = seed;
    for(let k=0;k<n;k++){
      X.push(x);
      x = ( (a * x + c) % m + m ) % m; // manejo seguro negativo
    }
    return X;
  }

  function renderTable(X,m){
    tableBody.innerHTML = '';
    const frag = document.createDocumentFragment();
    for(let i=0;i<X.length;i++){
      const tr = document.createElement('tr');
      const tdIndex = document.createElement('td'); tdIndex.textContent = i;
      const tdX = document.createElement('td'); tdX.textContent = X[i];
      const tdU = document.createElement('td'); tdU.textContent = (X[i]/m).toFixed(6);
      tr.appendChild(tdIndex); tr.appendChild(tdX); tr.appendChild(tdU);
      frag.appendChild(tr);
    }
    tableBody.appendChild(frag);
  }

  function updateChart(X,m){
    const pts = X.map((x,i)=>({x:i,y: x / m}));
    chart.data.datasets[0].data = pts;
    chart.options.scales.x.min = 0;
    chart.options.scales.x.max = Math.max(10, X.length - 1);
    chart.update();
  }

  generateBtn.addEventListener('click', ()=>{
    clearMessage();
    const m = (mSelect ? mSelect.value : '16').toString().trim();
    const a = aInput.value.trim();
    const c = cInput.value.trim();
    const seed = seedInput.value.trim();
    const n = nInput.value.trim();

    const err = validateInputs(m,a,c,seed,n);
    if(err){ showMessage(err); return; }

    const mVal = parseInt(m,10);
    const nVal = parseInt(n,10);

    if(nVal > 100){
      const ok = confirm('Ha solicitado generar más de 100 números. ¿Desea continuar?');
      if(!ok){ showMessage('Generación cancelada por el usuario.'); return; }
    }

    const X = generateLCG(mVal, parseInt(a,10), parseInt(c,10), parseInt(seed,10), nVal);
    renderTable(X,mVal);
    updateChart(X,mVal);
    lastX = X.slice();
    lastM = mVal;
    if(exportBtn) exportBtn.disabled = false;
    showMessage('Generados ' + X.length + ' valores.');
  });

  resetBtn.addEventListener('click', ()=>{
    if(mSelect) { mSelect.value = ''; mInfo.textContent = `g = ${Math.log2(parseInt(mSelect.value,10))}`; }
    aInput.value = ''; cInput.value = ''; seedInput.value = ''; nInput.value = '';
    tableBody.innerHTML = '';
    chart.data.datasets[0].data = [];
    chart.update();
    clearMessage();
    lastX = null; lastM = null;
    if(exportBtn) exportBtn.disabled = true;
  });

  if(nInput && mSelect){
    nInput.addEventListener('input', ()=>{
      const nv = parseInt(nInput.value,10);
      if(!isNaN(nv) && nv > 0){
        const target = nextPow2(nv);
        // find smallest option >= target
        const opts = Array.from(mSelect.options).map(o=>parseInt(o.value,10)).sort((a,b)=>a-b);
        const pick = opts.find(v=>v >= target) || opts[opts.length-1];
        mSelect.value = String(pick);
        mInfo.textContent = `g = ${Math.log2(parseInt(mSelect.value,10))}`;
      } else {
        mInfo.textContent = '';
      }
    });
  }

  if(mSelect){
    mSelect.addEventListener('change', ()=>{
      mInfo.textContent = `g = ${Math.log2(parseInt(mSelect.value,10))}`;
    });
  }

  [mSelect,aInput,cInput,seedInput,nInput].forEach(inp=>{
    if(!inp) return;
    inp.addEventListener('keydown',(e)=>{ if(e.key === 'Enter'){ generateBtn.click(); } });
  });

  // Exportar CSV
  if(exportBtn){
    exportBtn.addEventListener('click', ()=>{
      if(!lastX || !Array.isArray(lastX) || lastX.length === 0) return;
      const rows = [];
      rows.push(['index','X_k','u_k']);
      for(let i=0;i<lastX.length;i++){
        const x = lastX[i];
        const u = (lastM ? (x / lastM) : 0).toFixed(6);
        rows.push([String(i), String(x), String(u)]);
      }
      const csvContent = rows.map(r => r.map(cell => '"'+cell.replace(/"/g,'""')+'"').join(',')).join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lcg_results.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
})();