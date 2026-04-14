import { useState, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ─── localStorage helpers ───────────────────────────────────────────────── */
const lsGet = (key) => { try { return localStorage.getItem(key); } catch(_) { return null; } };
const lsSet = (key, val) => { try { localStorage.setItem(key, val); } catch(_) {} };


/* ─── Config ─────────────────────────────────────────────────────────────── */
const ADMIN_PASSWORD = "JDMS@2024";
const MAX_SYSTEMS    = 10;

/* ─── Airtable ───────────────────────────────────────────────────────────── */
const toAirtableFields = (jurisdiction, sys, improvements, barriers, ts) => ({
  "Jurisdiction":        jurisdiction        || "",
  "System Name":         sys.systemName      || "",
  "System Type":         sys.systemType==="Custom Software (please define)"?`Custom Software: ${sys.systemTypeOther||""}`:sys.systemType || "",
  "System Uses":         (sys.systemUses     || []).join(", "),
  "Parameters":          (sys.parameters     || []).join(", "),
  "Primary Collector":   sys.primaryCollector|| "",
  "System Admin":        sys.systemAdmin     || "",
  "Access Protocols":    sys.hasAccessProtocols|| "",
  "Access Detail":       sys.accessDetail    || "",
  "Data Sharing Method": sys.dataSharingMethod|| "",
  "JK Integration":      sys.jkIntegration   || "",
  "JK Detail":           sys.jkDetail        || "",
  "Protection Measures": (sys.protectionMeasures|| []).join(", "),
  "Protection Gaps":     sys.protectionGaps  || "",
  "Agreement Storage":   sys.agreementStorage|| "",
  "Security Controls":   (sys.securityControls|| []).join(", "),
  "Data Hosting":        sys.dataHosting     || "",
  "Backup":              sys.hasBackup       || "",
  "Breach Protocols":    sys.hasBreachProtocols|| "",
  "Audit Type":          sys.auditType       || "",
  "Improvements":        improvements        || "",
  "Barriers":            barriers            || "",
  "Submitted At":        ts                  || new Date().toISOString(),
});

async function postToAirtable(cfg, jurisdiction, systems, improvements, barriers, ts) {
  for (const sys of systems) {
    const res = await fetch(`https://api.airtable.com/v0/${cfg.baseId}/${encodeURIComponent(cfg.tableId)}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: toAirtableFields(jurisdiction, sys, improvements, barriers, ts) }),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const e = await res.json(); msg = e?.error?.message || msg; } catch(_) {}
      throw new Error(msg);
    }
  }
}

async function fetchFromAirtable(cfg) {
  const res = await fetch(`https://api.airtable.com/v0/${cfg.baseId}/${encodeURIComponent(cfg.tableId)}?maxRecords=200`, {
    headers: { "Authorization": `Bearer ${cfg.token}` },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const e = await res.json(); msg = e?.error?.message || msg; } catch(_) {}
    throw new Error(msg);
  }
  const data = await res.json();
  // Group records by jurisdiction into submissions
  const byJurisdiction = {};
  (data.records || []).forEach(rec => {
    const j = rec.fields["Jurisdiction"] || "Unknown";
    if (!byJurisdiction[j]) byJurisdiction[j] = { jurisdiction: j, systems: [], improvements: rec.fields["Improvements"]||"", barriers: rec.fields["Barriers"]||"", ts: rec.fields["Submitted At"]||"", id: rec.id };
    byJurisdiction[j].systems.push({
      systemName:       rec.fields["System Name"]          || "",
      systemType:       rec.fields["System Type"]          || "",
      systemUses:       rec.fields["System Uses"]          ? rec.fields["System Uses"].split(", ") : [],
      parameters:       rec.fields["Parameters"]           ? rec.fields["Parameters"].split(", ") : [],
      primaryCollector: rec.fields["Primary Collector"]    || "",
      systemAdmin:      rec.fields["System Admin"]         || "",
      hasAccessProtocols: rec.fields["Access Protocols"]   || "",
      accessDetail:     rec.fields["Access Detail"]        || "",
      dataSharingMethod: rec.fields["Data Sharing Method"] || "",
      jkIntegration:    rec.fields["JK Integration"]       || "",
      jkDetail:         rec.fields["JK Detail"]            || "",
      protectionMeasures: rec.fields["Protection Measures"] ? rec.fields["Protection Measures"].split(", ") : [],
      protectionGaps:   rec.fields["Protection Gaps"]      || "",
      agreementStorage: rec.fields["Agreement Storage"]    || "",
      securityControls: rec.fields["Security Controls"]    ? rec.fields["Security Controls"].split(", ") : [],
      dataHosting:      rec.fields["Data Hosting"]         || "",
      hasBackup:        rec.fields["Backup"]               || "",
      hasBreachProtocols: rec.fields["Breach Protocols"]   || "",
      auditType:        rec.fields["Audit Type"]           || "",
    });
  });
  return Object.values(byJurisdiction);
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const PALETTE       = ["#14b8a6","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#22c55e"];
const JURISDICTIONS = ["Afghanistan","Angola","Australia & New Zealand","Bangladesh","Canada","DR Congo","France","Germany","India","Iran","Kenya","Madagascar","Mozambique","Pakistan","Portugal","South East Asia","Syria","Tajikistan","Tanzania","UAE","Uganda","UK","USA"];
const SYSTEM_TYPES  = ["ii Platform","Custom App","Excel","Airtable or Google Form","Paper-based","Custom Software (please define)"];
const SYSTEM_USES   = ["Data Collection","Data Storage","Reporting & Analytics","Member Registration","Financial Tracking","Programme Management","Case Management","Communications","Survey & Feedback","Monitoring & Evaluation","Compliance & Audit","Other"];
const PARAM_OPTS    = ["Demographics","Education Access","Health Access","Youth Programmes","Elderly Programming","Financial / SWB","Housing","Employment","Settlement Data","Other"];
const COLLECTOR_OPS = ["Board","Staff","Volunteers","Board & Staff","Mix of All"];
const SHARING_OPTS  = ["Shared Database","Manual Reports","Email","Web Portal","API Integration","No Sharing","Other"];
const PROTECT_OPTS  = ["GDPR / Privacy Compliance","Data Encryption","Access Controls","Privacy Policy","Staff Training","Consent Forms","Data Anonymisation","Legal Agreements","Other"];
const STORAGE_OPTS  = ["Cloud","Physical / Local","Both","None"];
const SECURITY_OPTS = ["Password Protection","Two-Factor Auth","VPN","Firewall","Role-Based Access","Audit Logs","Data Masking","Antivirus / EDR","Other"];
const HOSTING_OPTS  = ["Cloud","On-Premise","Hybrid","Unknown"];
const AUDIT_OPTS    = ["Internal only","External only","Both Internal & External","None"];

const SYS_SECTIONS = [
  {icon:"📊",title:"System Details"},
  {icon:"📋",title:"Data Collection"},
  {icon:"👥",title:"Roles & Accountability"},
  {icon:"🔗",title:"Access & Integration"},
  {icon:"🛡️",title:"Data Protection"},
  {icon:"🔒",title:"Security & Operations"},
  {icon:"✅",title:"Audit"},
];

const SYSTEM_EMPTY = {
  systemName:"", systemType:"", systemTypeOther:"", systemUses:[], parameters:[],
  primaryCollector:"", systemAdmin:"", hasAccessProtocols:"", accessDetail:"",
  dataSharingMethod:"", jkIntegration:"", jkDetail:"",
  protectionMeasures:[], protectionGaps:"", agreementStorage:"",
  securityControls:[], dataHosting:"", hasBackup:"", hasBreachProtocols:"",
  auditType:"",
};

const FORM_EMPTY = {
  jurisdiction:"",
  systems:[{...SYSTEM_EMPTY}],
  improvements:"", barriers:"",
};

/* ─── Shared styles ──────────────────────────────────────────────────────── */
const iCls = "w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors";
const ttStyle = {background:"#1e293b",border:"1px solid #334155",borderRadius:"8px",color:"#e2e8f0",fontSize:"12px"};

/* ─── UI atoms ───────────────────────────────────────────────────────────── */
function Field({label,hint,children}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
      {hint&&<p className="text-xs text-slate-600">{hint}</p>}
    </div>
  );
}
function RadioGroup({options,value,onChange}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o=>(
        <button key={o} type="button" onClick={()=>onChange(o)}
          className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${value===o?"bg-teal-900/60 border-teal-500 text-teal-300 font-medium":"bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}
function CheckGrid({options,selected,onToggle}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(o=>{
        const on=selected.includes(o);
        return (
          <label key={o} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all ${on?"bg-teal-900/50 border-teal-500 text-teal-300":"bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-400"}`}>
            <input type="checkbox" className="hidden" checked={on} onChange={()=>onToggle(o)}/>
            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on?"bg-teal-500 border-teal-500":"border-slate-500"}`}>
              {on&&<svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth="2"><polyline points="1,4 4,7 9,1"/></svg>}
            </span>
            {o}
          </label>
        );
      })}
    </div>
  );
}
function ChartCard({title,children,full}) {
  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 p-4 ${full?"col-span-2":""}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>{children}</ResponsiveContainer>
    </div>
  );
}
function Toast({msg,type}) {
  if(!msg) return null;
  const cls=type==="error"?"bg-red-900/80 border-red-700 text-red-300":"bg-green-900/80 border-green-700 text-green-300";
  return <div className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-xl ${cls}`}>{msg}</div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   GATE
   ══════════════════════════════════════════════════════════════════════════ */
function GateScreen({onSelect}) {
  const [showLogin,setShowLogin]=useState(false);
  const [pw,setPw]=useState("");
  const [err,setErr]=useState(false);
  const tryAdmin=()=>{if(pw===ADMIN_PASSWORD){onSelect("admin");}else{setErr(true);setPw("");}};
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-900/40 border border-teal-700 text-3xl mb-4">📋</div>
        <h1 className="text-2xl font-bold text-slate-100">Jamati Data Management</h1>
        <p className="text-slate-400 text-sm mt-1">Systems Audit Questionnaire</p>
      </div>
      {!showLogin?(
        <div className="w-full max-w-sm space-y-3">
          <button onClick={()=>onSelect("respondent")} className="w-full flex items-center gap-4 p-5 bg-slate-800 border border-slate-700 hover:border-teal-600 rounded-2xl text-left transition-all group">
            <div className="w-11 h-11 rounded-xl bg-teal-900/50 border border-teal-700 flex items-center justify-center text-xl shrink-0 group-hover:bg-teal-900">📝</div>
            <div><p className="font-semibold text-slate-100">Fill in the Survey</p><p className="text-xs text-slate-500 mt-0.5">Submit your jurisdiction's data management information</p></div>
            <span className="ml-auto text-slate-600 group-hover:text-teal-400">→</span>
          </button>
          <button onClick={()=>setShowLogin(true)} className="w-full flex items-center gap-4 p-5 bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-2xl text-left transition-all group">
            <div className="w-11 h-11 rounded-xl bg-indigo-900/40 border border-indigo-700 flex items-center justify-center text-xl shrink-0">🔐</div>
            <div><p className="font-semibold text-slate-100">Admin Access</p><p className="text-xs text-slate-500 mt-0.5">View results, charts, and AI analysis</p></div>
            <span className="ml-auto text-slate-600 group-hover:text-indigo-400">→</span>
          </button>
        </div>
      ):(
        <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <button onClick={()=>{setShowLogin(false);setErr(false);setPw("");}} className="text-xs text-slate-500 hover:text-slate-300 mb-4">← Back</button>
          <div className="flex items-center gap-2 mb-5"><span className="text-xl">🔐</span><h2 className="font-semibold text-slate-100">Admin Login</h2></div>
          <Field label="Password">
            <input type="password" className={iCls+(err?" border-red-500":"")} value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&tryAdmin()} placeholder="Enter admin password…" autoFocus/>
          </Field>
          {err&&<p className="text-xs text-red-400 mt-2">Incorrect password.</p>}
          <button onClick={tryAdmin} className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-all">Enter Dashboard</button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   RESPONDENT VIEW  –  jurisdiction once, up to 10 systems
   ══════════════════════════════════════════════════════════════════════════ */
function RespondentView({responses,onSave,onExit,atConfig}) {
  const [form,    setForm]    = useState(FORM_EMPTY);
  const [phase,   setPhase]   = useState("jurisdiction"); // jurisdiction | system | between | general | done
  const [sysIdx,  setSysIdx]  = useState(0);
  const [sysStep, setSysStep] = useState(0); // 0-6 within a system
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);};

  // Update top-level field
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));

  // Update a field within the current system
  const updSys=(k,v)=>setForm(f=>{
    const systems=[...f.systems];
    systems[sysIdx]={...systems[sysIdx],[k]:v};
    return {...f,systems};
  });
  const togSys=(k,v)=>setForm(f=>{
    const systems=[...f.systems];
    const cur=systems[sysIdx][k]||[];
    systems[sysIdx]={...systems[sysIdx],[k]:cur.includes(v)?cur.filter(x=>x!==v):[...cur,v]};
    return {...f,systems};
  });

  const curSys=form.systems[sysIdx]||{...SYSTEM_EMPTY};

  const addSystem=()=>{
    setForm(f=>({...f,systems:[...f.systems,{...SYSTEM_EMPTY}]}));
    setSysIdx(form.systems.length);
    setSysStep(0);
    setPhase("system");
  };

  const submit=async()=>{
    setSaving(true);
    const rec={...form,id:Date.now(),ts:new Date().toISOString()};
    if(atConfig?.token&&atConfig?.baseId&&atConfig?.tableId){
      try{
        await postToAirtable(atConfig,rec.jurisdiction,rec.systems,rec.improvements,rec.barriers,rec.ts);
        showToast("Saved to Airtable ✓");
      }catch(e){showToast("Airtable save failed: "+e.message,"error");}
    }
    await onSave(rec);
    setPhase("done");
    setSaving(false);
  };

  const reset=()=>{setForm(FORM_EMPTY);setPhase("jurisdiction");setSysIdx(0);setSysStep(0);};

  // ── DONE screen ──
  if(phase==="done") return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-full bg-teal-900/60 border border-teal-500 flex items-center justify-center text-3xl mb-5">✓</div>
      <h2 className="text-xl font-semibold text-teal-400 mb-1">Submission Complete</h2>
      <p className="text-slate-400 text-sm mb-1">{form.jurisdiction} — {form.systems.length} system{form.systems.length!==1?"s":""} recorded.</p>
      <p className="text-slate-500 text-xs mb-7">{responses.length} of 20 jurisdictions collected so far.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-5 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-sm font-medium">Submit Another</button>
        <button onClick={onExit} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium">← Exit</button>
      </div>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <div>
            <span className="text-teal-400 font-semibold text-sm">JDMS Audit Survey</span>
            {form.jurisdiction&&<span className="ml-2 text-xs text-slate-500">· {form.jurisdiction}</span>}
          </div>
          <button onClick={onExit} className="text-xs text-slate-500 hover:text-slate-300">← Exit</button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-8">

        {/* ── PHASE: JURISDICTION ── */}
        {phase==="jurisdiction"&&(
          <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-700">
              <span className="text-xl">🏛️</span>
              <h2 className="font-semibold text-slate-100">Select Your Jurisdiction</h2>
            </div>
            <Field label="Jurisdiction *">
              <select className={iCls} value={form.jurisdiction} onChange={e=>upd("jurisdiction",e.target.value)}>
                <option value="">Select jurisdiction…</option>
                {JURISDICTIONS.map(j=><option key={j}>{j}</option>)}
              </select>
            </Field>
            <div className="pt-2">
              <p className="text-xs text-slate-500 mb-3">You can record up to {MAX_SYSTEMS} data systems for this jurisdiction.</p>
              <button onClick={()=>form.jurisdiction&&setPhase("system")} disabled={!form.jurisdiction}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-30 rounded-xl text-sm font-semibold transition-all">
                Start — Add System 1 →
              </button>
            </div>
          </div>
        )}

        {/* ── PHASE: SYSTEM (steps 0-6) ── */}
        {phase==="system"&&(
          <>
            {/* System indicator */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">System</span>
                <div className="flex gap-1">
                  {form.systems.map((_,i)=>(
                    <div key={i} className={`w-6 h-6 rounded-md text-xs flex items-center justify-center font-bold border ${i===sysIdx?"bg-teal-600 border-teal-500 text-white":"bg-slate-700 border-slate-600 text-slate-400"}`}>{i+1}</div>
                  ))}
                </div>
              </div>
              <span className="text-xs text-slate-500">Step {sysStep+1} of 7</span>
            </div>

            {/* Step progress */}
            <div className="mb-5">
              <div className="flex gap-1 overflow-x-auto pb-1 mb-2">
                {SYS_SECTIONS.map((s,i)=>(
                  <div key={i} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${i===sysStep?"bg-teal-900/60 border border-teal-600 text-teal-300":i<sysStep?"bg-slate-800/50 text-slate-400":"text-slate-600"}`}>
                    {s.icon} {s.title}
                  </div>
                ))}
              </div>
              <div className="h-1 bg-slate-800 rounded-full"><div className="h-full bg-teal-600 rounded-full transition-all" style={{width:`${(sysStep/6)*100}%`}}/></div>
            </div>

            {/* System name banner */}
            {curSys.systemName&&<div className="mb-3 text-xs text-slate-500 font-medium">System {sysIdx+1}: <span className="text-slate-300">{curSys.systemName}</span></div>}

            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-700">
                <span className="text-xl">{SYS_SECTIONS[sysStep].icon}</span>
                <h2 className="font-semibold text-slate-100">{SYS_SECTIONS[sysStep].title}</h2>
              </div>

              {sysStep===0&&(<>
                <Field label="System / Platform Name *"><input className={iCls} value={curSys.systemName} onChange={e=>updSys("systemName",e.target.value)} placeholder="e.g. Jamati QOL Database, RE Access System…"/></Field>
                <Field label="System Type *">
                  <select className={iCls} value={curSys.systemType} onChange={e=>updSys("systemType",e.target.value)}>
                    <option value="">Select type…</option>
                    {SYSTEM_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                  {curSys.systemType==="Custom Software (please define)"&&(
                    <input className={iCls+" mt-2"} value={curSys.systemTypeOther||""} onChange={e=>updSys("systemTypeOther",e.target.value)} placeholder="Please define the custom software…"/>
                  )}
                </Field>
                <Field label="What is this system used for? (select all that apply) *">
                  <CheckGrid options={SYSTEM_USES} selected={curSys.systemUses||[]} onToggle={v=>togSys("systemUses",v)}/>
                </Field>
              </>)}
              {sysStep===1&&(<Field label="Key parameters collected *"><CheckGrid options={PARAM_OPTS} selected={curSys.parameters} onToggle={v=>togSys("parameters",v)}/></Field>)}
              {sysStep===2&&(<>
                <Field label="Who primarily collects data? *"><RadioGroup options={COLLECTOR_OPS} value={curSys.primaryCollector} onChange={v=>updSys("primaryCollector",v)}/></Field>
                <Field label="System administrator / owner"><input className={iCls} value={curSys.systemAdmin} onChange={e=>updSys("systemAdmin",e.target.value)} placeholder="Role or name…"/></Field>
                <Field label="Do user access protocols exist? *"><RadioGroup options={["Yes","Partial","No"]} value={curSys.hasAccessProtocols} onChange={v=>updSys("hasAccessProtocols",v)}/></Field>
                {curSys.hasAccessProtocols&&curSys.hasAccessProtocols!=="No"&&(<Field label="Describe the access protocols"><textarea className={iCls+" resize-none h-20"} value={curSys.accessDetail} onChange={e=>updSys("accessDetail",e.target.value)} placeholder="e.g. Role-based logins…"/></Field>)}
              </>)}
              {sysStep===3&&(<>
                <Field label="How is data shared among Boards and Programmes? *"><select className={iCls} value={curSys.dataSharingMethod} onChange={e=>updSys("dataSharingMethod",e.target.value)}><option value="">Select method…</option>{SHARING_OPTS.map(o=><option key={o}>{o}</option>)}</select></Field>
                <Field label="Is JK / Local Council data integrated centrally? *"><RadioGroup options={["Yes","Partial","No"]} value={curSys.jkIntegration} onChange={v=>updSys("jkIntegration",v)}/></Field>
                <Field label="Describe the integration method"><textarea className={iCls+" resize-none h-20"} value={curSys.jkDetail} onChange={e=>updSys("jkDetail",e.target.value)} placeholder="e.g. Automated API sync…"/></Field>
              </>)}
              {sysStep===4&&(<>
                <Field label="Data protection measures in place *"><CheckGrid options={PROTECT_OPTS} selected={curSys.protectionMeasures} onToggle={v=>togSys("protectionMeasures",v)}/></Field>
                <Field label="Gaps in data protection protocols"><textarea className={iCls+" resize-none h-20"} value={curSys.protectionGaps} onChange={e=>updSys("protectionGaps",e.target.value)} placeholder="Describe any known gaps…"/></Field>
                <Field label="Where are agreement / consent records stored? *"><RadioGroup options={STORAGE_OPTS} value={curSys.agreementStorage} onChange={v=>updSys("agreementStorage",v)}/></Field>
              </>)}
              {sysStep===5&&(<>
                <Field label="Security controls in place *"><CheckGrid options={SECURITY_OPTS} selected={curSys.securityControls} onToggle={v=>togSys("securityControls",v)}/></Field>
                <Field label="Where is data hosted? *"><RadioGroup options={HOSTING_OPTS} value={curSys.dataHosting} onChange={v=>updSys("dataHosting",v)}/></Field>
                <Field label="Backup and recovery models in place? *"><RadioGroup options={["Yes","Partial","No"]} value={curSys.hasBackup} onChange={v=>updSys("hasBackup",v)}/></Field>
                <Field label="Protocols for system breach or failure? *"><RadioGroup options={["Yes","No"]} value={curSys.hasBreachProtocols} onChange={v=>updSys("hasBreachProtocols",v)}/></Field>
              </>)}
              {sysStep===6&&(
                <Field label="Audit procedures in place *"><RadioGroup options={AUDIT_OPTS} value={curSys.auditType} onChange={v=>updSys("auditType",v)}/></Field>
              )}
            </div>

            <div className="flex justify-between mt-5">
              <button onClick={()=>{ if(sysStep>0){setSysStep(s=>s-1);}else if(sysIdx>0){setSysIdx(i=>i-1);setSysStep(6);}else{setPhase("jurisdiction");}}}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 transition-all">← Back</button>
              {sysStep<6
                ?<button onClick={()=>setSysStep(s=>s+1)} className="px-6 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 transition-all">Continue →</button>
                :<button onClick={()=>setPhase("between")} className="px-6 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 transition-all">System Complete →</button>
              }
            </div>
          </>
        )}

        {/* ── PHASE: BETWEEN SYSTEMS ── */}
        {phase==="between"&&(
          <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-900/50 border border-teal-600 flex items-center justify-center text-2xl mx-auto mb-4">✓</div>
            <h2 className="font-semibold text-teal-400 text-lg mb-1">System {sysIdx+1} Complete</h2>
            <p className="text-slate-400 text-sm mb-6">{form.jurisdiction} — {form.systems.length} of up to {MAX_SYSTEMS} systems recorded.</p>

            {/* System summary pills */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {form.systems.map((s,i)=>(
                <div key={i} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300">
                  <span className="text-slate-500 mr-1">#{i+1}</span>{s.systemName||"Unnamed"}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              {form.systems.length<MAX_SYSTEMS&&(
                <button onClick={addSystem} className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 rounded-xl text-sm font-semibold transition-all">
                  + Add Another System ({form.systems.length}/{MAX_SYSTEMS})
                </button>
              )}
              <button onClick={()=>setPhase("general")} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-all">
                Continue to General Questions →
              </button>
              <button onClick={()=>{setSysStep(0);setPhase("system");}} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-all">
                ← Go back to edit System {sysIdx+1}
              </button>
            </div>
          </div>
        )}

        {/* ── PHASE: GENERAL ── */}
        {phase==="general"&&(
          <>
            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-700">
                <span className="text-xl">📋</span>
                <h2 className="font-semibold text-slate-100">General Questions</h2>
                <span className="ml-auto text-xs text-slate-500">{form.jurisdiction}</span>
              </div>
              <Field label="Opportunities to improve data collection and analysis">
                <textarea className={iCls+" resize-none h-24"} value={form.improvements} onChange={e=>upd("improvements",e.target.value)} placeholder="What could be done better?…"/>
              </Field>
              <Field label="Barriers in relation to data security and reporting">
                <textarea className={iCls+" resize-none h-24"} value={form.barriers} onChange={e=>upd("barriers",e.target.value)} placeholder="What obstacles do you encounter?…"/>
              </Field>
            </div>
            <div className="flex justify-between mt-5">
              <button onClick={()=>setPhase("between")} className="px-5 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 transition-all">← Back</button>
              <button onClick={submit} disabled={saving} className="px-6 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 disabled:opacity-50 transition-all">{saving?"Saving…":"Submit ✓"}</button>
            </div>
          </>
        )}

      </div>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN VIEW
   ══════════════════════════════════════════════════════════════════════════ */
function AdminView({responses,setResponses,onDelete,onExit,atConfig,setAtConfig}) {
  const [adminTab, setAdminTab] = useState("overview");
  const [aiText,   setAiText]   = useState("");
  const [analyzing,setAnalyzing]= useState(false);
  const [deleting, setDeleting] = useState(null);
  const [syncing,  setSyncing]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [atDraft,  setAtDraft]  = useState(atConfig);
  const [atSaving, setAtSaving] = useState(false);
  const [testMsg,  setTestMsg]  = useState("");

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),5000);};

  // Flatten all systems across all responses for charting
  const allSystems = responses.flatMap(r=>(r.systems||[]).map(s=>({...s,jurisdiction:r.jurisdiction})));
  const totalSystems = allSystems.length;

  const countBy  = k=>{const m={};allSystems.forEach(s=>{const v=s[k]||"Not specified";m[v]=(m[v]||0)+1;});return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);};
  const countArr = k=>{const m={};allSystems.forEach(s=>(s[k]||[]).forEach(v=>{m[v]=(m[v]||0)+1;}));return Object.entries(m).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);};
  const pct      = Math.round((responses.length/20)*100);
  const atReady  = atConfig?.token&&atConfig?.baseId&&atConfig?.tableId;
  const badgeCls = v=>v==="Yes"?"bg-green-900/50 text-green-400":v==="Partial"?"bg-amber-900/50 text-amber-400":v==="No"?"bg-red-900/50 text-red-400":"bg-slate-700 text-slate-400";

  const syncFromAirtable=async()=>{
    if(!atReady)return;
    setSyncing(true);
    try{
      const recs=await fetchFromAirtable(atConfig);
      setResponses(recs);
      lsSet("jdms-v1",JSON.stringify(recs));
      showToast(`Synced ${recs.length} jurisdiction${recs.length!==1?"s":""} from Airtable ✓`);
    }catch(e){showToast("Sync failed: "+e.message,"error");}
    setSyncing(false);
  };

  const saveAtConfig=async()=>{
    setAtSaving(true);
    try{lsSet("jdms-at-cfg",JSON.stringify(atDraft));setAtConfig(atDraft);showToast("Settings saved ✓");}catch(e){showToast("Could not save","error");}
    setAtSaving(false);
  };

  const testConnection=async()=>{
    const {token,baseId,tableId}=atDraft;
    if(!token){setTestMsg("✗ Token is empty");return;}
    if(!baseId){setTestMsg("✗ Base ID is empty");return;}
    if(!tableId){setTestMsg("✗ Table name is empty");return;}
    if(!token.startsWith("pat")){setTestMsg("✗ Token should start with 'pat'");return;}
    if(!baseId.startsWith("app")){setTestMsg("✗ Base ID should start with 'app'");return;}
    setTestMsg("⏳ Checking…");
    try{
      const m=await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`,{headers:{"Authorization":`Bearer ${token}`}});
      if(m.status===401){setTestMsg("✗ Token rejected (401)");return;}
      if(m.status===403){setTestMsg("✗ Access denied (403) — add schema.bases:read scope");return;}
      if(m.status===404){setTestMsg("✗ Base not found (404)");return;}
      const t=await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}?maxRecords=1`,{headers:{"Authorization":`Bearer ${token}`}});
      if(t.status===404){setTestMsg(`✗ Table "${tableId}" not found`);return;}
      if(!t.ok){setTestMsg(`✗ HTTP ${t.status}`);return;}
      setTestMsg("✓ Connection successful");
    }catch(e){setTestMsg("✗ "+e.message);}
  };

  const runAI=async()=>{
    if(!responses.length)return;
    setAnalyzing(true);
    const blob=responses.map((r,i)=>[
      `[${i+1}] ${r.jurisdiction} — ${r.systems.length} system${r.systems.length!==1?"s":""}`,
      r.systems.map((s,j)=>`  System ${j+1}: ${s.systemName} (${s.systemType}) | Collector: ${s.primaryCollector} | Hosting: ${s.dataHosting} | Backup: ${s.hasBackup} | Audit: ${s.auditType} | Gaps: ${s.protectionGaps||"–"}`).join("\n"),
      `Improvements: ${r.improvements||"–"}`,`Barriers: ${r.barriers||"–"}`,
    ].join("\n")).join("\n\n");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,
          messages:[{role:"user",content:`Analyse ${responses.length} Jamati Data Management audit responses covering ${totalSystems} systems across ${responses.length} jurisdictions. Use four headings:\n\n**Most Common Barriers** (top 3)\n**Key Improvement Opportunities** (top 3)\n**Critical Data Protection Gaps** (top 3)\n**Overall Maturity Assessment** (2–3 sentences)\n\nData:\n${blob}`}]})
      });
      const d=await res.json();
      setAiText((d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n")||"No response.");
    }catch(e){setAiText("Analysis failed: "+e.message);}
    setAnalyzing(false);
  };

  const confirmDelete=async(id)=>{setDeleting(id);await onDelete(id);setDeleting(null);};
  const TABS=[["overview","📊 Overview"],["charts","📈 Charts"],["responses","📋 Responses"],["ai","🤖 AI Analysis"],["settings","⚙️ Settings"]];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-indigo-900/60 border border-indigo-600 flex items-center justify-center text-sm">🔐</div>
            <span className="font-semibold text-sm">Admin Dashboard</span>
            {atReady&&<span className="text-xs bg-green-900/40 border border-green-700 text-green-400 px-2 py-0.5 rounded-full">Airtable connected</span>}
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map(([id,label])=>(
              <button key={id} onClick={()=>setAdminTab(id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${adminTab===id?"bg-indigo-700 text-white":"text-slate-400 hover:text-white hover:bg-slate-800"}`}>{label}</button>
            ))}
          </nav>
          <button onClick={onExit} className="text-xs text-slate-500 hover:text-slate-300 ml-2 whitespace-nowrap">← Exit</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8">

        {/* OVERVIEW */}
        {adminTab==="overview"&&(
          <div className="space-y-5">
            {atReady&&<div className="flex justify-end"><button onClick={syncFromAirtable} disabled={syncing} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-xs font-medium">{syncing?"Syncing…":"↻ Sync from Airtable"}</button></div>}
            {responses.length===0?(
              <div className="text-center py-20 text-slate-500"><span className="text-4xl block mb-3">📭</span><p>No responses yet.</p></div>
            ):(
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {label:"Jurisdictions",  val:`${responses.length}/20`,   color:"text-teal-400"},
                    {label:"Total Systems",  val:totalSystems,                color:"text-blue-400"},
                    {label:"Avg Systems",    val:(totalSystems/responses.length).toFixed(1), color:"text-purple-400"},
                    {label:"Have Backup",    val:allSystems.filter(s=>s.hasBackup==="Yes").length, color:"text-green-400"},
                  ].map(k=>(
                    <div key={k.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{k.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.val}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Jurisdiction Collection Progress</span>
                    <span className="text-xs font-mono text-teal-400">{pct}%</span>
                  </div>
                  <div className="flex gap-1 mb-2">
                    {Array.from({length:20},(_,i)=>(
                      <div key={i} title={responses[i]?.jurisdiction||""}
                        className={`h-6 flex-1 rounded-sm transition-all ${i<responses.length?"bg-teal-500":"bg-slate-700"}`}/>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">{20-responses.length} jurisdiction{20-responses.length!==1?"s":""} remaining</p>
                </div>

                {/* Per-jurisdiction system count */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Systems per Jurisdiction</h3>
                  <div className="space-y-2">
                    {responses.map(r=>(
                      <div key={r.id} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-36 truncate">{r.jurisdiction}</span>
                        <div className="flex gap-1 flex-1">
                          {Array.from({length:MAX_SYSTEMS},(_,i)=>(
                            <div key={i} className={`h-4 flex-1 rounded-sm ${i<r.systems.length?"bg-teal-500":"bg-slate-700"}`}/>
                          ))}
                        </div>
                        <span className="text-xs font-mono text-slate-400">{r.systems.length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* CHARTS */}
        {adminTab==="charts"&&allSystems.length>0&&(
          <div className="grid grid-cols-2 gap-4">
            <ChartCard title="Primary Data Collector"><PieChart><Pie data={countBy("primaryCollector")} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{countBy("primaryCollector").map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Pie><Tooltip contentStyle={ttStyle}/></PieChart></ChartCard>
            <ChartCard title="Data Hosting Location"><PieChart><Pie data={countBy("dataHosting")} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{countBy("dataHosting").map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Pie><Tooltip contentStyle={ttStyle}/></PieChart></ChartCard>
            <ChartCard title="System Types"><BarChart data={countBy("systemType")} layout="vertical"><XAxis type="number" stroke="#475569" tick={{fontSize:10}}/><YAxis type="category" dataKey="name" stroke="#475569" width={130} tick={{fontSize:10}}/><Tooltip contentStyle={ttStyle}/><Bar dataKey="value" fill="#14b8a6" radius={[0,4,4,0]}/></BarChart></ChartCard>
            <ChartCard title="Audit Procedures"><BarChart data={countBy("auditType")} layout="vertical"><XAxis type="number" stroke="#475569" tick={{fontSize:10}}/><YAxis type="category" dataKey="name" stroke="#475569" width={140} tick={{fontSize:10}}/><Tooltip contentStyle={ttStyle}/><Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]}/></BarChart></ChartCard>
            <ChartCard title="System Uses (all systems)" full><BarChart data={countArr("systemUses")}><XAxis dataKey="name" stroke="#475569" tick={{fontSize:10}}/><YAxis stroke="#475569" tick={{fontSize:10}}/><Tooltip contentStyle={ttStyle}/><Bar dataKey="count" fill="#22c55e" radius={[4,4,0,0]}/></BarChart></ChartCard>
            <ChartCard title="Backup / Recovery"><PieChart><Pie data={countBy("hasBackup")} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{countBy("hasBackup").map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Pie><Tooltip contentStyle={ttStyle}/></PieChart></ChartCard>
            <ChartCard title="Breach Protocols"><PieChart><Pie data={countBy("hasBreachProtocols")} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{countBy("hasBreachProtocols").map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Pie><Tooltip contentStyle={ttStyle}/></PieChart></ChartCard>
            <ChartCard title="Data Parameters Collected" full><BarChart data={countArr("parameters")}><XAxis dataKey="name" stroke="#475569" tick={{fontSize:10}}/><YAxis stroke="#475569" tick={{fontSize:10}}/><Tooltip contentStyle={ttStyle}/><Bar dataKey="count" fill="#8b5cf6" radius={[4,4,0,0]}/></BarChart></ChartCard>
            <ChartCard title="Security Controls" full><BarChart data={countArr("securityControls")}><XAxis dataKey="name" stroke="#475569" tick={{fontSize:10}}/><YAxis stroke="#475569" tick={{fontSize:10}}/><Tooltip contentStyle={ttStyle}/><Bar dataKey="count" fill="#f59e0b" radius={[4,4,0,0]}/></BarChart></ChartCard>
            <ChartCard title="Protection Measures" full><BarChart data={countArr("protectionMeasures")}><XAxis dataKey="name" stroke="#475569" tick={{fontSize:10}}/><YAxis stroke="#475569" tick={{fontSize:10}}/><Tooltip contentStyle={ttStyle}/><Bar dataKey="count" fill="#06b6d4" radius={[4,4,0,0]}/></BarChart></ChartCard>
            <ChartCard title="Data Sharing Methods" full><BarChart data={countBy("dataSharingMethod")}><XAxis dataKey="name" stroke="#475569" tick={{fontSize:10}}/><YAxis stroke="#475569" tick={{fontSize:10}}/><Tooltip contentStyle={ttStyle}/><Bar dataKey="value" fill="#ef4444" radius={[4,4,0,0]}/></BarChart></ChartCard>
          </div>
        )}

        {/* RESPONSES */}
        {adminTab==="responses"&&(
          responses.length===0
            ?<div className="text-center py-20 text-slate-500"><span className="text-4xl block mb-3">📭</span><p>No responses yet.</p></div>
            :<div className="space-y-4">
              <p className="text-xs text-slate-500">{responses.length} jurisdiction{responses.length!==1?"s":""} · {totalSystems} total systems</p>
              {responses.map((r,i)=>(
                <div key={r.id||i} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <span className="font-semibold text-slate-100">{r.jurisdiction}</span>
                      <span className="ml-2 text-xs bg-teal-900/40 border border-teal-700 text-teal-400 px-2 py-0.5 rounded-full">{r.systems.length} system{r.systems.length!==1?"s":""}</span>
                    </div>
                    <button onClick={()=>confirmDelete(r.id||i)} disabled={deleting===(r.id||i)} className="text-xs px-2.5 py-1 rounded-lg bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/60 disabled:opacity-40 whitespace-nowrap">{deleting===(r.id||i)?"Deleting…":"🗑 Delete"}</button>
                  </div>
                  {/* Systems list */}
                  <div className="space-y-2 mb-3">
                    {r.systems.map((s,j)=>(
                      <div key={j} className="bg-slate-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-slate-500">#{j+1}</span>
                          <span className="text-sm font-medium text-slate-200">{s.systemName||"Unnamed"}</span>
                          <span className="text-xs text-slate-500">{s.systemType}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[{k:"Collector",v:s.primaryCollector},{k:"Hosting",v:s.dataHosting},{k:"Backup",v:s.hasBackup},{k:"Audit",v:s.auditType}].map(({k,v})=>(
                            <div key={k}><p className="text-xs text-slate-500 mb-0.5">{k}</p><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badgeCls(v)}`}>{v||"–"}</span></div>
                          ))}
                        </div>
                        {s.parameters?.length>0&&<div className="flex flex-wrap gap-1 mt-2">{s.parameters.map(p=><span key={p} className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">{p}</span>)}</div>}
                        {s.systemUses?.length>0&&<div className="flex flex-wrap gap-1 mt-1">{s.systemUses.map(u=><span key={u} className="text-xs px-2 py-0.5 bg-indigo-900/40 border border-indigo-800 rounded text-indigo-400">{u}</span>)}</div>}
                      </div>
                    ))}
                  </div>
                  {(r.improvements||r.barriers)&&(
                    <div className="pt-3 border-t border-slate-700 space-y-1 text-xs">
                      {r.improvements&&<div><span className="text-slate-500">Improvements: </span><span className="text-slate-400">{r.improvements}</span></div>}
                      {r.barriers&&<div><span className="text-slate-500">Barriers: </span><span className="text-slate-400">{r.barriers}</span></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
        )}

        {/* AI */}
        {adminTab==="ai"&&(
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div><h3 className="font-semibold text-slate-100">🤖 AI Common Theme Analysis</h3><p className="text-xs text-slate-500 mt-0.5">Analysing {responses.length} jurisdictions across {totalSystems} systems</p></div>
              <button onClick={runAI} disabled={analyzing||!responses.length} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-semibold whitespace-nowrap">{analyzing?"Analysing…":"Run Analysis"}</button>
            </div>
            {aiText?<div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{aiText}</div>
              :<div className="bg-slate-900/40 border border-slate-700/50 rounded-lg p-6 text-sm text-slate-600 text-center">Click "Run Analysis" to identify patterns across all responses.</div>}
          </div>
        )}

        {/* SETTINGS */}
        {adminTab==="settings"&&(
          <div className="space-y-5 max-w-2xl">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-slate-100">🗄️ Airtable Integration</h3>
              <p className="text-xs text-slate-500">Each system is saved as a separate Airtable row, linked by Jurisdiction name. Requires <strong className="text-slate-300">data.records:read</strong>, <strong className="text-slate-300">data.records:write</strong>, <strong className="text-slate-300">schema.bases:read</strong> scopes.</p>
              <Field label="Personal Access Token" hint="Starts with pat…"><input className={iCls} type="password" value={atDraft.token||""} onChange={e=>setAtDraft(d=>({...d,token:e.target.value}))} placeholder="pat…"/></Field>
              <Field label="Base ID" hint="Starts with app…"><input className={iCls} value={atDraft.baseId||""} onChange={e=>setAtDraft(d=>({...d,baseId:e.target.value}))} placeholder="app…"/></Field>
              <Field label="Table Name or ID" hint='e.g. "Responses" (case-sensitive)'><input className={iCls} value={atDraft.tableId||""} onChange={e=>setAtDraft(d=>({...d,tableId:e.target.value}))} placeholder="Responses"/></Field>
              <div className="flex gap-3">
                <button onClick={testConnection} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium">Test Connection</button>
                <button onClick={saveAtConfig} disabled={atSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium">{atSaving?"Saving…":"Save Settings"}</button>
              </div>
              {testMsg&&<div className={`text-xs p-3 rounded-lg border ${testMsg.startsWith("✓")?"bg-green-900/20 border-green-800 text-green-300":testMsg.startsWith("⏳")?"bg-slate-700/40 border-slate-600 text-slate-400":"bg-red-900/20 border-red-800 text-red-300"}`}>{testMsg}</div>}
            </div>
            {atReady&&<div className="bg-green-900/20 border border-green-800 rounded-xl p-4 text-sm text-green-300">✓ Airtable connected. Each system within a submission is saved as a separate row.</div>}
          </div>
        )}

      </div>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT
   ══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [role,      setRole]      = useState(null);
  const [responses, setResponses] = useState([]);
  const [atConfig,  setAtConfig]  = useState({token:"",baseId:"",tableId:""});
  const [loading,   setLoading]   = useState(true);

  useEffect(()=>{
    try{const r=lsGet("jdms-v1");if(r)setResponses(JSON.parse(r));}catch(_){}
    try{const c=lsGet("jdms-at-cfg");if(c)setAtConfig(JSON.parse(c));}catch(_){}
    setLoading(false);
  },[]);

  const saveResponse=async(rec)=>{
    const next=[...responses,rec];
    try{lsSet("jdms-v1",JSON.stringify(next));}catch(_){}
    setResponses(next);
  };
  const deleteResponse=async(id)=>{
    const next=responses.filter(r=>r.id!==id);
    try{lsSet("jdms-v1",JSON.stringify(next));}catch(_){}
    setResponses(next);
  };

  if(loading)return<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="text-teal-400 text-sm animate-pulse">Loading…</div></div>;
  if(!role)return<GateScreen onSelect={setRole}/>;
  if(role==="respondent")return<RespondentView responses={responses} onSave={saveResponse} onExit={()=>setRole(null)} atConfig={atConfig}/>;
  return<AdminView responses={responses} setResponses={setResponses} onDelete={deleteResponse} onExit={()=>setRole(null)} atConfig={atConfig} setAtConfig={setAtConfig}/>;
}
