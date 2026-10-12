/* Integração estática do Conecta Incentivos com o Supabase existente. */
(() => {
  'use strict';
  const cfg = window.CONECTA_CONFIG || {};
  const configured = cfg.supabaseUrl && cfg.supabasePublishableKey && !cfg.supabasePublishableKey.includes('COLE_AQUI');
  const client = configured && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey) : null;
  const money = n => Number(n || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const clean = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let currentProjectId = null;
  const alertError = e => alert(e?.message || String(e));
  const requireClient = () => { if (!client) { alert('Configure config.js com a chave publicável do Supabase. Consulte o README.'); return false; } return true; };
  window.projetosDB = [];
  // O HTML original usa uma variável lexical global (let): esvaziar a fonte original.
  projetosDB.length = 0;
  simuladorAportes = {};
  renderizarHome();
  renderizarCatalogo();

  async function loadProjects() {
    if (!client) { document.getElementById('grid-home-projetos').textContent = 'Configure a conexão com o Supabase para exibir projetos verificados.'; return; }
    const {data,error} = await client.from('projects')
      .select('id,title,description,category,official_reference,approved_limit,confirmed_raised,mechanism_id,incentive_mechanisms(name)')
      .eq('verification_status','verified').eq('publication_status','published').order('created_at',{ascending:false});
    if (error) { document.getElementById('grid-home-projetos').textContent = 'Não foi possível carregar os projetos.'; console.error(error); return; }
    projetosDB.length = 0;
    for (const p of data || []) projetosDB.push({
      id:p.id, titulo:clean(p.title), pronac:clean(p.official_reference || 'Não informado'),
      categoria:clean(p.category || 'Cultura'), mecanismo:clean(p.incentive_mechanisms?.name || 'Mecanismo'),
      valorTotal:money(p.approved_limit), valorNum:Number(p.approved_limit || 0),
      disponivel:money(Math.max(0,Number(p.approved_limit || 0)-Number(p.confirmed_raised || 0))),
      desc:clean(p.description), publico:'Consultar proponente', contrapartida:'A confirmar com o proponente'
    });
    renderizarHome();renderizarCatalogo();
  }
  // As funções de navegação originais podem referenciar bindings globais; substituir pelo nome global funciona no script clássico.
  const oldDetails = abrirDetalhes;
  abrirDetalhes = id => { currentProjectId=id; oldDetails(id); };

  const authSection = document.createElement('section');
  authSection.className='max-w-5xl mx-auto px-4 py-4';
  authSection.innerHTML=`<div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
    <strong class="text-sm">Acesso ao portal</strong><input id="auth-email" type="email" autocomplete="username" placeholder="E-mail" class="border rounded-lg p-2 text-sm" />
    <input id="auth-password" type="password" autocomplete="current-password" placeholder="Senha" class="border rounded-lg p-2 text-sm" />
    <button id="auth-login" class="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm">Entrar</button>
    <button id="auth-logout" class="border rounded-lg px-4 py-2 text-sm hidden">Sair</button>
    <button id="auth-admin" class="border rounded-lg px-4 py-2 text-sm hidden">Moderação</button>
    <span id="auth-status" class="text-xs text-slate-600" role="status">Não autenticado</span></div>
    <div id="admin-panel" class="hidden bg-white border rounded-xl p-5 mt-3"><h2 class="text-xl font-bold mb-3">Projetos aguardando moderação</h2><div id="admin-list"></div></div>`;
  document.querySelector('header').insertAdjacentElement('afterend',authSection);
  const el=id=>document.getElementById(id);
  async function refreshAuth() {
    if(!client)return;
    const {data:{user}}=await client.auth.getUser();
    el('auth-status').textContent=user?`Conectado: ${user.email}`:'Não autenticado';
    el('auth-logout').classList.toggle('hidden',!user);
    el('auth-login').classList.toggle('hidden',!!user);
    const {data:admin}=user?await client.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle():{data:null};
    el('auth-admin').classList.toggle('hidden',!admin);
    if(!admin)el('admin-panel').classList.add('hidden');
  }
  el('auth-login').onclick=async()=>{
    if(!requireClient())return;
    const {error}=await client.auth.signInWithPassword({email:el('auth-email').value.trim(),password:el('auth-password').value});
    if(error)return alertError(error);
    el('auth-password').value='';await refreshAuth();
  };
  el('auth-logout').onclick=async()=>{if(!client)return;await client.auth.signOut();await refreshAuth();};
  el('auth-admin').onclick=async()=>{el('admin-panel').classList.remove('hidden');await loadPending();};
  async function loadPending(){
    const {data,error}=await client.from('projects').select('id,title,official_reference,verification_status,publication_status').order('created_at',{ascending:false});
    if(error)return alertError(error);
    const root=el('admin-list');root.replaceChildren();
    for(const p of (data||[]).filter(x=>x.verification_status==='pending')){
      const div=document.createElement('div');div.className='border-t py-3 flex flex-wrap gap-2 items-center';
      const title=document.createElement('span');title.textContent=`${p.title} — ${p.official_reference||'sem referência'}`;title.className='flex-1';div.append(title);
      for(const [label,approve] of [['Aprovar e publicar',true],['Rejeitar',false]]){
        const btn=document.createElement('button');btn.textContent=label;btn.className='border rounded px-3 py-2 text-sm';
        btn.onclick=async()=>{if(!confirm(`${label}: ${p.title}?`))return;const {error}=await client.rpc('review_project',{p_project_id:p.id,p_approve:approve,p_publish:approve});if(error)return alertError(error);await loadPending();await loadProjects();};div.append(btn);
      }root.append(div);
    }
    if(!root.children.length)root.textContent='Nenhum projeto pendente.';
  }
  window.cadastrarNovoProjeto = async event => {
    event.preventDefault();if(!requireClient())return;
    const {data:{user}}=await client.auth.getUser();if(!user)return alert('Entre com uma conta de proponente antes de cadastrar.');
    const {data:memberships,error:me}=await client.from('memberships').select('organization_id,organizations!inner(account_role)').eq('user_id',user.id);
    if(me)return alertError(me);
    const membership=(memberships||[]).find(m=>m.organizations?.account_role==='proponente');
    if(!membership)return alert('Sua conta precisa estar vinculada a uma organização proponente. Crie-a no painel completo antes de cadastrar.');
    const {data:mechanisms,error:em}=await client.from('incentive_mechanisms').select('id,name').eq('active',true);
    if(em)return alertError(em);
    const selected=el('cad-mecanismo').value;
    const mechanism=mechanisms.find(m=>m.name===selected || (selected.includes('Rouanet')&&m.name.includes('Rouanet')));
    if(!mechanism)return alert('Mecanismo não disponível para novos cadastros.');
    const value=Number(el('cad-valor').value.replace(/\./g,'').replace(',','.'));
    if(!Number.isFinite(value)||value<=0)return alert('Informe um valor numérico válido.');
    const {error}=await client.from('projects').insert({organization_id:membership.organization_id,mechanism_id:mechanism.id,title:el('cad-titulo').value.trim(),official_reference:el('cad-pronac').value.trim(),category:el('cad-cat').value,description:el('cad-desc').value.trim(),approved_limit:value});
    if(error)return alertError(error);
    alert('Projeto enviado para análise. Ele não será exibido no catálogo até a verificação e publicação pela moderação.');event.target.reset();mudarTela('catalogo');
  };
  window.registrarIntencao=async()=>{
    if(!requireClient())return;
    if(!currentProjectId)return alert('Selecione um projeto primeiro.');
    const {data:{user}}=await client.auth.getUser();if(!user)return alert('Entre com sua conta de patrocinador.');
    const {data:memberships,error:me}=await client.from('memberships').select('organization_id,organizations!inner(account_role)').eq('user_id',user.id);
    if(me)return alertError(me);
    const membership=(memberships||[]).find(m=>m.organizations?.account_role==='patrocinador');
    if(!membership)return alert('Vincule sua conta a uma organização patrocinadora antes de registrar interesse.');
    const amount=Number(el('valor-aporte').value.replace(/\./g,'').replace(',','.'));
    if(!Number.isFinite(amount)||amount<=0)return alert('Informe um valor válido.');
    const {error}=await client.from('sponsorship_interests').insert({project_id:currentProjectId,sponsor_organization_id:membership.organization_id,amount});
    if(error)return alertError(error);
    alert('Interesse registrado. Isso não representa aporte confirmado.');el('valor-aporte').value='';
  };
  if(client){client.auth.onAuthStateChange(()=>setTimeout(refreshAuth,0));refreshAuth();loadProjects();}
})();
