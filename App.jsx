import React, { useState, useCallback } from 'react'
import SelectorBar from './components/SelectorBar.jsx'
import LessonHeader from './components/LessonHeader.jsx'
import StageDisplay from './components/StageDisplay.jsx'
import FridayAssessment from './components/FridayAssessment.jsx'
import WelcomeState from './components/WelcomeState.jsx'
import AdminEditor from './components/AdminEditor.jsx'
import { fetchLesson } from './lib/lessonService.js'
import { DAY_COLOURS } from './lib/lessonData.js'

export default function App() {
  const [term, setTerm] = useState(1)
  const [week, setWeek] = useState(1)
  const [day, setDay] = useState('Monday')

  const [activeLesson, setActiveLesson] = useState(null)
  const [activeMeta, setActiveMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fridayKey, setFridayKey] = useState(0)
  const [adminOpen, setAdminOpen] = useState(false)

  const handleGo = useCallback(async () => {
    setError(null)

    if (day === 'Friday') {
      setActiveMeta({ term, week, day })
      setActiveLesson('friday')
      setFridayKey(k => k + 1)
      return
    }

    setLoading(true)
    setActiveLesson(null)
    try {
      const lesson = await fetchLesson(term, week, day)
      if (!lesson) throw new Error(`No lesson found for Term ${term}, Week ${week}, ${day}.`)
      setActiveMeta({ term, week, day })
      setActiveLesson(lesson)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [term, week, day])

  const dayColour = DAY_COLOURS[day] || '#a855f7'

  const headerBtnBase = {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.35rem 0.85rem', borderRadius: '6px',
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
    color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', fontWeight: 600,
    letterSpacing: '0.04em', textDecoration: 'none', whiteSpace: 'nowrap',
    transition: 'background 0.15s, border-color 0.15s', cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  }

  return (
    <div className="app-shell">

      {/* ── Admin overlay ── */}
      {adminOpen && <AdminEditor onClose={() => setAdminOpen(false)} />}

      {/* ── Header ── */}
      <header className="site-header">
        <div className="site-header__wordmark">
          Writing <span>Warm-Up.</span>
        </div>
        <div className="site-header__sub">
          NZ Curriculum · Years 5–6 · Phase 2
        </div>

        {/* PDF download */}
        <a
          href="/WritingWarmUp_Showcase.pdf"
          download="WritingWarmUp_Showcase.pdf"
          style={{ ...headerBtnBase, marginLeft: 'auto' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Programme Guide
        </a>

        {/* Admin button — subtle pencil icon */}
        <button
          onClick={() => setAdminOpen(true)}
          title="Admin — Edit Lessons"
          style={{
            marginLeft: '0.5rem', padding: '0.35rem 0.65rem',
            borderRadius: '6px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem',
            cursor: 'pointer', lineHeight: 1, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
        >✎</button>
      </header>

      {/* ── Selector bar ── */}
      <SelectorBar
        term={term}
        week={week}
        day={day}
        onTermChange={setTerm}
        onWeekChange={setWeek}
        onDayChange={setDay}
        onGo={handleGo}
        loading={loading}
      />

      {/* ── Main content ── */}
      <main className="main-content">
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading lesson…</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p style={{ color: '#e63946', fontWeight: 600 }}>⚠ {error}</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              Check your Supabase connection or try a different lesson.
            </p>
          </div>
        )}

        {!loading && !error && !activeLesson && (
          <WelcomeState />
        )}

        {!loading && !error && activeLesson === 'friday' && activeMeta && (
          <FridayAssessment key={fridayKey} term={activeMeta.term} week={activeMeta.week} />
        )}

        {!loading && !error && activeLesson && activeLesson !== 'friday' && activeMeta && (
          <>
            <LessonHeader
              term={activeMeta.term}
              week={activeMeta.week}
              day={activeMeta.day}
              topic={activeLesson.topic}
              nzLink={activeLesson.nzLink}
            />
            <StageDisplay
              lesson={activeLesson}
              dayColour={dayColour}
              onComplete={() => {}}
            />
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="site-footer">
        Writing Warm-Up Programme · NZ Curriculum Years 5–6 · 40 weeks · 4 terms · Spiral design
      </footer>
    </div>
  )
}
