    // ==================== DADOS ====================
    const STORAGE_KEY = 'Vem_pra_Quadra_v1';

    let chartTendencia = null;

    let db = {
      alunos: [],
      presencas: {},
      pagamentos: {},
      rotinaPadrao: null,
      rotinasAluno: {}
    };


    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    }
    function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

    // ==================== INICIALIZAÇÃO ====================
    function loadDB() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try { db = JSON.parse(raw); } catch(e) {}
      }
      // Garantir estrutura
      if (!Array.isArray(db.alunos)) db.alunos = [];
      if (!db.presencas || typeof db.presencas !== 'object') db.presencas = {};
      if (!db.pagamentos || typeof db.pagamentos !== 'object') db.pagamentos = {};
      if (!db.rotinasAluno || typeof db.rotinasAluno !== 'object') db.rotinasAluno = {};
      if (!Array.isArray(db.rotinaPadrao)) db.rotinaPadrao = rotinaInicial();
    }

    function saveDB() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) { console.error(e); toast('Não foi possível salvar. Exporte um backup e verifique o espaço do navegador.'); }
    }

    function uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function hoje() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function formatMoney(v) {
      return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDate(d) {
      if (!d) return '-';
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    }

    function mesNome(m) {
      const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      return nomes[parseInt(m) - 1] || m;
    }

    // ==================== NAVEGAÇÃO ====================
    function goTo(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('page-' + page).classList.add('active');
      document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add('active');

      if (page === 'dashboard') renderDashboard();
      if (page === 'alunos') renderAlunos();
      if (page === 'presenca') {
        document.getElementById('presenca-data').value = hoje();
        document.getElementById('lista-presenca').innerHTML = '';
        document.getElementById('btn-salvar-presenca').style.display = 'none';
      }
      if (page === 'pagamentos') renderPagamentos();
      if (page === 'relatorios') {
        popularFiltrosRelatorio();
        renderRelatorioFrequencia();
      }
      if (page === 'rotina') renderRotina();
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => goTo(btn.dataset.page));
    });

    // ==================== MODAIS ====================
    function openModal(id) {
      document.getElementById(id).classList.add('show');
    }

    function closeModal(id) {
      document.getElementById(id).classList.remove('show');
    }

    // Fechar modal clicando fora
    document.querySelectorAll('.modal-overlay').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el) el.classList.remove('show');
      });
    });

    // ==================== TOAST ====================
    function toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }

    function baixarSistema() {
      const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sistema-ginastica.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      toast('Arquivo baixado');
    }

    // ==================== ALUNOS ====================
    function nomeTurma(valor) {
      const nomes = {
            'quarta-19:00': 'Quarta-feira • 19:15',
            'sexta-19:00': 'Sexta-feira • 19:15'};
      return nomes[valor] || '';
    }

    function chaveTurmaDaData(data, horario) {
      const dia = new Date(data + 'T12:00:00').getDay();
      if (dia === 3) return 'quarta-' + horario;
      if (dia === 5) return 'sexta-' + horario;
      return '';
    }

    function openModalAluno(id = null) {
      document.getElementById('aluno-id').value = id || '';
      document.getElementById('modal-aluno-titulo').textContent = id ? 'Editar Aluno' : 'Novo Aluno';

      if (id) {
        const a = db.alunos.find(x => x.id === id);
        if (!a) return;
        document.getElementById('aluno-nome').value = a.nome;
        document.getElementById('aluno-telefone').value = a.telefone || '';
        document.getElementById('aluno-turma').value = a.turma || '';
        document.getElementById('aluno-valor').value = a.valor ?? 50;
        document.getElementById('aluno-inicio').value = a.inicio || '';
        document.getElementById('aluno-obs').value = a.obs || '';
      } else {
        document.getElementById('aluno-nome').value = '';
        document.getElementById('aluno-telefone').value = '';
        document.getElementById('aluno-turma').value = '';
        document.getElementById('aluno-valor').value = 50;
        document.getElementById('aluno-inicio').value = hoje();
        document.getElementById('aluno-obs').value = '';
      }
      openModal('modal-aluno');
    }

    function salvarAluno() {
      const id = document.getElementById('aluno-id').value;
      const nome = document.getElementById('aluno-nome').value.trim();
      if (!nome) {
        toast('Informe o nome do aluno');
        return;
      }

      const turma = document.getElementById('aluno-turma').value;
      if (!turma) {
        toast('Selecione a turma do aluno');
        document.getElementById('aluno-turma').focus();
        return;
      }

      const dados = {
        id: id || uid(),
        nome,
        telefone: document.getElementById('aluno-telefone').value.trim(),
        turma,
        valor: Math.max(0, parseFloat(document.getElementById('aluno-valor').value) || 0),
        inicio: document.getElementById('aluno-inicio').value || hoje(),
        obs: document.getElementById('aluno-obs').value.trim(),
        ativo: true
      };

      if (id) {
        const idx = db.alunos.findIndex(x => x.id === id);
        if (idx >= 0) db.alunos[idx] = { ...db.alunos[idx], ...dados };
      } else {
        db.alunos.push(dados);
      }

      saveDB();
      closeModal('modal-aluno');
      renderAlunos();
      renderDashboard();
      toast(id ? 'Aluno atualizado' : 'Aluno cadastrado');
    }

    function excluirAluno(id) {
      if (!confirm('Tem certeza que deseja excluir este aluno?')) return;
      db.alunos = db.alunos.filter(x => x.id !== id);
      // Limpar presenças e pagamentos relacionados
      Object.keys(db.presencas).forEach(k => {
        db.presencas[k] = db.presencas[k].filter(aid => aid !== id);
      });
      Object.keys(db.pagamentos).forEach(k => {
        if (k.endsWith('|' + id)) delete db.pagamentos[k];
      });
      if (db.rotinasAluno) delete db.rotinasAluno[id];
      saveDB();
      renderAlunos();
      renderDashboard();
      toast('Aluno excluído');
    }

    function renderAlunos() {
      const container = document.getElementById('lista-alunos');
      const ativos = db.alunos.filter(a => a.ativo !== false);

      if (ativos.length === 0) {
        container.innerHTML = `
          <div class="empty">
            <div>Nenhum aluno cadastrado ainda.</div>
            <button class="btn btn-primary" style="margin-top:12px" onclick="openModalAluno()">Cadastrar primeiro aluno</button>
          </div>`;
        return;
      }

      container.innerHTML = ativos
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(a => `
          <div class="student-item">
            <div class="student-info">
              <strong>${a.nome}</strong>
              <span>${a.telefone || 'Sem telefone'} • ${formatMoney(a.valor)}/mês</span>
              <span>${nomeTurma(a.turma) || 'Turma não definida — edite o cadastro'}</span>
            </div>
            <div class="student-actions">
              <button class="btn btn-outline btn-sm" onclick="openModalAluno('${a.id}')">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="excluirAluno('${a.id}')">Excluir</button>
            </div>
          </div>
        `).join('');
    }

    // ==================== PRESENÇA ====================
    function carregarPresenca() {
      const data = document.getElementById('presenca-data').value;
      const turma = document.getElementById('presenca-turma').value;
      if (!data) {
        toast('Selecione a data');
        return;
      }

      // Verificar se é quarta ou sexta
      const d = new Date(data + 'T12:00:00');
      const dia = d.getDay(); // 0=dom, 3=qua, 5=sex
      if (dia !== 3 && dia !== 5) {
        if (!confirm('Atenção: esta data não é Quarta nem Sexta. Deseja continuar mesmo assim?')) {
          return;
        }
      }

      const chave = data + '|' + turma;
      const presentes = db.presencas[chave] || [];
      const chaveTurma = chaveTurmaDaData(data, turma);
      const ativos = db.alunos
        .filter(a => a.ativo !== false && (!a.turma || a.turma === chaveTurma))
        .sort((a,b) => a.nome.localeCompare(b.nome));

      const container = document.getElementById('lista-presenca');
      if (ativos.length === 0) {
        container.innerHTML = '<div class="empty">Cadastre alunos primeiro.</div>';
        document.getElementById('btn-salvar-presenca').style.display = 'none';
        return;
      }

      container.innerHTML = ativos.map(a => {
        const checked = presentes.includes(a.id) ? 'checked' : '';
        const cls = presentes.includes(a.id) ? 'present' : '';
        return `
          <div class="attendance-row ${cls}" id="row-${a.id}">
            <input type="checkbox" id="check-${a.id}" ${checked} onchange="togglePresencaVisual('${a.id}')" />
            <label for="check-${a.id}">${a.nome}</label>
          </div>
        `;
      }).join('');

      document.getElementById('btn-salvar-presenca').style.display = 'block';
    }

    function togglePresencaVisual(id) {
      const row = document.getElementById('row-' + id);
      const check = document.getElementById('check-' + id);
      if (check.checked) row.classList.add('present');
      else row.classList.remove('present');
    }

    function salvarPresenca() {
      const data = document.getElementById('presenca-data').value;
      const turma = document.getElementById('presenca-turma').value;
      const chave = data + '|' + turma;

      const presentes = [];
      db.alunos.filter(a => a.ativo !== false).forEach(a => {
        const check = document.getElementById('check-' + a.id);
        if (check && check.checked) presentes.push(a.id);
      });

      db.presencas[chave] = presentes;
      saveDB();
      toast(`Presença salva: ${presentes.length} aluno(s)`);
      renderDashboard();
    }

    // ==================== PAGAMENTOS ====================
    function popularFiltrosPagamento() {
      const mesSelect = document.getElementById('pagamento-mes');
      const anoSelect = document.getElementById('pagamento-ano');
      const agora = new Date();
      const mesAtual = agora.getMonth() + 1;
      const anoAtual = agora.getFullYear();

      mesSelect.innerHTML = '';
      for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = String(m).padStart(2, '0');
        opt.textContent = mesNome(m);
        if (m === mesAtual) opt.selected = true;
        mesSelect.appendChild(opt);
      }

      anoSelect.innerHTML = '';
      for (let a = anoAtual - 1; a <= anoAtual + 1; a++) {
        const opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a;
        if (a === anoAtual) opt.selected = true;
        anoSelect.appendChild(opt);
      }

      mesSelect.onchange = renderPagamentos;
      anoSelect.onchange = renderPagamentos;
    }

    function renderPagamentos() {
      const mes = document.getElementById('pagamento-mes').value;
      const ano = document.getElementById('pagamento-ano').value;
      const chaveMes = `${ano}-${mes}`;

      const container = document.getElementById('lista-pagamentos');
      const ativos = db.alunos.filter(a => a.ativo !== false).sort((a,b) => a.nome.localeCompare(b.nome));

      if (ativos.length === 0) {
        container.innerHTML = '<div class="empty">Nenhum aluno cadastrado.</div>';
        return;
      }

      container.innerHTML = ativos.map(a => {
        const chave = `${chaveMes}|${a.id}`;
        const pag = db.pagamentos[chave];
        const pago = !!pag;

        return `
          <div class="student-item">
            <div class="student-info">
              <strong>${a.nome}</strong>
              <span>
                ${pago 
                  ? `<span class="status-badge status-pago">Pago</span> ${formatMoney(pag.valor)} em ${formatDate(pag.data)}`
                  : `<span class="status-badge status-pendente">Pendente</span> ${formatMoney(a.valor)}`
                }
              </span>
            </div>
            <div class="student-actions">
              ${pago 
                ? `<button class="btn btn-outline btn-sm" onclick="gerarInforme('${a.id}', '${chaveMes}')">📄 Informe</button>
                   <button class="btn btn-success btn-sm" onclick="enviarWhatsApp('${a.id}', '${chaveMes}')" title="Enviar comprovante pelo WhatsApp">WhatsApp</button>
                   <button class="btn btn-danger btn-sm" onclick="desfazerPagamento('${chave}')">Desfazer</button>`
                : `<button class="btn btn-success btn-sm" onclick="abrirPagamento('${a.id}', '${chaveMes}')">Registrar</button>`
              }
            </div>
          </div>
        `;
      }).join('');
    }

    function abrirPagamento(alunoId, chaveMes) {
      const aluno = db.alunos.find(a => a.id === alunoId);
      if (!aluno) return;

      const [ano, mes] = chaveMes.split('-');
      document.getElementById('pag-aluno-id').value = alunoId;
      document.getElementById('pag-aluno-nome').value = aluno.nome;
      document.getElementById('pag-mes-ano').value = `${mesNome(mes)} / ${ano}`;
      document.getElementById('pag-valor').value = aluno.valor ?? 50;
      document.getElementById('pag-data').value = hoje();
      document.getElementById('pag-forma').value = 'Pix';
      document.getElementById('pag-obs').value = '';

      // Guardar o mês para o confirm
      document.getElementById('modal-pagamento').dataset.chaveMes = chaveMes;
      openModal('modal-pagamento');
    }

    function confirmarPagamento() {
      const alunoId = document.getElementById('pag-aluno-id').value;
      const chaveMes = document.getElementById('modal-pagamento').dataset.chaveMes;
      const chave = `${chaveMes}|${alunoId}`;

      const valor = parseFloat(document.getElementById('pag-valor').value) || 0;
      const data = document.getElementById('pag-data').value || hoje();
      const forma = document.getElementById('pag-forma').value;
      const obs = document.getElementById('pag-obs').value.trim();

      db.pagamentos[chave] = {
        valor,
        data,
        forma,
        obs,
        confirmadoEm: new Date().toISOString()
      };

      saveDB();
      closeModal('modal-pagamento');
      renderPagamentos();
      renderDashboard();
      toast('Pagamento registrado!');

      // Pergunta se quer enviar pelo WhatsApp
      const aluno = db.alunos.find(a => a.id === alunoId);
      if (aluno && aluno.telefone && confirm('Pagamento registrado!\n\nDeseja enviar o comprovante pelo WhatsApp agora?')) {
        enviarWhatsApp(alunoId, chaveMes);
      } else {
        // Gera o informe para impressão
        setTimeout(() => gerarInforme(alunoId, chaveMes), 300);
      }
    }

    function desfazerPagamento(chave) {
      if (!confirm('Desfazer este pagamento?')) return;
      delete db.pagamentos[chave];
      saveDB();
      renderPagamentos();
      renderDashboard();
      toast('Pagamento desfeito');
    }

    function gerarInforme(alunoId, chaveMes) {
      const aluno = db.alunos.find(a => a.id === alunoId);
      const chave = `${chaveMes}|${alunoId}`;
      const pag = db.pagamentos[chave];
      if (!aluno || !pag) {
        toast('Pagamento não encontrado');
        return;
      }

      const [ano, mes] = chaveMes.split('-');
      const agora = new Date();
      const dataEmissao = agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

      const html = `
        <div class="receipt">
          <div class="receipt-header">
            <h1>INFORME DE PAGAMENTO</h1>
            <p>Vem pra Quadra</p>
            <p>Quarta e Sexta • 19:15</p>
          </div>
          <div class="receipt-body">
            <div class="row"><span>Aluno(a):</span><strong>${aluno.nome}</strong></div>
            <div class="row"><span>Referente a:</span><strong>${mesNome(mes)} de ${ano}</strong></div>
            <div class="row"><span>Data do pagamento:</span><strong>${formatDate(pag.data)}</strong></div>
            <div class="row"><span>Forma de pagamento:</span><strong>${pag.forma}</strong></div>
            ${pag.obs ? `<div class="row"><span>Observação:</span><strong>${pag.obs}</strong></div>` : ''}
            <div class="receipt-value">${formatMoney(pag.valor)}</div>
            <p style="text-align:center; font-size:0.9rem; color:#64748b;">
              Pagamento confirmado referente às aulas de ginástica<br>
              (Quartas e sextas-feiras • 19:15)
            </p>
          </div>
          <div class="receipt-footer">
            <p>Documento gerado em ${dataEmissao}</p>
            <p style="margin-top:8px;">Obrigado pela confiança!</p>
          </div>
        </div>
      `;

      const printArea = document.getElementById('receipt-print');
      printArea.innerHTML = html;
      printArea.style.display = 'block';

      // Pequeno delay para garantir render
      setTimeout(() => {
        window.print();
        printArea.style.display = 'none';
      }, 200);
    }
    // ==================== WHATSAPP ====================
    function limparTelefone(tel) {
      if (!tel) return '';
      // Remove tudo que não for dígito
      let nums = tel.replace(/\D/g, '');
      // Se começar com 0, remove
      if (nums.startsWith('0')) nums = nums.slice(1);
      // Se não tiver DDI 55 e tiver 10 ou 11 dígitos, adiciona 55
      if (nums.length === 10 || nums.length === 11) {
        nums = '55' + nums;
      }
      return nums;
    }

    function montarMensagemPagamento(aluno, pag, chaveMes) {
      const [ano, mes] = chaveMes.split('-');
      const linhas = [
        `*INFORME DE PAGAMENTO*`,
        ``,
        `Olá, *${aluno.nome}*!`,
        ``,
        `Confirmamos o recebimento do pagamento das aulas de ginástica:`,
        ``,
        `• Referente a: *${mesNome(mes)} de ${ano}*`,
        `• Valor: *${formatMoney(pag.valor)}*`,
        `• Data do pagamento: ${formatDate(pag.data)}`,
        `• Forma: ${pag.forma}`,
      ];
      if (pag.obs) {
        linhas.push(`• Observação: ${pag.obs}`);
      }
      linhas.push(
        ``,
        `Aulas: Quartas-feiras e sextas-feiras • 19:15`,
        ``,
        `Obrigado pela confiança! 🤸`
      );
      return linhas.join('\n');
    }

    function enviarWhatsApp(alunoId, chaveMes) {
      const aluno = db.alunos.find(a => a.id === alunoId);
      const chave = `${chaveMes}|${alunoId}`;
      const pag = db.pagamentos[chave];

      if (!aluno || !pag) {
        toast('Pagamento não encontrado');
        return;
      }

      const telefone = limparTelefone(aluno.telefone);
      if (!telefone || telefone.length < 12) {
        toast('Cadastre um telefone válido no aluno para enviar pelo WhatsApp');
        // Abre o modal de edição do aluno
        openModalAluno(alunoId);
        return;
      }

      const mensagem = montarMensagemPagamento(aluno, pag, chaveMes);
      const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;

      // Abre o WhatsApp
      window.open(url, '_blank');
      toast('Abrindo WhatsApp...');
    }

    // ==================== RELATÓRIOS DE FREQUÊNCIA ====================
    function popularFiltrosRelatorio() {
      const mesSelect = document.getElementById('relatorio-mes');
      const anoSelect = document.getElementById('relatorio-ano');
      if (!mesSelect || mesSelect.options.length > 0) return; // já populado

      const agora = new Date();
      const mesAtual = agora.getMonth() + 1;
      const anoAtual = agora.getFullYear();

      for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = String(m).padStart(2, '0');
        opt.textContent = mesNome(m);
        if (m === mesAtual) opt.selected = true;
        mesSelect.appendChild(opt);
      }

      for (let a = anoAtual - 1; a <= anoAtual + 1; a++) {
        const opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a;
        if (a === anoAtual) opt.selected = true;
        anoSelect.appendChild(opt);
      }

      mesSelect.onchange = renderRelatorioFrequencia;
      anoSelect.onchange = renderRelatorioFrequencia;
      document.getElementById('relatorio-turma').onchange = renderRelatorioFrequencia;
    }

    function getDiasDeAulaNoMes(ano, mes) {
      // Retorna array de datas (YYYY-MM-DD) que são quarta ou sexta no mês
      const dias = [];
      const data = new Date(ano, mes - 1, 1);
      const ultimoDia = new Date(ano, mes, 0).getDate();

      for (let dia = 1; dia <= ultimoDia; dia++) {
        data.setDate(dia);
        const diaSemana = data.getDay(); // 3 = quarta, 5 = sexta
        if (diaSemana === 3 || diaSemana === 5) {
          const y = data.getFullYear();
          const m = String(data.getMonth() + 1).padStart(2, '0');
          const d = String(data.getDate()).padStart(2, '0');
          dias.push(`${y}-${m}-${d}`);
        }
      }
      return dias;
    }

    function calcularFrequenciaAluno(alunoId, ano, mes, filtroTurma) {
      const diasAula = getDiasDeAulaNoMes(parseInt(ano), parseInt(mes));
      const turmas = filtroTurma === 'todas' ? ['05:00', '19:00'] : [filtroTurma];
      const aluno = db.alunos.find(a => a.id === alunoId);

      let totalSessoes = 0;
      let presentes = 0;
      const detalhes = [];

      diasAula.forEach(data => {
        turmas.forEach(turma => {
          const chaveTurma = chaveTurmaDaData(data, turma);
          // Alunos com turma definida só entram no cálculo das aulas da própria turma.
          // Registros antigos sem turma continuam sendo considerados para não perder histórico.
          if (aluno && aluno.turma && aluno.turma !== chaveTurma) return;
          const chave = data + '|' + turma;
          totalSessoes++;
          const lista = db.presencas[chave] || [];
          const veio = lista.includes(alunoId);
          if (veio) presentes++;
          detalhes.push({ data, turma, veio });
        });
      });

      const percentual = totalSessoes > 0 ? Math.round((presentes / totalSessoes) * 100) : 0;
      return { totalSessoes, presentes, percentual, detalhes, diasAula };
    }

    function renderRelatorioFrequencia() {
      const mes = document.getElementById('relatorio-mes').value;
      const ano = document.getElementById('relatorio-ano').value;
      const turma = document.getElementById('relatorio-turma').value;

      const ativos = db.alunos.filter(a => a.ativo !== false);
      const diasAula = getDiasDeAulaNoMes(parseInt(ano), parseInt(mes));
      const numTurmas = turma === 'todas' ? 2 : 1;
      const totalSessoesPeriodo = diasAula.length * numTurmas;

      // Calcular frequência de cada aluno
      const ranking = ativos.map(a => {
        const freq = calcularFrequenciaAluno(a.id, ano, mes, turma);
        return {
          aluno: a,
          ...freq
        };
      }).sort((a, b) => b.percentual - a.percentual || b.presentes - a.presentes);

      // Estatísticas gerais
      document.getElementById('rel-aulas').textContent = totalSessoesPeriodo;

      let somaPercentual = 0;
      let totalPresencas = 0;
      ranking.forEach(r => {
        somaPercentual += r.percentual;
        totalPresencas += r.presentes;
      });

      const media = ranking.length > 0 ? Math.round(somaPercentual / ranking.length) : 0;
      document.getElementById('rel-media').textContent = media + '%';
      document.getElementById('rel-presentes').textContent = totalPresencas;

      if (ranking.length > 0 && ranking[0].percentual > 0) {
        document.getElementById('rel-melhor').textContent = ranking[0].percentual + '%';
      } else {
        document.getElementById('rel-melhor').textContent = '-';
      }

      // Lista / Ranking
      const container = document.getElementById('lista-frequencia');

      if (ranking.length === 0) {
        container.innerHTML = '<div class="empty">Nenhum aluno cadastrado.</div>';
        document.getElementById('analise-faltas').innerHTML = '<div class="empty">Dados insuficientes.</div>';
        if (chartTendencia) { chartTendencia.destroy(); chartTendencia = null; }
        const leg = document.getElementById('grafico-legenda');
        if (leg) leg.textContent = 'Sem dados.';
        return;
      }

      if (totalSessoesPeriodo === 0) {
        container.innerHTML = '<div class="empty">Nenhuma aula de quarta ou sexta neste mês.</div>';
        document.getElementById('analise-faltas').innerHTML = '<div class="empty">Dados insuficientes.</div>';
        if (chartTendencia) { chartTendencia.destroy(); chartTendencia = null; }
        const leg = document.getElementById('grafico-legenda');
        if (leg) leg.textContent = 'Sem dados.';
        return;
      }

      container.innerHTML = ranking.map((r, index) => {
        const corBarra = r.percentual >= 80 ? 'var(--success)' : r.percentual >= 50 ? 'var(--warning)' : 'var(--danger)';
        const medalha = index === 0 && r.percentual > 0 ? '🥇 ' : index === 1 && r.percentual > 0 ? '🥈 ' : index === 2 && r.percentual > 0 ? '🥉 ' : '';
        return `
          <button class="ranking-item" type="button" onclick="mostrarDetalheAluno('${escapeAttr(r.aluno.id)}', '${ano}', '${mes}', '${turma}')" aria-label="Ver detalhes de ${escapeAttr(r.aluno.nome)}">
            <span class="ranking-position">${medalha || (index + 1 + '.')}</span>
            <span class="ranking-main"><strong>${escapeHtml(r.aluno.nome)}</strong><span>${r.presentes} de ${r.totalSessoes} presenças · ${r.totalSessoes-r.presentes} faltas</span><span class="progress-track"><span style="width:${r.percentual}%;background:${corBarra}"></span></span></span>
            <strong class="ranking-percent">${r.percentual}%</strong>
          </button>`;
      }).join('');

      renderGraficoTendencia(ano, mes, turma);
      renderAnaliseFaltas(ano, mes, turma, ranking);
    }

    function renderGraficoTendencia(ano, mes, turma) {
      const canvas = document.getElementById('grafico-tendencia');
      const legenda = document.getElementById('grafico-legenda');
      if (!canvas || typeof Chart === 'undefined') {
        if (legenda) legenda.textContent = 'Gráfico indisponível: verifique sua conexão com a internet.';
        return;
      }
      const meses = [];
      const base = new Date(Number(ano), Number(mes)-1, 1);
      for (let i=5; i>=0; i--) {
        const d = new Date(base.getFullYear(), base.getMonth()-i, 1);
        meses.push({ano:d.getFullYear(), mes:d.getMonth()+1, label:d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})});
      }
      const ativos = db.alunos.filter(a => a.ativo !== false);
      const valores = meses.map(item => {
        const dias = getDiasDeAulaNoMes(item.ano,item.mes);
        const turmas = turma === 'todas' ? ['05:00','19:00'] : [turma];
        let possiveis=0, presencas=0;
        dias.forEach(data => turmas.forEach(hora => {
          const lista=db.presencas[data+'|'+hora] || [];
          ativos.forEach(a => { possiveis++; if (lista.includes(a.id)) presencas++; });
        }));
        return possiveis ? Math.round(presencas/possiveis*100) : 0;
      });
      if (chartTendencia) chartTendencia.destroy();
      chartTendencia = new Chart(canvas, {
        type:'line',
        data:{labels:meses.map(m=>m.label),datasets:[{label:'Frequência média',data:valores,tension:.3,fill:true,borderWidth:3,pointRadius:4,backgroundColor:'rgba(13,148,136,.12)',borderColor:'#0f766e'}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.parsed.y}%`}}},scales:{y:{beginAtZero:true,max:100,ticks:{callback:v=>v+'%'}}}}
      });
      if (legenda) legenda.textContent='Percentual de presenças dos alunos ativos nos últimos seis meses.';
    }

    function renderAnaliseFaltas(ano, mes, filtroTurma, ranking) {
      const container = document.getElementById('analise-faltas');
      const diasAula = getDiasDeAulaNoMes(parseInt(ano), parseInt(mes));
      const turmas = filtroTurma === 'todas' ? ['19:15'] : [filtroTurma];

      if (diasAula.length === 0 || ranking.length === 0) {
        container.innerHTML = '<div class="empty">Dados insuficientes para análise.</div>';
        return;
      }

      // 1. Faltas por horário (Quarta/Sexta × 19:15h)
      const faltasPorSlot = {};
      const totalPorSlot = {};
      const slots = [];

      diasAula.forEach(data => {
        const d = new Date(data + 'T12:00:00');
        const diaNome = d.getDay() === 3 ? 'Quarta' : 'Sexta';
        turmas.forEach(turma => {
          const slotKey = `${diaNome} ${turma}`;
          if (!faltasPorSlot[slotKey]) {
            faltasPorSlot[slotKey] = 0;
            totalPorSlot[slotKey] = 0;
            slots.push(slotKey);
          }
          const chave = data + '|' + turma;
          const presentes = db.presencas[chave] || [];
          const ativosIds = ranking.map(r => r.aluno.id);
          const faltasNessaAula = ativosIds.filter(id => !presentes.includes(id)).length;
          faltasPorSlot[slotKey] += faltasNessaAula;
          totalPorSlot[slotKey] += ativosIds.length;
        });
      });

      // Ordenar slots por taxa de falta
      const slotsOrdenados = slots.map(s => ({
        nome: s,
        faltas: faltasPorSlot[s],
        total: totalPorSlot[s],
        taxa: totalPorSlot[s] > 0 ? Math.round((faltasPorSlot[s] / totalPorSlot[s]) * 100) : 0
      })).sort((a, b) => b.taxa - a.taxa);

      // 2. Alunos com mais faltas
      const maisFaltosos = [...ranking]
        .map(r => ({
          nome: r.aluno.nome,
          id: r.aluno.id,
          faltas: r.totalSessoes - r.presentes,
          total: r.totalSessoes,
          percentualFalta: r.totalSessoes > 0 ? Math.round(((r.totalSessoes - r.presentes) / r.totalSessoes) * 100) : 0
        }))
        .filter(r => r.faltas > 0)
        .sort((a, b) => b.faltas - a.faltas || b.percentualFalta - a.percentualFalta)
        .slice(0, 5);

      // 3. Detectar padrão de horário preferido de falta por aluno
      const padroesIndividuais = [];
      ranking.forEach(r => {
        if (r.totalSessoes === 0) return;
        const faltasPorTurma = { '19:15': 0 };
        const totalPorTurma = { '19:15': 0 };

        r.detalhes.forEach(d => {
          totalPorTurma[d.turma] = (totalPorTurma[d.turma] || 0) + 1;
          if (!d.veio) faltasPorTurma[d.turma] = (faltasPorTurma[d.turma] || 0) + 1;
        });

        const taxa19 = totalPorTurma['19:15'] > 0 ? faltasPorTurma['19:15'] / totalPorTurma['19:15'] : 0;

        // Só destaca se tiver diferença significativa e pelo menos 2 faltas
        const totalFaltas = (faltasPorTurma['05:00'] || 0) + (faltasPorTurma['19:00'] || 0);
        if (totalFaltas >= 2) {
          if (taxa05 >= 0.6 && taxa05 - taxa19 >= 0.3) {
            padroesIndividuais.push({
              nome: r.aluno.nome,
              padrao: 'Falta mais na turma das 05:00',
              detalhe: `${faltasPorTurma['05:00']} faltas de manhã vs ${faltasPorTurma['19:15'] || 0} à noite`
            });
          } else if (taxa19 >= 0.6 && taxa19 - taxa05 >= 0.3) {
            padroesIndividuais.push({
              nome: r.aluno.nome,
              padrao: 'Falta mais na turma das 19:15',
              detalhe: `${faltasPorTurma['19:15']} faltas à noite vs ${faltasPorTurma['05:00'] || 0} de manhã`
            });
          }
        }
      });

      // 4. Faltas consecutivas (sequência atual)
      const sequencias = [];
      ranking.forEach(r => {
        const ordenados = [...r.detalhes].sort((a, b) => b.data.localeCompare(a.data) || b.turma.localeCompare(a.turma));
        let consecutivas = 0;
        for (const d of ordenados) {
          if (!d.veio) consecutivas++;
          else break;
        }
        if (consecutivas >= 2) {
          sequencias.push({
            nome: r.aluno.nome,
            consecutivas,
            id: r.aluno.id
          });
        }
      });
      sequencias.sort((a, b) => b.consecutivas - a.consecutivas);

      // Montar HTML
      let html = '';

      html += `<div style="margin-bottom: 20px;">
        <h3 style="font-size: 0.9rem; color: var(--muted); margin-bottom: 10px;">📅 Horários com mais faltas</h3>`;

      if (slotsOrdenados.length === 0) {
        html += `<p style="color: var(--muted); font-size: 0.9rem;">Sem dados.</p>`;
      } else {
        html += slotsOrdenados.map(s => {
          const cor = s.taxa >= 40 ? 'var(--danger)' : s.taxa >= 25 ? 'var(--warning)' : 'var(--success)';
          return `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <div style="min-width: 110px; font-weight: 600; font-size: 0.9rem;">${escapeHtml(s.nome)}</div>
              <div style="flex: 1; background: #e2e8f0; border-radius: 6px; height: 10px; overflow: hidden;">
                <div style="width: ${s.taxa}%; height: 100%; background: ${cor};"></div>
              </div>
              <div style="min-width: 70px; text-align: right; font-size: 0.85rem; color: ${cor}; font-weight: 700;">
                ${s.taxa}% falta
              </div>
            </div>`;
        }).join('');
      }
      html += `</div>`;

      html += `<div style="margin-bottom: 20px;">
        <h3 style="font-size: 0.9rem; color: var(--muted); margin-bottom: 10px;">⚠️ Alunos com mais faltas</h3>`;

      if (maisFaltosos.length === 0) {
        html += `<p style="color: var(--success); font-size: 0.9rem;">Nenhuma falta registrada no período. Ótimo!</p>`;
      } else {
        html += maisFaltosos.map((f, i) => `
          <div class="student-item" style="padding: 10px 0;">
            <div class="student-info">
              <strong>${i + 1}. ${escapeHtml(f.nome)}</strong>
              <span>${f.faltas} falta${f.faltas > 1 ? 's' : ''} de ${f.total} aulas (${f.percentualFalta}%)</span>
            </div>
          </div>
        `).join('');
      }
      html += `</div>`;

      if (padroesIndividuais.length > 0) {
        html += `<div style="margin-bottom: 20px;">
          <h3 style="font-size: 0.9rem; color: var(--muted); margin-bottom: 10px;">🎯 Padrões por horário</h3>`;
        html += padroesIndividuais.map(p => `
          <div style="background: #fef3c7; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
            <strong>${escapeHtml(p.nome)}</strong><br>
            <span style="font-size: 0.85rem;">${p.padrao}</span><br>
            <span style="font-size: 0.8rem; color: var(--muted);">${p.detalhe}</span>
          </div>
        `).join('');
        html += `</div>`;
      }

      if (sequencias.length > 0) {
        html += `<div style="margin-bottom: 12px;">
          <h3 style="font-size: 0.9rem; color: var(--muted); margin-bottom: 10px;">📉 Faltas consecutivas (mais recentes)</h3>`;
        html += sequencias.map(s => `
          <div style="background: #fee2e2; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
            <strong>${escapeHtml(s.nome)}</strong>
            <span style="font-size: 0.85rem;"> — ${s.consecutivas} falta${s.consecutivas > 1 ? 's' : ''} seguida${s.consecutivas > 1 ? 's' : ''}</span>
          </div>
        `).join('');
        html += `</div>`;
      }

      const insights = [];
      if (slotsOrdenados.length > 0 && slotsOrdenados[0].taxa >= 30) {
        insights.push(`O horário <strong>${slotsOrdenados[0].nome}</strong> concentra mais faltas (${slotsOrdenados[0].taxa}%).`);
      }
      if (maisFaltosos.length > 0) {
        insights.push(`<strong>${escapeHtml(maisFaltosos[0].nome)}</strong> é quem mais faltou (${maisFaltosos[0].faltas} faltas).`);
      }
      if (sequencias.length > 0) {
        insights.push(`${sequencias.length} aluno${sequencias.length > 1 ? 's' : ''} com faltas consecutivas recentes.`);
      }
      if (padroesIndividuais.length > 0) {
        insights.push(`${padroesIndividuais.length} aluno${padroesIndividuais.length > 1 ? 's' : ''} com padrão claro de falta em um horário específico.`);
      }

      if (insights.length > 0) {
        html = `
          <div style="background: var(--primary-light); border-radius: 10px; padding: 14px; margin-bottom: 20px;">
            <strong style="color: var(--primary-dark);">💡 Insights do período</strong>
            <ul style="margin: 8px 0 0 18px; font-size: 0.9rem;">
              ${insights.map(i => `<li style="margin-bottom: 4px;">${i}</li>`).join('')}
            </ul>
          </div>
        ` + html;
      } else if (maisFaltosos.length === 0) {
        html = `
          <div style="background: #dcfce7; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
            <strong style="color: #15803d;">✅ Excelente!</strong>
            <p style="margin: 6px 0 0; font-size: 0.9rem;">Nenhum padrão de falta relevante detectado neste período.</p>
          </div>
        ` + html;
      }

      container.innerHTML = html;
    }

    function mostrarDetalheAluno(alunoId, ano, mes, turma) {
      const aluno = db.alunos.find(a => a.id === alunoId);
      if (!aluno) return;

      const freq = calcularFrequenciaAluno(alunoId, ano, mes, turma);
      const card = document.getElementById('detalhe-aluno-card');
      const conteudo = document.getElementById('detalhe-aluno-conteudo');

      document.getElementById('detalhe-aluno-nome').textContent = aluno.nome;

      const porData = {};
      freq.detalhes.forEach(d => {
        if (!porData[d.data]) porData[d.data] = [];
        porData[d.data].push(d);
      });

      let html = `
        <div style="margin-bottom: 16px;">
          <div class="stats" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="stat-card">
              <div class="value">${freq.percentual}%</div>
              <div class="label">Frequência</div>
            </div>
            <div class="stat-card">
              <div class="value">${freq.presentes}</div>
              <div class="label">Presenças</div>
            </div>
            <div class="stat-card">
              <div class="value">${freq.totalSessoes - freq.presentes}</div>
              <div class="label">Faltas</div>
            </div>
          </div>
        </div>
        <h3 style="font-size: 0.95rem; margin-bottom: 10px; color: var(--muted);">Histórico do período</h3>
      `;

      const datasOrdenadas = Object.keys(porData).sort().reverse();

      if (datasOrdenadas.length === 0) {
        html += '<div class="empty">Nenhum registro neste período.</div>';
      } else {
        html += datasOrdenadas.map(data => {
          const sessoes = porData[data];
          const dataFormatada = formatDate(data);
          const diaSemana = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' });

          const itens = sessoes.map(s => {
            const status = s.veio
              ? '<span class="status-badge status-pago">Presente</span>'
              : '<span class="status-badge status-pendente">Faltou</span>';
            return `<div style="display: flex; justify-content: space-between; padding: 6px 0;">
                      <span>${s.turma}</span>
                      ${status}
                    </div>`;
          }).join('');

          return `
            <div style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
              <div style="font-weight: 600; margin-bottom: 6px;">${diaSemana} • ${dataFormatada}</div>
              ${itens}
            </div>
          `;
        }).join('');
      }

      conteudo.innerHTML = html;
      card.style.display = 'block';
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function fecharDetalheAluno() {
      document.getElementById('detalhe-aluno-card').style.display = 'none';
    }

    // ==================== ROTINA ====================
    function rotinaInicial() {
      return [
        { id: uid(), nome: 'Aquecimento', series: '1', reps: '3 min', obs: 'Caminhada no lugar' },
        { id: uid(), nome: 'Mobilidade articular', series: '2', reps: '8', obs: 'Quadril, ombros e tornozelos' },
        { id: uid(), nome: 'Agachamento', series: '3', reps: '12', obs: '' },
        { id: uid(), nome: 'Afundo', series: '3', reps: '10 cada perna', obs: '' },
        { id: uid(), nome: 'Prancha', series: '3', reps: '30 s', obs: '' },
        { id: uid(), nome: 'Alongamento', series: '1', reps: '5 min', obs: 'Final da aula' }
      ];
    }

    function limparFormExercicio() {
      document.getElementById('ex-id').value = '';
      document.getElementById('ex-nome').value = '';
      document.getElementById('ex-series').value = '';
      document.getElementById('ex-reps').value = '';
      document.getElementById('ex-obs').value = '';
      document.getElementById('form-exercicio-titulo').textContent = 'Novo exercício';
    }

    function alvoRotina() {
      const sel = document.getElementById('rotina-alvo');
      return sel ? sel.value : 'turma';
    }

    function popularAlvoRotina() {
      const sel = document.getElementById('rotina-alvo');
      const atual = sel.value || 'turma';
      const ativos = db.alunos.filter(a => a.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome));
      sel.innerHTML = '<option value="turma">Rotina da turma (todos)</option>' +
        ativos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
      if ([...sel.options].some(o => o.value === atual)) sel.value = atual;
    }

    function rotinaDoAlunoExiste(id) {
      return Array.isArray(db.rotinasAluno[id]);
    }

    function listaRotinaEditavel() {
      const alvo = alvoRotina();
      if (alvo === 'turma') return db.rotinaPadrao;
      if (!rotinaDoAlunoExiste(alvo)) return null;
      return db.rotinasAluno[alvo];
    }

    function definirListaRotina(lista) {
      const alvo = alvoRotina();
      if (alvo === 'turma') db.rotinaPadrao = lista;
      else db.rotinasAluno[alvo] = lista;
    }

    function trocarAlvoRotina() {
      limparFormExercicio();
      renderRotina();
    }

    function personalizarRotinaAluno() {
      const id = alvoRotina();
      if (id === 'turma') return;
      db.rotinasAluno[id] = db.rotinaPadrao.map(ex => ({ ...ex, id: uid() }));
      saveDB();
      limparFormExercicio();
      renderRotina();
      toast('Rotina personalizada criada');
    }

    function voltarRotinaDaTurma() {
      const id = alvoRotina();
      if (id === 'turma') return;
      if (!confirm('Apagar a rotina personalizada e voltar a usar a da turma?')) return;
      delete db.rotinasAluno[id];
      saveDB();
      limparFormExercicio();
      renderRotina();
      toast('Aluno voltou para a rotina da turma');
    }

    function salvarExercicio() {
      const lista = listaRotinaEditavel();
      if (!lista) {
        toast('Personalize a rotina deste aluno antes de editar');
        return;
      }
      const nome = document.getElementById('ex-nome').value.trim();
      if (!nome) {
        toast('Informe o nome do exercício');
        return;
      }
      const dados = {
        nome,
        series: document.getElementById('ex-series').value.trim(),
        reps: document.getElementById('ex-reps').value.trim(),
        obs: document.getElementById('ex-obs').value.trim()
      };
      const id = document.getElementById('ex-id').value;
      if (id) {
        const idx = lista.findIndex(x => x.id === id);
        if (idx >= 0) lista[idx] = { ...lista[idx], ...dados };
      } else {
        lista.push({ id: uid(), ...dados });
      }
      definirListaRotina(lista);
      saveDB();
      limparFormExercicio();
      renderRotina();
      toast(id ? 'Exercício atualizado' : 'Exercício adicionado');
    }

    function editarExercicio(id) {
      const lista = listaRotinaEditavel();
      if (!lista) return;
      const ex = lista.find(x => x.id === id);
      if (!ex) return;
      document.getElementById('ex-id').value = ex.id;
      document.getElementById('ex-nome').value = ex.nome;
      document.getElementById('ex-series').value = ex.series || '';
      document.getElementById('ex-reps').value = ex.reps || '';
      document.getElementById('ex-obs').value = ex.obs || '';
      document.getElementById('form-exercicio-titulo').textContent = 'Editar exercício';
      document.getElementById('card-form-exercicio').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function removerExercicio(id) {
      const lista = listaRotinaEditavel();
      if (!lista) return;
      if (!confirm('Remover este exercício da rotina?')) return;
      definirListaRotina(lista.filter(x => x.id !== id));
      saveDB();
      if (document.getElementById('ex-id').value === id) limparFormExercicio();
      renderRotina();
    }

    function moverExercicio(id, dir) {
      const lista = listaRotinaEditavel();
      if (!lista) return;
      const idx = lista.findIndex(x => x.id === id);
      const novo = idx + dir;
      if (idx < 0 || novo < 0 || novo >= lista.length) return;
      const item = lista.splice(idx, 1)[0];
      lista.splice(novo, 0, item);
      definirListaRotina(lista);
      saveDB();
      renderRotina();
    }

    function htmlExercicio(ex, i, total, editavel) {
      const meta = [ex.series ? `${ex.series} séries` : '', ex.reps || ''].filter(Boolean).join(' · ');
      const acoes = editavel ? `
        <div class="student-actions">
          <button class="btn btn-outline btn-sm" type="button" onclick="moverExercicio('${ex.id}', -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-outline btn-sm" type="button" onclick="moverExercicio('${ex.id}', 1)" ${i === total - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-outline btn-sm" type="button" onclick="editarExercicio('${ex.id}')">Editar</button>
          <button class="btn btn-danger btn-sm" type="button" onclick="removerExercicio('${ex.id}')">Excluir</button>
        </div>` : '';
      return `
        <div class="student-item" style="align-items:flex-start;">
          <div class="student-info">
            <strong>${i + 1}. ${ex.nome}</strong>
            <span>${meta || 'Sem séries definidas'}${ex.obs ? ' · ' + ex.obs : ''}</span>
          </div>
          ${acoes}
        </div>`;
    }

    function renderRotina() {
      popularAlvoRotina();
      const alvo = alvoRotina();
      const status = document.getElementById('rotina-status');
      const acoes = document.getElementById('rotina-acoes');
      const listaEl = document.getElementById('lista-exercicios');
      const formCard = document.getElementById('card-form-exercicio');

      let lista;
      let editavel = true;
      if (alvo === 'turma') {
        lista = db.rotinaPadrao;
        status.textContent = 'Esta rotina vale para todos os alunos que não tiverem uma rotina própria.';
        acoes.innerHTML = '';
      } else if (!rotinaDoAlunoExiste(alvo)) {
        lista = db.rotinaPadrao;
        editavel = false;
        const aluno = db.alunos.find(a => a.id === alvo);
        status.textContent = (aluno ? aluno.nome : 'Este aluno') + ' ainda usa a rotina da turma.';
        acoes.innerHTML = '<button class="btn btn-primary btn-sm" type="button" onclick="personalizarRotinaAluno()">Personalizar para este aluno</button>';
      } else {
        lista = db.rotinasAluno[alvo];
        status.textContent = 'Rotina personalizada. As mudanças valem só para este aluno.';
        acoes.innerHTML = '<button class="btn btn-outline btn-sm" type="button" onclick="voltarRotinaDaTurma()">Voltar para a rotina da turma</button>';
      }

      formCard.style.display = editavel ? 'block' : 'none';

      if (!lista || lista.length === 0) {
        listaEl.innerHTML = '<div class="empty">Nenhum exercício nesta rotina.</div>';
        return;
      }
      listaEl.innerHTML = lista.map((ex, i) => htmlExercicio(ex, i, lista.length, editavel)).join('');
    }

    // ==================== DASHBOARD ====================
    function renderDashboard() {
      const ativos = db.alunos.filter(a => a.ativo !== false);
      document.getElementById('stat-alunos').textContent = ativos.length;

      // Presentes hoje
      const hojeStr = hoje();
      const manha = (db.presencas[hojeStr + '|05:00'] || []).length;
      const noite = (db.presencas[hojeStr + '|19:00'] || []).length;
      document.getElementById('stat-hoje').textContent = manha + noite;

      // Pagamentos do mês atual
      const agora = new Date();
      const chaveMes = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}`;
      let pagos = 0;
      let pendentes = 0;
      ativos.forEach(a => {
        if (db.pagamentos[`${chaveMes}|${a.id}`]) pagos++;
        else pendentes++;
      });
      document.getElementById('stat-pagos').textContent = pagos;
      document.getElementById('stat-pendentes').textContent = pendentes;

      // Turmas fixas: quarta e sexta, às 05:00 e 19:00
      const container = document.getElementById('proximas-aulas');
      const turmas = [
        { chave: 'quarta-05:00', dia: 'Quarta-feira', hora: '05:00' },
        { chave: 'quarta-19:00', dia: 'Quarta-feira', hora: '19:00' },
        { chave: 'sexta-05:00', dia: 'Sexta-feira', hora: '05:00' },
        { chave: 'sexta-19:00', dia: 'Sexta-feira', hora: '19:00' }
      ];
      container.innerHTML = `
        <div class="student-list">
          ${turmas.map(t => {
            const quantidade = ativos.filter(a => a.turma === t.chave).length;
            return `
              <div class="student-item">
                <div class="student-info">
                  <strong>${t.dia} • ${t.hora}</strong>
                  <span>${quantidade} aluno${quantidade === 1 ? '' : 's'} matriculado${quantidade === 1 ? '' : 's'}</span>
                </div>
                <span class="status-badge">${t.hora === '05:00' ? 'Manhã' : 'Noite'}</span>
              </div>`;
          }).join('')}
        </div>
      `;
    }


    // ==================== BACKUP / RESTAURAÇÃO ====================
    function exportarBackup() {
      const payload = { app:'Vem pra Quadra', versao:1, exportadoEm:new Date().toISOString(), dados:db };
      const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`backup-vem-pra-quadra-${hoje()}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast('Backup exportado com sucesso');
    }
    function importarBackup(input) {
      const file = input.files && input.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const dados = parsed.dados || parsed;
          if (!dados || !Array.isArray(dados.alunos) || typeof dados.presencas !== 'object' || typeof dados.pagamentos !== 'object') throw new Error('Formato inválido');
          if (!confirm(`O backup contém ${dados.alunos.length} aluno(s). Deseja substituir os dados atuais? Faça um backup antes, se necessário.`)) { input.value=''; return; }
          db = { alunos:dados.alunos, presencas:dados.presencas||{}, pagamentos:dados.pagamentos||{}, rotinaPadrao:Array.isArray(dados.rotinaPadrao)?dados.rotinaPadrao:rotinaInicial(), rotinasAluno:dados.rotinasAluno||{} };
          saveDB(); renderDashboard(); renderAlunos(); popularFiltrosRelatorio(); toast('Backup restaurado com sucesso');
        } catch(e) { alert('Não foi possível importar. Selecione um backup JSON válido do Vem pra Quadra.'); }
        input.value='';
      };
      reader.onerror=()=>{ alert('Erro ao ler o arquivo.'); input.value=''; };
      reader.readAsText(file);
    }

    // ==================== START ====================
    loadDB();
    popularFiltrosPagamento();
    popularFiltrosRelatorio();
    renderDashboard();

    // Ajustar data de início padrão no modal
    document.getElementById('aluno-inicio').value = hoje();
