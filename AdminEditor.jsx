import React, { useState, useCallback, useEffect } from 'react'
import { CURRICULUM, TERM_COLOURS } from '../lib/lessonData.js'
import { fetchLesson, saveLesson } from '../lib/lessonService.js'

// ── Simple password gate ─────────────────────────────────────────────────────
const ADMIN_PASSWORD = 'warmup2024'

function PasswordGate({ onUnlock }) {
  const [val, setVal] = useState('')
  const [err, setErr] = useState(false)

  const attempt = () => {
    if (val === ADMIN_PASSWORD) { onUnlock() }
    else { setErr(true); setVal('') }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', gap: '1.2rem',
    }}>
      <div style={{ fontSize: '2rem' }}>🔒</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text)', letterSpacing: '0.05em' }}>
        Admin Access
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Enter the admin password to edit lessons</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="password"
          value={val}
          onChange={e => { setVal(e.target.value); setErr(false) }}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Password"
          style={{
            padding: '0.55rem 1rem', borderRadius: 'var(--r-md)',
            border: `1px solid ${err ? '#e63946' : 'var(--border-hi)'}`,
            background: 'var(--bg-surface)', color: 'var(--text)',
            fontFamily: 'var(--font-body)', fontSize: '0.9rem', width: '220px',
            outline: 'none',
          }}
          autoFocus
        />
        <button onClick={attempt} style={{
          padding: '0.55rem 1.2rem', borderRadius: 'var(--r-md)',
          background: '#3b82f6', color: '#fff', border: 'none',
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem',
          cursor: 'pointer',
        }}>Enter</button>
      </div>
      {err && <p style={{ color: '#e63946', fontSize: '0.8rem' }}>Incorrect password</p>}
    </div>
  )
}

// ── Tag (for field labels) ────────────────────────────────────────────────────
function Tag({ children, colour }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.1rem 0.55rem',
      borderRadius: '20px', background: colour + '22',
      color: colour, fontSize: '0.7rem', fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>{children}</span>
  )
}

// ── Editable text field ───────────────────────────────────────────────────────
function Field({ label, value, onChange, multiline = false, hint, accent = '#3b82f6' }) {
  const [focused, setFocused] = useState(false)
  const commonStyle = {
    width: '100%', padding: '0.6rem 0.75rem',
    background: 'var(--bg)', color: 'var(--text)',
    border: `1px solid ${focused ? accent : 'var(--border-hi)'}`,
    borderRadius: 'var(--r-md)', fontFamily: 'var(--font-body)',
    fontSize: '0.82rem', lineHeight: 1.5, resize: multiline ? 'vertical' : 'none',
    outline: 'none', transition: 'border-color 0.15s',
  }
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
        {label}
        {hint && <span style={{ marginLeft: '0.5rem', color: 'var(--text-dim)', fontWeight: 400 }}>{hint}</span>}
      </label>
      {multiline
        ? <textarea value={value || ''} onChange={e => onChange(e.target.value)}
            rows={4} style={commonStyle}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        : <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
            style={commonStyle}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
    </div>
  )
}

// ── Array editor (for sentences / tasks) ─────────────────────────────────────
function ArrayField({ label, items = [], onChange, accent }) {
  const update = (i, val) => { const a = [...items]; a[i] = val; onChange(a) }
  const add    = () => onChange([...items, ''])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const move   = (i, dir) => {
    const a = [...items]; const j = i + dir
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; onChange(a)
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{label}</label>
        <button onClick={add} style={{
          padding: '0.15rem 0.55rem', borderRadius: '20px',
          background: accent + '22', color: accent,
          border: `1px solid ${accent}44`, fontSize: '0.72rem', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>+ Add</button>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', paddingTop: '0.5rem', minWidth: '1.2rem', textAlign: 'right' }}>
            {i + 1}.
          </span>
          <textarea
            value={item || ''} onChange={e => update(i, e.target.value)}
            rows={2} style={{
              flex: 1, padding: '0.45rem 0.6rem',
              background: 'var(--bg)', color: 'var(--text)',
              border: '1px solid var(--border-hi)', borderRadius: 'var(--r-sm)',
              fontFamily: 'var(--font-body)', fontSize: '0.8rem', resize: 'vertical', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={arrowBtn}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === items.length - 1} style={arrowBtn}>↓</button>
            <button onClick={() => remove(i)} style={{ ...arrowBtn, color: '#e63946' }}>✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}

const arrowBtn = {
  padding: '0.15rem 0.4rem', borderRadius: 'var(--r-sm)',
  background: 'var(--bg-surface)', color: 'var(--text-muted)',
  border: '1px solid var(--border)', fontSize: '0.7rem',
  cursor: 'pointer', lineHeight: 1, fontFamily: 'var(--font-body)',
}

// ── Phase section editor ──────────────────────────────────────────────────────
function PhaseEditor({ title, colour, data = {}, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val })

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--r-lg)',
      border: `1px solid ${colour}33`, padding: '1.2rem',
      marginBottom: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <div style={{ width: 4, height: 20, borderRadius: 2, background: colour }} />
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: colour, letterSpacing: '0.05em' }}>
          {title}
        </h4>
      </div>

      <Field label="Title" value={data.title} onChange={v => set('title', v)} accent={colour} />
      <Field label="Instruction" value={data.instruction} onChange={v => set('instruction', v)} multiline accent={colour} />

      {title === 'I DO' && <>
        <Field label="Example" value={data.example} onChange={v => set('example', v)} multiline accent={colour}
          hint="Use <u>text</u> for underline, <strong>text</strong> for bold" />
        <Field label="Demonstration" value={data.demonstration} onChange={v => set('demonstration', v)} multiline accent={colour} />
        <Field label="Tip" value={data.tip} onChange={v => set('tip', v)} multiline accent={colour} />
      </>}

      {title === 'WE DO' && <>
        <ArrayField label="Sentences / Examples" items={data.sentences} onChange={v => set('sentences', v)} accent={colour} />
        <Field label="Discussion Prompt" value={data.prompt} onChange={v => set('prompt', v)} multiline accent={colour} />
      </>}

      {title === 'YOU DO' && <>
        <ArrayField label="Tasks" items={data.tasks} onChange={v => set('tasks', v)} accent={colour} />
      </>}
    </div>
  )
}

// ── Lesson editor panel ───────────────────────────────────────────────────────
function LessonEditor({ term, week, day, dayColour, onSaved }) {
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true); setSaved(false); setError(null)
    fetchLesson(term, week, day).then(l => {
      setLesson(l ? JSON.parse(JSON.stringify(l)) : null)
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [term, week, day])

  const set = useCallback((key, val) => setLesson(prev => ({ ...prev, [key]: val })), [])

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      await saveLesson(term, week, day, lesson)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved?.()
    } catch (e) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Loading lesson…
    </div>
  )
  if (!lesson) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      No lesson data found for Term {term} Week {week} {day}.
    </div>
  )

  return (
    <div style={{ padding: '1.5rem 2rem 3rem' }}>
      {/* Lesson header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <Tag colour={dayColour}>{day}</Tag>
          <Tag colour="#64748b">Term {term} · Week {week}</Tag>
        </div>
        <Field label="Topic" value={lesson.topic} onChange={v => set('topic', v)} accent={dayColour} />
        <Field label="NZ Curriculum Objective" value={lesson.nzLink} onChange={v => set('nzLink', v)} accent={dayColour} />
      </div>

      <PhaseEditor title="I DO" colour="#3b82f6" data={lesson.iDo} onChange={v => set('iDo', v)} />
      <PhaseEditor title="WE DO" colour="#10b981" data={lesson.weDo} onChange={v => set('weDo', v)} />
      <PhaseEditor title="YOU DO" colour="#f97316" data={lesson.youDo} onChange={v => set('youDo', v)} />

      {/* Save bar */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
        padding: '1rem 0 0.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
        zIndex: 10,
      }}>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '0.65rem 2rem', borderRadius: 'var(--r-md)',
          background: saved ? '#10b981' : dayColour,
          color: '#fff', border: 'none',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem',
          cursor: saving ? 'wait' : 'pointer',
          transition: 'background 0.2s',
          boxShadow: `0 4px 16px ${dayColour}44`,
        }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>

        {error && (
          <div style={{
            padding: '0.5rem 0.9rem', borderRadius: 'var(--r-md)',
            background: '#e6394620', border: '1px solid #e6394644',
            color: '#e63946', fontSize: '0.8rem',
          }}>
            ⚠ {error}
            {error.includes('Supabase') && (
              <span style={{ marginLeft: '0.4rem', opacity: 0.7 }}>
                (Supabase not configured — changes won't persist between sessions)
              </span>
            )}
          </div>
        )}

        {saved && !error && (
          <span style={{ color: '#10b981', fontSize: '0.82rem', fontWeight: 600 }}>
            ✓ Lesson saved to database
          </span>
        )}
      </div>
    </div>
  )
}

// ── Day selector nav ──────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday']
const DAY_COLOURS_MAP = { Monday: '#e63946', Tuesday: '#f4a261', Wednesday: '#2ec4b6', Thursday: '#a855f7' }
const DAY_LABELS = { Monday: 'Vocab & Punc', Tuesday: 'Grammar', Wednesday: 'Sentence Building', Thursday: 'Editing & Craft' }

// ── Main AdminEditor ──────────────────────────────────────────────────────────
export default function AdminEditor({ onClose }) {
  const [unlocked, setUnlocked] = useState(false)
  const [term, setTerm] = useState(1)
  const [week, setWeek] = useState(1)
  const [day, setDay] = useState('Monday')

  const termColour = TERM_COLOURS?.[term] || '#3b82f6'
  const dayColour = DAY_COLOURS_MAP[day] || '#3b82f6'

  const TERMS = Object.keys(CURRICULUM).map(Number).sort()
  const WEEKS = Object.keys(CURRICULUM[term] || {}).map(Number).sort((a,b) => a-b)

  if (!unlocked) return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.05em', color: 'var(--text)' }}>
          Admin Editor
        </span>
        <button onClick={onClose} style={{
          marginLeft: 'auto', padding: '0.3rem 0.8rem',
          borderRadius: 'var(--r-sm)', background: 'var(--bg-surface)',
          color: 'var(--text-muted)', border: '1px solid var(--border)',
          cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)',
        }}>✕ Close</button>
      </div>
      <PasswordGate onUnlock={() => setUnlocked(true)} />
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
        position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.05em', color: 'var(--text)' }}>
          ✎ Lesson Editor
        </span>
        <Tag colour="#64748b">Admin</Tag>
        <button onClick={onClose} style={{
          marginLeft: 'auto', padding: '0.35rem 1rem',
          borderRadius: 'var(--r-sm)', background: 'var(--bg-surface)',
          color: 'var(--text-muted)', border: '1px solid var(--border)',
          cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)', fontWeight: 600,
        }}>✕ Back to App</button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Left sidebar: navigation ── */}
        <div style={{
          width: '220px', flexShrink: 0, overflowY: 'auto',
          borderRight: '1px solid var(--border)', background: 'var(--bg-card)',
          padding: '1rem 0',
        }}>
          {/* Term selector */}
          <div style={{ padding: '0 1rem 0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Term
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {TERMS.map(t => (
                <button key={t} onClick={() => { setTerm(t); setWeek(1) }} style={{
                  padding: '0.25rem 0.65rem', borderRadius: 'var(--r-sm)',
                  background: term === t ? '#3b82f6' : 'var(--bg-surface)',
                  color: term === t ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)', fontSize: '0.78rem',
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>T{t}</button>
              ))}
            </div>
          </div>

          {/* Week selector */}
          <div style={{ padding: '0 1rem' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Week
            </div>
            {WEEKS.map(w => (
              <button key={w} onClick={() => setWeek(w)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '0.4rem 0.75rem', borderRadius: 'var(--r-sm)',
                background: week === w ? '#3b82f620' : 'transparent',
                color: week === w ? '#3b82f6' : 'var(--text-muted)',
                border: 'none', fontSize: '0.82rem', fontWeight: week === w ? 700 : 400,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                marginBottom: '0.1rem',
              }}>
                Week {w}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: day tabs + editor ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>

          {/* Day tab bar */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-card)', flexShrink: 0, padding: '0 1.5rem',
          }}>
            {DAYS.map(d => {
              const c = DAY_COLOURS_MAP[d]
              const active = day === d
              return (
                <button key={d} onClick={() => setDay(d)} style={{
                  padding: '0.75rem 1rem', border: 'none',
                  borderBottom: active ? `2px solid ${c}` : '2px solid transparent',
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: active ? 700 : 400,
                  fontSize: '0.82rem', color: active ? c : 'var(--text-muted)',
                  transition: 'color 0.15s, border-color 0.15s',
                  marginBottom: '-1px',
                }}>
                  <span style={{ display: 'block' }}>{d}</span>
                  <span style={{ display: 'block', fontSize: '0.65rem', opacity: 0.7 }}>{DAY_LABELS[d]}</span>
                </button>
              )
            })}
          </div>

          {/* Breadcrumb */}
          <div style={{
            padding: '0.6rem 2rem', background: 'var(--bg-surface)',
            fontSize: '0.75rem', color: 'var(--text-dim)',
            borderBottom: '1px solid var(--border)',
          }}>
            Term {term} → Week {week} → <span style={{ color: dayColour, fontWeight: 600 }}>{day}</span>
            <span style={{ marginLeft: '0.75rem', opacity: 0.6 }}>— {DAY_LABELS[day]}</span>
          </div>

          {/* Editor */}
          <LessonEditor
            key={`${term}-${week}-${day}`}
            term={term} week={week} day={day}
            dayColour={dayColour}
          />
        </div>
      </div>
    </div>
  )
}
