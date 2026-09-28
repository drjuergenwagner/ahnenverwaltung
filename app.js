const keys=["persons","relationships","families","events","sources","documents","places"];
const paths=Object.fromEntries(keys.map(k=>[k,`data/${k}.json`]));
let db=Object.fromEntries(keys.map(k=>[k,[]]));
const $=id=>document.getElementById(id), uid=p=>p+"_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pname=p=>[p?.firstName,p?.birthName||p?.lastName].filter(Boolean).join(" ")||p?.name||"Unbenannt";
const labels={persons:"Personen",relationships:"Beziehungen",families:"Familien / Partnerschaften",events:"Ereignisse",sources:"Quellen",documents:"Dokumente / Fotos",places:"Orte"};
keys.forEach((k,i)=>{let b=document.createElement("button");b.className="tab"+(i===0?" active":"");b.textContent=labels[k];b.onclick=()=>show(k);$("tabs").append(b)});
async function load(){for(const k of keys)try{let r=await fetch(paths[k]+"?v="+Date.now());if(r.ok)db[k]=await r.json()}catch(e){}show("persons")}
function show(k){document.querySelectorAll(".tab").forEach((b,i)=>b.classList.toggle("active",b.textContent===labels[k]));let c=$("content");c.className="panel";c.innerHTML=`<div class="toolbar"><input id="q" placeholder="${labels[k]} suchen …"><button id="add">+ Hinzufügen</button></div><div id="list"></div>`;$("add").onclick=()=>edit(k);$("q").oninput=()=>render(k);render(k)}
function render(k){let q=($("q")?.value||"").toLowerCase(), arr=db[k].filter(x=>JSON.stringify(x).toLowerCase().includes(q));$("list").innerHTML=arr.map(x=>card(k,x)).join("")||`<p class="muted">Noch keine Einträge.</p>`}
function card(k,x){let title="";
if(k==="persons")title=pname(x);
else if(k==="families")title=(x.personIds||[]).map(id=>pname(db.persons.find(p=>p.id===id))).join(" + ")||"Familie";
else if(k==="events")title=x.type||"Ereignis";
else title=x.title||x.name||labels[k];
return `<div class="card"><h3>${esc(title)}</h3><div class="muted">${esc(x.date||x.type||x.city||"")}</div><p>${esc(x.note||x.description||x.reference||"")}</p><button onclick="edit('${k}','${x.id}')">Bearbeiten</button> <button onclick="del('${k}','${x.id}')">Löschen</button></div>`}
function modal(title,fields,save){let m=document.createElement("div");m.className="modal";m.innerHTML=`<div class="box"><h2>${esc(title)}</h2><div class="grid">${fields.map(f=>`<label class="${f.full?'full':''}">${esc(f.label)}<input id="f_${f.key}" value="${esc(f.value||"")}"></label>`).join("")}</div><p><button id="cancel">Abbrechen</button> <button id="ok">Speichern</button></p></div>`;document.body.append(m);m.querySelector("#cancel").onclick=()=>m.remove();m.querySelector("#ok").onclick=()=>{let o={};fields.forEach(f=>o[f.key]=m.querySelector("#f_"+f.key).value);save(o);m.remove();show(title==="Person"?"persons":title==="Familie / Partnerschaft"?"families":title==="Ereignis"?"events":title==="Quelle"?"sources":title==="Ort"?"places":"documents")}}
function edit(k,id){let x=db[k].find(a=>a.id===id)||{};let f;
if(k==="persons")f=[["firstName","Vorname"],["lastName","Nachname"],["birthName","Geburtsname"],["gender","Geschlecht"],["birthDate","Geburtsdatum"],["birthPlace","Geburtsort"],["deathDate","Sterbedatum"],["deathPlace","Sterbeort"],["occupation","Beruf"],["note","Notizen",1]];
else if(k==="families")f=[["personIds","Personen-IDs (Komma)"],["type","Typ"],["startDate","Beginn"],["endDate","Ende"],["note","Notizen",1]];
else if(k==="relationships")f=[["childId","Kind-ID"],["parentId","Elternteil-ID"],["type","Beziehungstyp"],["note","Notizen",1]];
else if(k==="events")f=[["personId","Person-ID"],["type","Art"],["date","Datum"],["placeId","Ort-ID"],["sourceId","Quellen-ID"],["note","Notizen",1]];
else if(k==="sources")f=[["title","Titel"],["type","Art"],["archive","Archiv / Bestand"],["reference","Signatur / Fundstelle"],["url","Link"],["note","Notizen",1]];
else if(k==="places")f=[["name","Name"],["city","Ort / Gemeinde"],["country","Land"],["note","Notizen",1]];
else f=[["title","Titel"],["type","Art"],["date","Datum"],["personIds","Personen-IDs (Komma)"],["description","Beschreibung",1],["path","Dateipfad / Hinweis",1]];
let fields=f.map(([key,label,full])=>({key,label,full,value:Array.isArray(x[key])?x[key].join(","):x[key]}));
modal(labels[k]==="Personen"?"Person":labels[k]==="Familien / Partnerschaften"?"Familie / Partnerschaft":labels[k]==="Ereignisse"?"Ereignis":labels[k]==="Quellen"?"Quelle":labels[k]==="Orte"?"Ort":"Dokument / Foto",fields,o=>{["personIds"].forEach(a=>{if(a in o)o[a]=o[a].split(",").map(s=>s.trim()).filter(Boolean)});if(x.id)Object.assign(x,o);else db[k].push({id:uid(k.slice(0,2)),...o});});
}
window.edit=edit;window.del=(k,id)=>{if(confirm("Wirklich löschen?")){db[k]=db[k].filter(x=>x.id!==id);show(k)}};
$("export").onclick=()=>{let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:"application/json"}));a.download="ahnenverwaltung-export.json";a.click()};
$("load").onclick=()=>{let i=document.createElement("input");i.type="file";i.accept=".json";i.multiple=true;i.onchange=async()=>{for(let f of i.files)try{let d=JSON.parse(await f.text());keys.forEach(k=>{if(Array.isArray(d[k]))db[k]=d[k]})}catch(e){}show("persons")};i.click()};
load();
