import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  head: () => ({
    meta: [
      { title: 'Unsubscribe — GetBizMusic' },
      {
        name: 'description',
        content: 'Manage your GetBizMusic email preferences and unsubscribe from future emails.',
      },
      { name: 'robots', content: 'noindex,nofollow' },
      { property: 'og:title', content: 'Unsubscribe — GetBizMusic' },
      {
        property: 'og:description',
        content: 'Manage your GetBizMusic email preferences.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: UnsubscribePage,
})

type State = 'loading' | 'confirm' | 'done' | 'already' | 'invalid' | 'error'

function UnsubscribePage() {
  const [state, setState] = useState<State>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token')
    setToken(t)
    if (!t) {
      setState('invalid')
      return
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) return setState('invalid')
        if (body.valid) return setState('confirm')
        if (body.reason === 'already_unsubscribed') return setState('already')
        setState('invalid')
      })
      .catch(() => setState('error'))
  }, [])

  const confirm = async () => {
    if (!token) return
    setPending(true)
    try {
      const res = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) setState('invalid')
      else if (body.success) setState('done')
      else if (body.reason === 'already_unsubscribed') setState('already')
      else setState('error')
    } catch {
      setState('error')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <h1 className="text-2xl font-bold text-white">Email preferences</h1>

        {state === 'loading' && (
          <p className="mt-4 text-sm text-white/70">Checking your link…</p>
        )}

        {state === 'confirm' && (
          <>
            <p className="mt-4 text-sm text-white/80">
              Unsubscribe from GetBizMusic emails? You&apos;ll stop receiving all future
              messages at this address.
            </p>
            <button
              onClick={confirm}
              disabled={pending}
              className="mt-6 w-full rounded-lg bg-amber-400 px-4 py-3 font-semibold text-slate-900 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {pending ? 'Unsubscribing…' : 'Confirm unsubscribe'}
            </button>
          </>
        )}

        {state === 'done' && (
          <p className="mt-4 text-sm text-white/80">
            You&apos;re unsubscribed. We won&apos;t email this address again.
          </p>
        )}

        {state === 'already' && (
          <p className="mt-4 text-sm text-white/80">
            This address is already unsubscribed — no further action needed.
          </p>
        )}

        {state === 'invalid' && (
          <p className="mt-4 text-sm text-white/80">
            This unsubscribe link is invalid or has expired. Reply to any of our emails and
            we&apos;ll remove you manually.
          </p>
        )}

        {state === 'error' && (
          <p className="mt-4 text-sm text-white/80">
            Something went wrong. Please try again in a moment.
          </p>
        )}

        <Link
          to="/"
          className="mt-6 inline-block text-sm text-amber-300 underline-offset-4 hover:underline"
        >
          Back to GetBizMusic
        </Link>
      </div>
    </main>
  )
}
