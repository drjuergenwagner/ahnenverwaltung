const KEY="ahnenverwaltung-v2";
let data={persons:[],relationships:[],marriages:[],sources:[]};
let currentPersonId=null;

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const name=p=>[p?.firstName,p?.lastName].filter(Boolean).join(" ");
const person=id=>data.persons.find(p=>p.id===id);
const date=s=>s?new Intl.DateTimeFormat("de-DE").format(new Date(s+"T00:00:00")):"";

async function init(){
 try{
  const stored=localStorage.getItem(KEY);
  data=stored?JSON.parse(stored):await fetch("data/data.json").then(r=>r.json());
 }catch(e){alert("Daten konnten nicht geladen werden.");data={persons:[],relationships:[],marriages:[],sources:[]}}
 currentPersonId=data.persons[0]?.id||null;
 refresh();
}

function save(){localStorage.setItem(KEY,JSON.stringify(data));refresh();}

function refresh(){
 fillTreeSelect();
 renderTree();
 renderPersons();
 renderFamilies();
 renderSources();
 if(currentPersonId) renderEditor(currentPersonId);
}

function fillTreeSelect(filter=""){
 const q=filter.toLowerCase();
 const ps=data.persons.filter(p=>name(p).toLowerCase().includes(q));
 $("treePerson").innerHTML=ps.map(p=>`<option value="${p.id}">${esc(name(p))}</option>`).join("");
 if(currentPersonId && ps.some(p=>p.id===currentPersonId)) $("treePerson").value=currentPersonId;
 else if(ps[0]){currentPersonId=ps[0].id;$("treePerson").value=currentPersonId;}
}

function parents(id){return data.relationships.filter(r=>r.childId===id).map(r=>person(r.parentId)).filter(Boolean)}
function children(id){return data.relationships.filter(r=>r.parentId===id).map(r=>person(r.childId)).filter(Boolean)}
function spouses(id){
 return data.marriages.flatMap(m=>m.spouse1Id===id?[person(m.spouse2Id)]:m.spouse2Id===id?[person(m.spouse1Id)]:[]).filter(Boolean)
}

function renderTree(){
 const p=person(currentPersonId); if(!p)return;
 $("selectedPerson").innerHTML=`<div class="person-name">${esc(name(p))}</div>
 <div class="muted">${p.birthDate?"geb. "+esc(date(p.birthDate)):""}${p.birthPlace?" · "+esc(p.birthPlace):""}${p.deathDate?" · gest. "+esc(date(p.deathDate)):""}</div>`;
 let current=[p],html="";
 const max=Math.min(10,Math.max(1,Number($("generations").value)||5));
 for(let g=1;g<=max;g++){
  const ps=current.flatMap(x=>parents(x.id));
  if(!ps.length)break;
  html+=`<div class="generation-label">${g}. Vorfahrengeneration</div><div class="generation">`;
  html+=ps.map(x=>`<div class="tree-person" onclick="selectPerson('${x.id}')"><strong>${esc(name(x))}</strong><span class="small">${x.birthDate?"geb. "+esc(date(x.birthDate)):""}${x.birthPlace?" · "+esc(x.birthPlace):""}</span></div>`).join("");
  html+="</div>"; current=ps;
 }
 $("tree").innerHTML=html||`<div class="empty">Keine Eltern eingetragen.</div>`;
}

window.selectPerson=id=>{currentPersonId=id;document.querySelector('[data-tab="tree"]').click();refresh()};

function renderPersons(){
 const q=($("personSearch").value||"").toLowerCase();
 const ps=data.persons.filter(p=>name(p).toLowerCase().includes(q));
 $("personList").innerHTML=ps.map(p=>`<div class="person-row" onclick="editPerson('${p.id}')"><div class="person-name">${esc(name(p))}</div><div class="muted">${p.birthDate?esc(date(p.birthDate)):""}${p.birthPlace?" · "+esc(p.birthPlace):""}</div></div>`).join("")||`<div class="empty">Keine Personen gefunden.</div>`;
}
window.editPerson=id=>{currentPersonId=id;renderEditor(id)}

function renderEditor(id){
 const p=person(id);
 if(!p){$("personEditor").innerHTML="<div class='empty'>Person auswählen</div>";return}
 const options= data.persons.filter(x=>x.id!==id).map(x=>`<option value="${x.id}">${esc(name(x))}</option>`).join("");
 const ps=parents(id).map(x=>x.id);
 const sp=spouses(id);
 $("personEditor").innerHTML=`<h2>Person bearbeiten</h2>
 <form id="personForm" class="form-grid">
 <label>Vorname<input name="firstName" value="${esc(p.firstName)}"></label>
 <label>Nachname<input name="lastName" value="${esc(p.lastName)}"></label>
 <label>Geschlecht<select name="gender"><option value="">–</option><option value="m" ${p.gender==="m"?"selected":""}>männlich</option><option value="f" ${p.gender==="f"?"selected":""}>weiblich</option><option value="x" ${p.gender==="x"?"selected":""}>unbekannt</option></select></label>
 <label>Geburtsdatum<input type="date" name="birthDate" value="${esc(p.birthDate)}"></label>
 <label>Geburtsort<input name="birthPlace" value="${esc(p.birthPlace)}"></label>
 <label>Sterbedatum<input type="date" name="deathDate" value="${esc(p.deathDate)}"></label>
 <label>Sterbeort<input name="deathPlace" value="${esc(p.deathPlace)}"></label>
 <label>Beruf<input name="occupation" value="${esc(p.occupation)}"></label>
 <label class="wide">Notizen<textarea name="notes" rows="4">${esc(p.notes)}</textarea></label>
 <div class="wide"><strong>Eltern</strong><div class="actions">
 <select id="parentSelect"><option value="">Elternteil auswählen …</option>${options}</select>
 <button type="button" onclick="addParent('${id}')">Elternteil hinzufügen</button>
 </div></div>
 <div class="wide"><strong>Bestehende Eltern</strong><div>${ps.length?ps.map(x=>`<button type="button" onclick="removeParent('${x}','${id}')">${esc(name(person(x)))} ×</button>`).join(" "):"<span class='muted'>keine</span>"}</div></div>
 <div class="wide"><strong>Ehepartner</strong><div>${sp.length?sp.map(x=>`<span>${esc(name(x))}</span>`).join(", "):"<span class='muted'>keine</span>"}</div>
 <div class="actions"><select id="spouseSelect"><option value="">Ehepartner auswählen …</option>${options}</select><button type="button" onclick="addSpouse('${id}')">Ehepartner hinzufügen</button></div></div>
 <div class="actions wide"><button>Speichern</button><button type="button" class="danger" onclick="deletePerson('${id}')">Person löschen</button></div>
 </form>`;
 $("personForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);Object.assign(p,Object.fromEntries(f.entries()));save();};
}

window.addParent=(childId)=>{const parentId=$("parentSelect").value;if(!parentId)return;if(!data.relationships.some(r=>r.parentId===parentId&&r.childId===childId)){data.relationships.push({id:uid("R"),parentId,childId,type:"biological"});save()}}
window.removeParent=(parentId,childId)=>{data.relationships=data.relationships.filter(r=>!(r.parentId===parentId&&r.childId===childId));save()}
window.addSpouse=(id)=>{const sid=$("spouseSelect").value;if(!sid||sid===id)return;if(!data.marriages.some(m=>(m.spouse1Id===id&&m.spouse2Id===sid)||(m.spouse1Id===sid&&m.spouse2Id===id))){data.marriages.push({id:uid("M"),spouse1Id:id,spouse2Id:sid,date:"",place:"",divorceDate:"",notes:""});save()}}
window.deletePerson=id=>{if(!confirm("Person wirklich löschen?"))return;data.persons=data.persons.filter(p=>p.id!==id);data.relationships=data.relationships.filter(r=>r.parentId!==id&&r.childId!==id);data.marriages=data.marriages.filter(m=>m.spouse1Id!==id&&m.spouse2Id!==id);data.sources=data.sources.filter(s=>s.personId!==id);currentPersonId=data.persons[0]?.id||null;save()}

function newPerson(){const id=uid("P");data.persons.push({id,firstName:"",lastName:"",gender:"",birthDate:"",birthPlace:"",deathDate:"",deathPlace:"",occupation:"",notes:""});currentPersonId=id;save();editPerson(id)}
function uid(prefix){return prefix+Date.now().toString(36).toUpperCase()}

function renderFamilies(){
 $("familyList").innerHTML=data.marriages.map(m=>`<div class="family"><h3>Ehe / Partnerschaft</h3>
 <div><strong>${esc(name(person(m.spouse1Id)))}</strong><div class="muted">${m.date?esc(date(m.date)):"Datum unbekannt"}${m.place?" · "+esc(m.place):""}</div></div>
 <div><strong>${esc(name(person(m.spouse2Id)))}</strong></div>
 <div><strong>Kinder</strong><div>${children(m.spouse1Id).filter(c=>data.relationships.some(r=>r.parentId===m.spouse2Id&&r.childId===c.id)).map(c=>esc(name(c))).join(", ")||"keine eingetragen"}</div></div>
 </div>`).join("")||`<div class="empty">Keine Familien/Partnerschaften eingetragen.</div>`;
}

function renderSources(){
 $("sourceList").innerHTML=data.sources.map((s,i)=>`<div class="source"><strong>${esc(s.title)}</strong><div>${esc(s.archive||"")}${s.reference?" · "+esc(s.reference):""}</div><div class="small">${s.personId?`Person: ${esc(name(person(s.personId)))}`:""}</div><div>${esc(s.notes||"")}</div></div>`).join("")||`<div class="empty">Noch keine Quellen.</div>`;
}
function newSource(){
 const title=prompt("Bezeichnung der Quelle:");
 if(!title)return;
 const id=uid("S");
 data.sources.push({id,title,archive:"",reference:"",url:"",personId:currentPersonId,notes:""});
 save();
}

$("treeSearch").oninput=e=>{fillTreeSelect(e.target.value);renderTree()};
$("treePerson").onchange=e=>{currentPersonId=e.target.value;renderTree();renderEditor(currentPersonId)};
$("generations").onchange=renderTree;
$("personSearch").oninput=renderPersons;
$("newPerson").onclick=newPerson;
$("newSource").onclick=newSource;

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 document.querySelectorAll(".tab-content").forEach(x=>x.classList.add("hidden"));
 $(b.dataset.tab+"Tab").classList.remove("hidden");
});

$("exportBtn").onclick=()=>{
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ahnenverwaltung-daten.json";a.click();URL.revokeObjectURL(a.href);
};
$("importInput").onchange=e=>{
 const f=e.target.files[0];if(!f)return;
 const r=new FileReader();r.onload=()=>{try{data=JSON.parse(r.result);currentPersonId=data.persons[0]?.id||null;save();alert("Daten importiert.")}catch{alert("Ungültige JSON-Datei.")}};r.readAsText(f);
};

init();
