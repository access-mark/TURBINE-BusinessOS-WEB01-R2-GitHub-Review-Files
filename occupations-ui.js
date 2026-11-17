(()=>{
  'use strict';
  const dataset=window.TURBINE_OCCUPATION_DATA;
  if(!dataset)return;
  const {roles,groups,stages,special}=dataset;
  const groupsById=Object.fromEntries(groups.map(x=>[x.id,x]));
  const stageById=Object.fromEntries(stages.map(x=>[x.id,x]));
  const byId=Object.fromEntries(roles.map(x=>[x.id,x]));
  const params=new URLSearchParams(window.location.search);
  const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
  const a=(label,href,cls)=>{const v=el('a',cls,label);v.href=href;return v};
  const curatedRoleIds=new Set(["accountant","architect","bookkeeper","business-consultant","car-mechanic","chief-executive-officer","cleaning-company-owner","commercial-farmer","construction-company-owner","dentist-practice-owner","electrician","estate-agent","garden-services-business-owner","gardener","hair-salon-owner","logistics-company-owner","managed-service-provider-owner","manufacturing-business-owner","marketing-agency-owner","mining-services-owner","nonprofit-director","plumber","property-manager","qse-finance-manager","qse-owner","real-estate-agency-owner","restaurant-owner","retail-store-owner","school-principal"]);
  const toProfile=(role,stage)=>curatedRoleIds.has(role.id)&&(!stage||stage==='all')?'roles/'+encodeURIComponent(role.id)+'.html':'occupation.html?role='+encodeURIComponent(role.id)+(stage&&stage!=='all'?'&stage='+encodeURIComponent(stage):'');
  const getStage=value=>stageById[value]||null;
  const getGroup=role=>groupsById[role.group];
  const parent=document.getElementById('directory-results');
  if(parent){
    const form=document.getElementById('role-search-form');
    const q=document.getElementById('role-query');
    const group=document.getElementById('role-group');
    const stage=document.getElementById('role-stage');
    const summary=document.getElementById('directory-count');
    const note=document.getElementById('directory-stage-note');
    const more=document.getElementById('role-more');
    const reset=document.getElementById('role-reset');
    for(const g of groups)group.add(new Option(g.title,g.id));
    for(const s of stages)stage.add(new Option(s.label,s.id));
    q.value=params.get('q')||'';
    group.value=groupsById[params.get('group')]?params.get('group'):'all';
    stage.value=stageById[params.get('stage')]?params.get('stage'):'all';
    let limit=36;
    const index=roles.map(role=>({
      role,
      name:fold(role.name),
      aliases:[...new Set((role.aliases||[]).map(fold))].filter(Boolean),
      area:fold(getGroup(role)?.title)
    }));
    function rank(entry,term){
      if(!term)return 1;
      if(entry.name===term)return 140;
      if(entry.aliases.includes(term))return 135;
      if(entry.name.startsWith(term+' '))return 115;
      if(entry.aliases.some(s=>s.startsWith(term)))return 106;
      if(entry.name.startsWith(term))return 100;
      if(entry.name.includes(term))return 90;
      if(entry.aliases.some(s=>s.includes(term)))return 85;
      const tokens=term.split(' ').filter(Boolean);
      const values=[entry.name,...entry.aliases];
      if(tokens.every(t=>values.some(s=>s.includes(t))))return 74;
      if(entry.area.includes(term))return 25;
      return 0;
    }
    function distance(a,b,max){
      if(Math.abs(a.length-b.length)>max)return max+1;
      let prev=Array.from({length:b.length+1},(_,i)=>i);
      for(let i=1;i<=a.length;i++){
        const curr=[i];let low=i;
        for(let j=1;j<=b.length;j++){
          const value=Math.min(curr[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
          curr[j]=value;if(value<low)low=value;
        }
        if(low>max)return max+1;
        prev=curr;
      }
      return prev[b.length];
    }
    function match(term){
      let results=index.map(entry=>({entry,score:rank(entry,term)})).filter(x=>x.score>0);
      let approximate=false;
      if(term.length>=4&&results.length===0){
        const allowed=term.length>=8?2:1;
        results=index.map(entry=>{
          let d=allowed+1;
          for(const x of [entry.name,...entry.aliases]){
            if(x.length<=44)d=Math.min(d,distance(x,term,allowed));
            if(d===0)break;
          }
          return {entry,score:d<=allowed?50-d*5:0};
        }).filter(x=>x.score>0);
        approximate=results.length>0;
      }
      results.sort((a,b)=>b.score-a.score||a.entry.name.localeCompare(b.entry.name));
      return {results,approximate};
    }
    const updateUrl=()=>{
      const p=new URLSearchParams();
      if(q.value.trim())p.set('q',q.value.trim());
      if(group.value!=='all')p.set('group',group.value);
      if(stage.value!=='all')p.set('stage',stage.value);
      const path=window.location.pathname;
      try{window.history.replaceState(null,'',path+(p.toString()?'?'+p.toString():''));}catch(_){/* Sandboxed previews may block history changes. */}
    };
    function addRole(role,query){
      const sector=getGroup(role),card=el('article','occupation-card');
      const kicker=el('div','occupation-category',sector.title),title=el('h3');
      title.append(a(role.name,toProfile(role,stage.value)));
      const desc=el('p',null,sector.scenario);
      card.append(kicker,title,desc);
      if(query&&role.aliases?.length){
        const alias=(role.aliases||[]).find(x=>fold(x)===query)||null;
        if(alias)card.append(el('p','occupation-alias','Also called: '+alias));
      }
      const links=el('div','occupation-actions');
      links.append(a('See a related working story →',toProfile(role,stage.value)));
      links.append(a('Industry or work area ↗',sector.link,'minor-link'));
      card.append(links);return card;
    }
    function suggestion(title,body,query,broader){
      const empty=el('div','directory-suggestions');
      empty.append(el('h3',null,title),el('p',null,body));
      const row=el('div','cta-row');
      row.append(a('Continue with my work →','my-business.html'+(query?'?occupation='+encodeURIComponent(query.slice(0,90)):''),'btn primary'));
      if(broader){
        const resetArea=el('button','btn ghost','Search every work area');resetArea.type='button';
        resetArea.addEventListener('click',()=>{group.value='all';render();});row.append(resetArea);
      }else row.append(a('Explore industries ↗','industries.html','btn ghost'));
      empty.append(row);return empty;
    }
    function render(){
      const raw=q.value.trim().slice(0,100),term=fold(raw);
      const {results,approximate}=match(term);
      const filtered=results.filter(x=>group.value==='all'||x.entry.role.group===group.value);
      const relatedOutside=group.value!=='all'&&filtered.length===0&&results.length>0;
      parent.replaceChildren();
      const fragment=document.createDocumentFragment();
      for(const item of filtered.slice(0,limit))fragment.append(addRole(item.entry.role,term));
      parent.append(fragment);
      more.hidden=filtered.length<=limit;
      if(!term)summary.textContent='Browse '+roles.length.toLocaleString('en-ZA')+' occupation titles, with many alternative names and spellings. Showing '+Math.min(limit,filtered.length)+' to start.';
      else if(filtered.length)summary.textContent=filtered.length+' '+(approximate?'possible':'matching')+' title'+(filtered.length===1?'':'s')+' for “'+raw+'”.'+(approximate?' Check the suggested spelling.':'');
      else summary.textContent=group.value!=='all'?'Your title may appear in another work area. You can still continue.':'Explore a general working story for “'+raw+'”, even when the exact title is not listed.';
      if(!filtered.length){
        parent.append(suggestion(relatedOutside?'Let’s widen the search.':'Your work belongs here.',
          relatedOutside?'We found related titles in other work areas. Clear the filter, or continue with the kind of business you work in.':
          'Job titles differ from one workplace to another. We may not have this exact title yet, but you can still explore how your business could work more simply.',raw,relatedOutside));
        if(relatedOutside){for(const item of results.slice(0,6))parent.append(addRole(item.entry.role,term));}
      }
      if(approximate&&filtered.length){
        const head=el('div','directory-suggestions');head.append(el('h3',null,'Close matches'),el('p',null,'These titles look similar to what you entered. Choose the one that sounds closest to your work.'));
        parent.prepend(head);
      }
      const context=getStage(stage.value);note.hidden=!context;
      if(context){note.replaceChildren();const box=el('div');box.append(el('div','eyebrow','BUSINESS CONTEXT'),el('h3',null,context.heading),el('p',null,context.story));
        box.append(a('Explore this stage →',context.next,'story-next-link'));note.append(box);}
      updateUrl();return filtered.length;
    }
    form.addEventListener('submit',e=>{e.preventDefault();limit=36;const count=render();window.TURBINE_Telemetry?.emit('occupation_search',{query_length:q.value.trim().length,results_count:count,category:group.value,stage:stage.value})});
    q.addEventListener('input',()=>{limit=36;render()});
    group.addEventListener('change',()=>{limit=36;render()});
    stage.addEventListener('change',()=>{limit=36;render()});
    reset.addEventListener('click',()=>{q.value='';group.value='all';stage.value='all';limit=36;render();q.focus()});
    more.addEventListener('click',()=>{limit+=48;render()});
    render();
  }

  const profile=document.getElementById('occupation-profile');
  if(profile){
    const rid=params.get('role');const role=byId[rid];
    if(!role)return;
    const g=getGroup(role);const selected=getStage(params.get('stage'));
    const personal=special[rid]||null;
    const outcome=personal?.title||(role.name+': a clearer day, one step at a time.');
    const story=personal?.story||('Consider a typical day in '+g.title.toLowerCase()+'. '+g.scenario+' The intended BusinessOS journey should keep the original request, the people responsible and the resulting financial decisions together.');
    const steps=personal?.steps||g.steps;
    profile.replaceChildren();
    const crumb=el('div','occupation-crumb');crumb.append(a('All occupations','occupations.html'),el('span',null,' / '+g.title));
    const kicker=el('div','eyebrow','YOUR END IN MIND');
    const title=el('h2',null,outcome);
    const scene=el('p','occupation-scene',story);
    const result=el('div','occupation-result');result.append(el('h3',null,'What becomes easier?'),el('p',null,'Know the customer, the promise, the work, the person responsible and the money attached to it. Make the next decision from one connected business context.'));
    profile.append(crumb,kicker,title,scene,result);
    const cols=el('div','profile-columns');
    const first=el('div');first.append(el('div','eyebrow','FIVE STEPS FROM REQUEST TO RESULT'),el('h3',null,'Follow one business journey'));
    const ol=el('ol','profile-steps');steps.forEach((step,i)=>{const li=el('li');li.append(el('span','timeline-no',String(i+1).padStart(2,'0')),el('span',null,step));ol.append(li)});first.append(ol);
    const second=el('div','profile-side');second.append(el('div','eyebrow','THE BUSINESS AROUND YOUR WORK'),el('h3',null,'One working story. Different levels of responsibility.'));
    const sizes=el('p',null,'A person working alone needs clarity. A growing team needs handoffs. A QSE needs suitable authority, commercial visibility and evidence. Medium and enterprise organisations require additional controls, subject to qualification.');second.append(sizes);
    const focus=el('div','stage-focus compact');
    if(selected){focus.append(el('div','eyebrow','YOUR SELECTED CONTEXT'),el('h3',null,selected.heading),el('p',null,selected.story));focus.append(a('Explore the '+selected.label+' journey →',selected.next,'story-next-link'));
    }else{focus.append(el('h3',null,'Which business stage fits you?'),el('p',null,'The same role can operate in a sole proprietorship, an SME, a QSE or an enterprise. Choose the stage that sounds like your organisation.'));
      const stageNav=el('div','profile-stage-tags');
      for(const s of stages)stageNav.append(a(s.label,toProfile(role,s.id)));
      focus.append(stageNav);
    }
    second.append(focus);cols.append(first,second);profile.append(cols);
    const next=el('section','profile-next');next.append(el('div','eyebrow','KEEP FOLLOWING THE STORY'),el('h3',null,'See the related industry, then the complete journey.'));
    const links=el('div','cta-row');links.append(a(g.title+' →',g.link,'btn primary'),a('Six connected business journeys ↗','journeys.html','btn ghost'),a('How adoption works ↗','getting-started.html','btn ghost'),a('Search another occupation ↗','occupations.html','btn ghost'));
    next.append(links);profile.append(next,el('p','section-footnote','This describes an intended operating journey. Specialist regulatory, statutory and financial capabilities must be independently qualified before a production commitment.'));
    document.title=role.name+' | How TURBINE could fit your work | TURBINE BusinessOS';
    const meta=document.querySelector('meta[name=description]');if(meta)meta.content='Explore how TURBINE could help connect the everyday work, responsibilities and commercial records around the role '+role.name+'.';
    const h1=document.querySelector('main h1');if(h1)h1.textContent=role.name+': see how your work connects.';
    const heroLead=document.querySelector('main .page-hero .lead');if(heroLead)heroLead.textContent='This is about the day you actually have, not a list of applications you have to master.';
  }
})();
