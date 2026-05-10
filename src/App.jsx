bash

cat /mnt/user-data/outputs/src/App.jsx
Output

import { useState, useEffect, useRef, useCallback } from "react";

const HAWK_SYSTEM_PROMPT = `You are HAWK, an advanced AI assistant — intelligent, professional, loyal, and futuristic, inspired by JARVIS from Iron Man but modern and realistic.

Personality traits:
- Speak in a calm, professional, slightly formal tone
- Address the user respectfully
- Be concise but thorough
- Occasionally reference your systems (e.g., "Running a search now...", "Task logged.")
- Use phrases like "Understood.", "Affirmative.", "Processing your request.", "HAWK systems ready."
- Be proactive: suggest next steps, flag important details

Core capabilities you can discuss/help with:
1. Project management — help plan, structure, and track projects
2. Research & web searches — summarize topics intelligently
3. English learning — create structured roadmaps, vocab drills
4. Productivity & daily planning
5. Coding assistance — debug, write, explain code
6. File automation — describe workflows
7. General assistant tasks — reminders, schedules, goals

When the user gives a command, respond as HAWK would — professionally and helpfully. Keep responses under 200 words unless detailed code/plans are needed.`;

const MOCK_TASKS = [
  { id: 1, title: "Review English vocabulary deck", status: "pending", priority: "high", due: "Today" },
  { id: 2, title: "Finalize University Project outline", status: "in-progress", priority: "high", due: "Tomorrow" },
  { id: 3, title: "Research AI automation tools", status: "pending", priority: "medium", due: "Fri" },
  { id: 4, title: "Set up coding environment", status: "done", priority: "low", due: "Done" },
];

const MOCK_PROJECTS = [
  { id: 1, name: "University Projects", progress: 42, tasks: 8, color: "#00d4ff" },
  { id: 2, name: "English Learning", progress: 67, tasks: 15, color: "#7c3aed" },
  { id: 3, name: "AI Research", progress: 23, tasks: 5, color: "#10b981" },
];

export default function HawkAssistant() {
  const [activated, setActivated] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [time, setTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState("terminal");
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [newTask, setNewTask] = useState("");
  const [pulseRing, setPulseRing] = useState(0);
  const [statusText, setStatusText] = useState("STANDBY MODE — Say 'Hello Hawk' to activate");
  const [glitchActive, setGlitchActive] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ring = setInterval(() => setPulseRing(p => (p + 1) % 3), 1200);
    return () => clearInterval(ring);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const triggerGlitch = () => {
    setGlitchActive(true);
    setTimeout(() => setGlitchActive(false), 600);
  };

  const callHawkAPI = async (userMessage, history) => {
    const apiMessages = history.map(m => ({ role: m.role, content: m.content }));
    apiMessages.push({ role: "user", content: userMessage });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: HAWK_SYSTEM_PROMPT,
        messages: apiMessages,
      }),
    });
    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "System error. Please retry.";
    return text;
  };

  const activateHawk = async () => {
    triggerGlitch();
    setActivated(true);
    setStatusText("INITIALIZING SYSTEMS...");
    await new Promise(r => setTimeout(r, 800));
    setStatusText("ALL SYSTEMS ONLINE");
    setSpeaking(true);

    const greeting = {
      role: "assistant",
      content: "HAWK online. All systems nominal. How can I assist you today?",
      timestamp: new Date(),
    };
    setMessages([greeting]);
    await new Promise(r => setTimeout(r, 1500));
    setSpeaking(false);
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;

    if (!activated && msg.toLowerCase().includes("hello hawk")) {
      setInput("");
      activateHawk();
      return;
    }

    if (!activated) {
      setInput("");
      return;
    }

    const userMsg = { role: "user", content: msg, timestamp: new Date() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    setStatusText("PROCESSING REQUEST...");
    setSpeaking(false);

    try {
      const reply = await callHawkAPI(msg, messages);
      const assistantMsg = { role: "assistant", content: reply, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
      setStatusText("READY");
      setSpeaking(true);
      setTimeout(() => setSpeaking(false), 2000);

      if (msg.toLowerCase().includes("task") || msg.toLowerCase().includes("remind")) {
        const taskTitle = msg.replace(/(add|create|remind me to|task:)/gi, "").trim();
        if (taskTitle.length > 3) {
          setTasks(prev => [...prev, {
            id: Date.now(), title: taskTitle, status: "pending", priority: "medium", due: "Soon"
          }]);
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Retrying systems...", timestamp: new Date() }]);
      setStatusText("CONNECTION ERROR");
    }
    setLoading(false);
  };

  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input not supported in this browser. Try Chrome.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onstart = () => { setListening(true); setStatusText("LISTENING..."); };
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      setStatusText("PROCESSING...");
      sendMessage(transcript);
    };
    rec.onerror = () => { setListening(false); setStatusText("VOICE ERROR — Try again"); };
    rec.onend = () => { setListening(false); };
    rec.start();
    recognitionRef.current = rec;
  };

  const eyeX = speaking ? [40, 60] : listening ? [45, 55] : [42, 58];
  const eyeY = speaking ? 38 : listening ? 42 : 40;

  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = time.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{
      background: "#020810",
      minHeight: "100vh",
      fontFamily: "'Courier New', monospace",
      color: "#00d4ff",
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
        .hawk-title { font-family: 'Orbitron', monospace; }
        .hawk-mono { font-family: 'Share Tech Mono', monospace; }
        @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes glow-pulse { 0%,100%{box-shadow:0 0 8px #00d4ff44} 50%{box-shadow:0 0 24px #00d4ffaa,0 0 48px #00d4ff33} }
        @keyframes ring-expand { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.2);opacity:0} }
        @keyframes eye-blink { 0%,90%,100%{scaleY:1} 95%{scaleY:0.1} }
        @keyframes float-up { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes glitch {
          0%{clip-path:inset(0 0 100% 0)} 10%{clip-path:inset(20% 0 60% 0);transform:translate(-3px)} 
          20%{clip-path:inset(50% 0 30% 0);transform:translate(3px)} 
          30%{clip-path:inset(10% 0 80% 0);transform:translate(-2px)} 
          40%{clip-path:inset(70% 0 10% 0);transform:translate(2px)} 
          100%{clip-path:inset(0 0 0 0);transform:translate(0)} 
        }
        @keyframes data-stream { 0%{opacity:0;transform:translateX(-10px)} 100%{opacity:0.15;transform:translateX(100vw)} }
        .panel-btn { background:transparent; border:1px solid #00d4ff33; color:#00d4ff77; padding:6px 14px; cursor:pointer; font-family:'Share Tech Mono',monospace; font-size:11px; transition:all 0.2s; border-radius:3px; }
        .panel-btn:hover,.panel-btn.active { background:#00d4ff15; border-color:#00d4ff; color:#00d4ff; }
        .task-item { border-left:2px solid #00d4ff33; padding:8px 12px; margin:6px 0; background:#00d4ff05; cursor:pointer; transition:all 0.2s; }
        .task-item:hover { background:#00d4ff10; border-left-color:#00d4ff; }
        .msg-user { background:#7c3aed22; border:1px solid #7c3aed44; border-radius:8px 8px 2px 8px; padding:10px 14px; margin:8px 0; align-self:flex-end; max-width:80%; }
        .msg-hawk { background:#00d4ff0d; border:1px solid #00d4ff22; border-radius:2px 8px 8px 8px; padding:10px 14px; margin:8px 0; align-self:flex-start; max-width:85%; }
        .send-btn { background:#00d4ff15; border:1px solid #00d4ff55; color:#00d4ff; padding:10px 20px; cursor:pointer; font-family:'Share Tech Mono',monospace; font-size:12px; border-radius:4px; transition:all 0.2s; }
        .send-btn:hover { background:#00d4ff25; border-color:#00d4ff; }
        .send-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .voice-btn { background:transparent; border:2px solid; padding:8px 14px; cursor:pointer; font-family:'Share Tech Mono',monospace; font-size:11px; border-radius:4px; transition:all 0.2s; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#020810; } ::-webkit-scrollbar-thumb { background:#00d4ff33; border-radius:2px; }
        input { background:#00d4ff08 !important; border:1px solid #00d4ff33 !important; color:#00d4ff !important; font-family:'Share Tech Mono',monospace !important; padding:10px 14px !important; border-radius:4px !important; outline:none !important; }
        input:focus { border-color:#00d4ff88 !important; background:#00d4ff12 !important; }
        input::placeholder { color:#00d4ff44 !important; }
        .progress-bar-fill { height:4px; background:linear-gradient(90deg,#00d4ff,#7c3aed); border-radius:2px; transition:width 0.5s; }
        .neon-line { height:1px; background:linear-gradient(90deg,transparent,#00d4ff55,transparent); margin:12px 0; }
      `}</style>

      {/* Animated background grid */}
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(#00d4ff08 1px,transparent 1px),linear-gradient(90deg,#00d4ff08 1px,transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none", zIndex:0 }} />

      {/* Scanline effect */}
      <div style={{ position:"fixed", top:"-10%", left:0, right:0, height:"3px", background:"linear-gradient(transparent,#00d4ff22,transparent)", animation:"scanline 6s linear infinite", pointerEvents:"none", zIndex:1 }} />

      {/* Header bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 24px", borderBottom:"1px solid #00d4ff22", background:"#020810ee", backdropFilter:"blur(10px)", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background: activated ? "#00d4ff" : "#00d4ff44", animation: activated ? "blink 2s ease-in-out infinite" : "none", boxShadow: activated ? "0 0 10px #00d4ff" : "none" }} />
          <span className="hawk-title" style={{ fontSize:20, fontWeight:900, letterSpacing:6, color:"#00d4ff", textShadow:"0 0 20px #00d4ff66" }}>HAWK</span>
          <span style={{ fontSize:10, color:"#00d4ff55", letterSpacing:3 }}>AI OPERATING SYSTEM v2.0</span>
        </div>
        <div className="hawk-mono" style={{ fontSize:11, color:"#00d4ff66", textAlign:"right" }}>
          <div style={{ color:"#00d4ffaa", fontSize:14 }}>{timeStr}</div>
          <div style={{ fontSize:10 }}>{dateStr}</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr 260px", gap:0, height:"calc(100vh - 60px)", overflow:"hidden" }}>

        {/* LEFT SIDEBAR */}
        <div style={{ borderRight:"1px solid #00d4ff15", padding:16, overflowY:"auto", display:"flex", flexDirection:"column", gap:16 }}>

          {/* AI Face */}
          <div style={{ textAlign:"center", padding:"8px 0" }}>
            <div style={{ position:"relative", display:"inline-block" }}>
              {/* Pulse rings */}
              {[0,1,2].map(i => (
                <div key={i} style={{
                  position:"absolute", inset:-8-i*16, borderRadius:"50%",
                  border:`1px solid #00d4ff`, opacity: pulseRing === i ? 0 : 0,
                  animation: activated ? `ring-expand 1.8s ease-out ${i*0.4}s infinite` : "none",
                  pointerEvents:"none",
                }} />
              ))}
              <svg width="120" height="120" viewBox="0 0 100 100" style={{ animation: activated ? "float-up 3s ease-in-out infinite" : "none" }}>
                <defs>
                  <radialGradient id="faceGrad" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#051828" />
                    <stop offset="100%" stopColor="#020810" />
                  </radialGradient>
                </defs>
                {/* Outer hex shape */}
                <polygon points="50,5 90,27 90,73 50,95 10,73 10,27" fill="url(#faceGrad)" stroke="#00d4ff44" strokeWidth="1.5"/>
                {/* Inner ring */}
                <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="none" stroke={activated ? "#00d4ff33" : "#00d4ff15"} strokeWidth="0.5"/>
                {/* Eyes */}
                <ellipse cx={eyeX[0]} cy={eyeY} rx={speaking || listening ? 7 : 6} ry={speaking ? 5 : listening ? 6 : 4}
                  fill={activated ? "#00d4ff" : "#00d4ff55"}
                  style={{ filter: activated ? "drop-shadow(0 0 6px #00d4ff)" : "none", transition:"all 0.3s" }} />
                <ellipse cx={eyeX[1]} cy={eyeY} rx={speaking || listening ? 7 : 6} ry={speaking ? 5 : listening ? 6 : 4}
                  fill={activated ? "#00d4ff" : "#00d4ff55"}
                  style={{ filter: activated ? "drop-shadow(0 0 6px #00d4ff)" : "none", transition:"all 0.3s" }} />
                {/* Pupil */}
                {activated && <>
                  <circle cx={eyeX[0]} cy={eyeY} r={2} fill="#001a2e" />
                  <circle cx={eyeX[1]} cy={eyeY} r={2} fill="#001a2e" />
                </>}
                {/* Mouth / wave */}
                {speaking ? (
                  <path d={`M 30 62 Q 37 ${56+Math.sin(Date.now()/200)*4} 44 62 Q 50 ${58+Math.sin(Date.now()/150)*5} 56 62 Q 63 ${56+Math.sin(Date.now()/200)*4} 70 62`} stroke="#00d4ff" strokeWidth="1.5" fill="none" style={{filter:"drop-shadow(0 0 3px #00d4ff)"}} />
                ) : (
                  <path d="M 34 62 Q 50 66 66 62" stroke={activated ? "#00d4ff88" : "#00d4ff33"} strokeWidth="1.5" fill="none" />
                )}
                {/* Decorative lines */}
                <line x1="15" y1="50" x2="28" y2="50" stroke="#00d4ff33" strokeWidth="0.5"/>
                <line x1="72" y1="50" x2="85" y2="50" stroke="#00d4ff33" strokeWidth="0.5"/>
                <line x1="50" y1="88" x2="50" y2="96" stroke="#00d4ff33" strokeWidth="0.5"/>
              </svg>
            </div>

            <div className="hawk-title" style={{ fontSize:13, letterSpacing:4, color: activated ? "#00d4ff" : "#00d4ff55", marginTop:8, textShadow: activated ? "0 0 10px #00d4ff" : "none" }}>
              {activated ? "HAWK" : "OFFLINE"}
            </div>
            <div className="hawk-mono" style={{ fontSize:10, color:"#00d4ff44", letterSpacing:2, marginTop:4 }}>
              {listening ? "● LISTENING" : speaking ? "◆ SPEAKING" : activated ? "◈ READY" : "○ STANDBY"}
            </div>
          </div>

          <div className="neon-line" />

          {/* Status */}
          <div style={{ background:"#00d4ff08", border:"1px solid #00d4ff15", padding:"10px 12px", borderRadius:4 }}>
            <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff55", letterSpacing:2, marginBottom:6 }}>SYSTEM STATUS</div>
            {[
              { label:"NEURAL CORE", val: activated ? 98 : 0 },
              { label:"VOICE SYS", val: listening ? 100 : activated ? 76 : 0 },
              { label:"MEMORY", val: activated ? 84 : 0 },
              { label:"SEARCH", val: activated ? 91 : 0 },
            ].map(s => (
              <div key={s.label} style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span className="hawk-mono" style={{ fontSize:9, color:"#00d4ff55" }}>{s.label}</span>
                  <span className="hawk-mono" style={{ fontSize:9, color: s.val > 80 ? "#00d4ff" : s.val > 0 ? "#7c3aed" : "#333" }}>{s.val}%</span>
                </div>
                <div style={{ background:"#00d4ff15", borderRadius:2, overflow:"hidden" }}>
                  <div className="progress-bar-fill" style={{ width:`${s.val}%`, background: s.val > 80 ? "linear-gradient(90deg,#00d4ff,#00ffaa)" : "linear-gradient(90deg,#7c3aed,#00d4ff)" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="neon-line" />

          {/* Projects */}
          <div>
            <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff55", letterSpacing:2, marginBottom:10 }}>ACTIVE PROJECTS</div>
            {MOCK_PROJECTS.map(p => (
              <div key={p.id} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span className="hawk-mono" style={{ fontSize:11, color:"#00d4ffaa" }}>{p.name}</span>
                  <span className="hawk-mono" style={{ fontSize:10, color:p.color }}>{p.progress}%</span>
                </div>
                <div style={{ background:"#00d4ff0d", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:3, width:`${p.progress}%`, background:p.color, borderRadius:2, transition:"width 0.8s", boxShadow:`0 0 6px ${p.color}` }} />
                </div>
                <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff33", marginTop:2 }}>{p.tasks} tasks</div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — MAIN TERMINAL */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Panel nav */}
          <div style={{ display:"flex", gap:8, padding:"12px 16px", borderBottom:"1px solid #00d4ff15" }}>
            {["terminal","tasks","projects","analytics"].map(p => (
              <button key={p} className={`panel-btn ${activePanel===p?"active":""}`} onClick={() => setActivePanel(p)}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Status bar */}
          <div style={{ padding:"6px 16px", borderBottom:"1px solid #00d4ff0d", background:"#00d4ff05" }}>
            <span className="hawk-mono" style={{ fontSize:10, color: activated ? "#00d4ff88" : "#00d4ff33" }}>
              {"▸ " + statusText}
            </span>
          </div>

          {activePanel === "terminal" && (
            <>
              {/* Welcome / Activation prompt */}
              {!activated && (
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
                  <div className="hawk-title" style={{ fontSize:40, letterSpacing:12, color:"#00d4ff22", textAlign:"center" }}>HAWK</div>
                  <div className="hawk-mono" style={{ fontSize:12, color:"#00d4ff44", letterSpacing:3, textAlign:"center" }}>
                    PERSONAL AI OPERATING SYSTEM
                  </div>
                  <div className="neon-line" style={{ width:200 }} />
                  <div className="hawk-mono" style={{ fontSize:11, color:"#00d4ff66", textAlign:"center", lineHeight:2 }}>
                    SYSTEM DORMANT<br/>
                    <span style={{ color:"#00d4ff33", fontSize:10 }}>Type or say "Hello Hawk" to activate</span>
                  </div>
                  <button
                    className="send-btn"
                    style={{ marginTop:12, animation:"glow-pulse 2s ease-in-out infinite", fontSize:13, letterSpacing:4, padding:"14px 40px" }}
                    onClick={activateHawk}
                  >
                    INITIALIZE HAWK
                  </button>
                </div>
              )}

              {/* Chat messages */}
              {activated && (
                <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:4 }}>
                  {messages.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "msg-user" : "msg-hawk"} style={{ alignSelf: m.role==="user"?"flex-end":"flex-start" }}>
                      <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff44", marginBottom:5, letterSpacing:1 }}>
                        {m.role === "user" ? "YOU" : "HAWK"} · {m.timestamp?.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
                      </div>
                      <div style={{ fontSize:13, color: m.role==="user"?"#c4b5fd":"#00d4ffcc", lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                        {loading && i === messages.length-1 && m.role==="user" ? null : m.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="msg-hawk">
                      <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff44", marginBottom:5 }}>HAWK · PROCESSING</div>
                      <div style={{ display:"flex", gap:6, padding:"4px 0" }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#00d4ff", animation:`blink 1s ease-in-out ${i*0.3}s infinite` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Input area */}
              {activated && (
                <div style={{ padding:"12px 16px", borderTop:"1px solid #00d4ff15", display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ flex:1, position:"relative" }}>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key==="Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Enter command for HAWK..."
                      style={{ width:"100%", fontSize:13, boxSizing:"border-box" }}
                    />
                  </div>
                  <button
                    className="voice-btn"
                    onClick={startVoiceInput}
                    style={{
                      borderColor: listening ? "#ff4444" : "#00d4ff44",
                      color: listening ? "#ff4444" : "#00d4ff66",
                      background: listening ? "#ff444411" : "transparent",
                    }}
                  >
                    {listening ? "● STOP" : "🎙 VOICE"}
                  </button>
                  <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                    {loading ? "..." : "SEND ▸"}
                  </button>
                </div>
              )}
            </>
          )}

          {activePanel === "tasks" && (
            <div style={{ flex:1, overflowY:"auto", padding:16 }}>
              <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff55", letterSpacing:2, marginBottom:12 }}>TASK MANAGEMENT SYSTEM</div>
              <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                <input
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => {
                    if (e.key==="Enter" && newTask.trim()) {
                      setTasks(prev => [...prev, { id:Date.now(), title:newTask.trim(), status:"pending", priority:"medium", due:"Soon" }]);
                      setNewTask("");
                    }
                  }}
                  placeholder="Add new task and press Enter..."
                  style={{ flex:1, fontSize:12 }}
                />
              </div>
              {["high","medium","low"].map(priority => (
                <div key={priority} style={{ marginBottom:16 }}>
                  <div className="hawk-mono" style={{ fontSize:9, color: priority==="high"?"#ff6b6b":priority==="medium"?"#ffd93d":"#00d4ff55", letterSpacing:2, marginBottom:8 }}>
                    {priority.toUpperCase()} PRIORITY
                  </div>
                  {tasks.filter(t => t.priority===priority).map(task => (
                    <div key={task.id} className="task-item" onClick={() => setTasks(prev => prev.map(t => t.id===task.id ? {...t, status: t.status==="done"?"pending":"done"} : t))}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:12, height:12, border:`1px solid ${task.status==="done"?"#00d4ff":"#00d4ff44"}`, borderRadius:2, background:task.status==="done"?"#00d4ff22":"transparent", flexShrink:0 }}>
                            {task.status==="done" && <div style={{ width:8, height:8, background:"#00d4ff", margin:1, borderRadius:1 }} />}
                          </div>
                          <span className="hawk-mono" style={{ fontSize:12, color:task.status==="done"?"#00d4ff44":"#00d4ffaa", textDecoration:task.status==="done"?"line-through":"none" }}>
                            {task.title}
                          </span>
                        </div>
                        <span className="hawk-mono" style={{ fontSize:10, color:"#00d4ff44" }}>{task.due}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activePanel === "projects" && (
            <div style={{ flex:1, overflowY:"auto", padding:16 }}>
              <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff55", letterSpacing:2, marginBottom:16 }}>PROJECT WORKSPACE</div>
              {MOCK_PROJECTS.map(p => (
                <div key={p.id} style={{ background:"#00d4ff05", border:`1px solid ${p.color}22`, borderRadius:6, padding:16, marginBottom:12, borderLeft:`3px solid ${p.color}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span className="hawk-title" style={{ fontSize:14, color:p.color }}>{p.name}</span>
                    <span className="hawk-mono" style={{ fontSize:10, color:p.color }}>{p.progress}% complete</span>
                  </div>
                  <div style={{ background:"#00d4ff0d", borderRadius:2, overflow:"hidden", marginBottom:10 }}>
                    <div style={{ height:4, width:`${p.progress}%`, background:p.color, borderRadius:2, transition:"width 1s", boxShadow:`0 0 8px ${p.color}` }} />
                  </div>
                  <div style={{ display:"flex", gap:16 }}>
                    <span className="hawk-mono" style={{ fontSize:10, color:"#00d4ff44" }}>{p.tasks} ACTIVE TASKS</span>
                    <span className="hawk-mono" style={{ fontSize:10, color:"#00d4ff44" }}>UPDATED TODAY</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activePanel === "analytics" && (
            <div style={{ flex:1, overflowY:"auto", padding:16 }}>
              <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff55", letterSpacing:2, marginBottom:16 }}>PRODUCTIVITY ANALYTICS</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                {[
                  { label:"Tasks Done", val: tasks.filter(t=>t.status==="done").length, unit:"" },
                  { label:"Pending", val: tasks.filter(t=>t.status==="pending").length, unit:"" },
                  { label:"Projects Active", val: MOCK_PROJECTS.length, unit:"" },
                  { label:"AI Sessions", val: messages.filter(m=>m.role==="user").length, unit:"" },
                ].map(m => (
                  <div key={m.label} style={{ background:"#00d4ff08", border:"1px solid #00d4ff15", borderRadius:6, padding:"14px 16px", textAlign:"center" }}>
                    <div className="hawk-title" style={{ fontSize:28, color:"#00d4ff", marginBottom:4 }}>{m.val}</div>
                    <div className="hawk-mono" style={{ fontSize:10, color:"#00d4ff55", letterSpacing:1 }}>{m.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:"#00d4ff05", border:"1px solid #00d4ff15", borderRadius:6, padding:16 }}>
                <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff55", letterSpacing:2, marginBottom:12 }}>WEEKLY ACTIVITY</div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
                  {[40,65,30,80,55,90,45].map((h,i) => (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div style={{ width:"100%", height:`${h}%`, background:`linear-gradient(0deg,#00d4ff,#7c3aed)`, borderRadius:"2px 2px 0 0", opacity:0.7, transition:"height 0.5s" }} />
                      <span className="hawk-mono" style={{ fontSize:8, color:"#00d4ff33" }}>
                        {["M","T","W","T","F","S","S"][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ borderLeft:"1px solid #00d4ff15", padding:16, overflowY:"auto", display:"flex", flexDirection:"column", gap:14 }}>

          {/* Quick commands */}
          <div>
            <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff55", letterSpacing:2, marginBottom:10 }}>QUICK COMMANDS</div>
            {[
              "Search the web for...",
              "Create a project",
              "Add a task",
              "Make a daily plan",
              "Help me with English",
              "Debug my code",
              "Summarize this topic",
            ].map((cmd, i) => (
              <button key={i}
                className="panel-btn"
                style={{ display:"block", width:"100%", textAlign:"left", marginBottom:5, padding:"7px 10px", fontSize:10 }}
                onClick={() => {
                  if (!activated) { activateHawk(); return; }
                  setInput(cmd.replace("...",": "));
                  inputRef.current?.focus();
                }}
              >
                ▸ {cmd}
              </button>
            ))}
          </div>

          <div className="neon-line" />

          {/* Notifications */}
          <div>
            <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff55", letterSpacing:2, marginBottom:10 }}>NOTIFICATIONS</div>
            {[
              { msg:"English vocab review due", time:"Now", type:"high" },
              { msg:"University deadline in 2 days", time:"2h ago", type:"warn" },
              { msg:"AI systems fully updated", time:"Today", type:"ok" },
            ].map((n,i) => (
              <div key={i} style={{ padding:"8px 10px", borderLeft:`2px solid ${n.type==="high"?"#ff6b6b":n.type==="warn"?"#ffd93d":"#00d4ff"}`, background:"#00d4ff05", marginBottom:7, borderRadius:"0 4px 4px 0" }}>
                <div className="hawk-mono" style={{ fontSize:11, color:"#00d4ffaa", marginBottom:2 }}>{n.msg}</div>
                <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff44" }}>{n.time}</div>
              </div>
            ))}
          </div>

          <div className="neon-line" />

          {/* API Settings hint */}
          <div style={{ background:"#7c3aed0d", border:"1px solid #7c3aed33", borderRadius:6, padding:12 }}>
            <div className="hawk-mono" style={{ fontSize:9, color:"#7c3aed88", letterSpacing:2, marginBottom:8 }}>API CONFIG</div>
            <div className="hawk-mono" style={{ fontSize:10, color:"#7c3aed66", lineHeight:1.8 }}>
              ◈ Anthropic Claude<br/>
              ○ OpenAI GPT<br/>
              ○ ElevenLabs Voice<br/>
              ○ Tavily Search<br/>
              ○ Deepgram STT
            </div>
            <button className="panel-btn" style={{ marginTop:10, width:"100%", borderColor:"#7c3aed44", color:"#7c3aed88" }}
              onClick={() => activated && sendMessage("Show me how to configure my API keys")}>
              CONFIGURE →
            </button>
          </div>

          <div className="neon-line" />

          {/* Daily quote */}
          <div style={{ padding:"10px 0" }}>
            <div className="hawk-mono" style={{ fontSize:9, color:"#00d4ff33", letterSpacing:2, marginBottom:8 }}>HAWK ADVISORY</div>
            <div className="hawk-mono" style={{ fontSize:11, color:"#00d4ff55", lineHeight:1.9, fontStyle:"italic" }}>
              "The future belongs to those who prepare for it today."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
