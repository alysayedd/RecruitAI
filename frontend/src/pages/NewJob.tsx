import { useState } from 'react'
import { createJob, scrapeJobUrl } from '../api/client'

interface Props {
  onNavigate: (page: string, jobId?: string) => void
}

const SAMPLE_JD = `Software Engineer – Backend

We are looking for a Python developer with 3+ years experience.

Required: Python, FastAPI, PostgreSQL, REST APIs, Git
Preferred: Docker, Redis, AWS, CI/CD
Education: Bachelor's in Computer Science or equivalent

Responsibilities:
- Build and maintain backend APIs
- Collaborate with frontend teams
- Participate in code reviews
- Write unit tests and documentation`

export default function NewJob({
  onNavigate,
}: Props) {
  const [jdText, setJdText] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [result, setResult] =
    useState<any>(null)

  const [error, setError] =
    useState('')

  const [urlInput, setUrlInput] =
    useState('')

  const [scraping, setScraping] =
    useState(false)

  const [scrapeError, setScrapeError] =
    useState('')

  const handleScrape = async () => {
    if (!urlInput.trim()) return

    setScraping(true)
    setScrapeError('')

    try {
      const res = await scrapeJobUrl(
        urlInput.trim()
      )

      if (
        res.success &&
        res.extracted_text
      ) {
        setJdText(res.extracted_text)
      } else {
        setScrapeError(
          res.error ||
            'Could not extract job description'
        )
      }
    } catch (e: any) {
      setScrapeError(
        e?.response?.data?.detail ||
          'Failed to fetch URL'
      )
    } finally {
      setScraping(false)
    }
  }

  const handleSubmit = async () => {
    if (!jdText.trim()) return

    setLoading(true)
    setError('')

    try {
      const job = await createJob(jdText)
      setResult(job)
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          'Failed to create job'
      )
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const parsed = result.parsed_jd || {}

    return (
      <div className="min-h-screen bg-[#121212] text-white px-6 py-10 relative overflow-hidden">

        {/* Background Curves */}
        <svg
          className="absolute right-0 top-0 h-full w-[45%] pointer-events-none opacity-40"
          viewBox="0 0 600 900"
          fill="none"
        >
          <path
            d="M620 80C360 80 120 240 120 450C120 660 360 820 620 820"
            stroke="url(#gradient1)"
            strokeWidth="1.2"
          />

          <path
            d="M620 220C430 220 250 320 250 450C250 580 430 680 620 680"
            stroke="url(#gradient2)"
            strokeWidth="1"
          />

          <defs>
            <linearGradient
              id="gradient1"
              x1="120"
              y1="450"
              x2="620"
              y2="450"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                stopColor="#ed4690"
                stopOpacity="0"
              />

              <stop
                offset="1"
                stopColor="#f58133"
                stopOpacity="0.7"
              />
            </linearGradient>

            <linearGradient
              id="gradient2"
              x1="250"
              y1="450"
              x2="620"
              y2="450"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                stopColor="#ed4690"
                stopOpacity="0"
              />

              <stop
                offset="1"
                stopColor="#f58133"
                stopOpacity="0.5"
              />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative z-10 max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div>

            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">
              AI Job Analysis
            </p>

            <h1 className="text-4xl font-bold mb-3">
              {result.title}
            </h1>

            <p className="text-gray-500 text-sm font-mono">
              {result.id}
            </p>

          </div>

          {/* Card */}
          <div className="bg-[#1c1c1e]/80 border border-[#2c2c2e] rounded-3xl p-8 backdrop-blur-xl space-y-8">

            {/* Skills */}
            {parsed.required_skills
              ?.length > 0 && (
              <div>

                <p className="text-sm text-gray-400 mb-4 uppercase tracking-wide">
                  Required Skills
                </p>

                <div className="flex flex-wrap gap-3">

                  {parsed.required_skills.map(
                    (s: string) => (
                      <span
                        key={s}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-[#ed4690]/20 to-[#f58133]/20 border border-[#ed4690]/20 text-sm"
                      >
                        {s}
                      </span>
                    )
                  )}

                </div>

              </div>
            )}

            {/* Preferred */}
            {parsed.preferred_skills
              ?.length > 0 && (
              <div>

                <p className="text-sm text-gray-400 mb-4 uppercase tracking-wide">
                  Preferred
                </p>

                <div className="flex flex-wrap gap-3">

                  {parsed.preferred_skills.map(
                    (s: string) => (
                      <span
                        key={s}
                        className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-sm text-gray-300"
                      >
                        {s}
                      </span>
                    )
                  )}

                </div>

              </div>
            )}

            {/* Details */}
            <div className="grid md:grid-cols-2 gap-6">

              <div className="bg-[#121212] border border-[#2c2c2e] rounded-2xl p-6">

                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Minimum Experience
                </p>

                <p className="text-2xl font-semibold">
                  {
                    parsed.min_experience_years
                  }{' '}
                  Years
                </p>

              </div>

              <div className="bg-[#121212] border border-[#2c2c2e] rounded-2xl p-6">

                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Education
                </p>

                <p className="text-2xl font-semibold">
                  {parsed.education_level ||
                    'Not specified'}
                </p>

              </div>

            </div>

            {/* Bias Flags */}
            {parsed.bias_flags?.length >
              0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">

                <p className="text-rose-400 font-semibold mb-3">
                  Bias Flags Detected
                </p>

                <div className="space-y-2">

                  {parsed.bias_flags.map(
                    (
                      flag: string,
                      i: number
                    ) => (
                      <p
                        key={i}
                        className="text-sm text-gray-300"
                      >
                        {flag}
                      </p>
                    )
                  )}

                </div>

              </div>
            )}

          </div>

          {/* Buttons */}
          <div className="flex gap-4">

            <button
              onClick={() =>
                onNavigate(
                  'candidates',
                  result.id
                )
              }
              className="bg-gradient-to-r from-[#ed4690] to-[#f58133] px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Upload CVs
            </button>

            <button
              onClick={() => {
                setResult(null)
                setJdText('')
              }}
              className="border border-[#2c2c2e] bg-[#1c1c1e] px-6 py-3 rounded-xl hover:bg-[#232325] transition-colors"
            >
              Create Another
            </button>

          </div>

        </div>

      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white px-6 py-10 relative overflow-hidden">

      {/* Background Curves */}
      <svg
        className="absolute right-0 top-0 h-full w-[45%] pointer-events-none opacity-40"
        viewBox="0 0 600 900"
        fill="none"
      >
        <path
          d="M620 80C360 80 120 240 120 450C120 660 360 820 620 820"
          stroke="url(#gradient1)"
          strokeWidth="1.2"
        />

        <path
          d="M620 220C430 220 250 320 250 450C250 580 430 680 620 680"
          stroke="url(#gradient2)"
          strokeWidth="1"
        />

        <defs>

          <linearGradient
            id="gradient1"
            x1="120"
            y1="450"
            x2="620"
            y2="450"
          >
            <stop
              stopColor="#ed4690"
              stopOpacity="0"
            />

            <stop
              offset="1"
              stopColor="#f58133"
              stopOpacity="0.7"
            />
          </linearGradient>

          <linearGradient
            id="gradient2"
            x1="250"
            y1="450"
            x2="620"
            y2="450"
          >
            <stop
              stopColor="#ed4690"
              stopOpacity="0"
            />

            <stop
              offset="1"
              stopColor="#f58133"
              stopOpacity="0.5"
            />
          </linearGradient>

        </defs>

      </svg>

      <div className="relative z-10 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10">

          <p className="text-gray-400 leading-relaxed max-w-2xl">
            "Paste a job description or import one
            from a URL. RecruitAI will automatically
            analyze the requirements using AI".
          </p>

        </div>

        {/* Main Card */}
        <div className="bg-[#1c1c1e]/80 border border-[#2c2c2e] rounded-3xl p-8 backdrop-blur-xl space-y-8">

          {/* URL Import */}
          <div>

            <p className="text-sm uppercase tracking-wide text-gray-400 mb-4">
              Import from URL
            </p>

            <div className="flex gap-3">

              <input
                className="flex-1 bg-[#121212] border border-[#2c2c2e] rounded-xl px-5 py-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ed4690]"
                placeholder="Paste LinkedIn or job posting URL..."
                value={urlInput}
                onChange={(e) =>
                  setUrlInput(
                    e.target.value
                  )
                }
              />

              <button
                onClick={handleScrape}
                disabled={
                  scraping ||
                  !urlInput.trim()
                }
                className="bg-[#121212] border border-[#2c2c2e] px-6 rounded-xl hover:bg-[#232325] transition-colors"
              >
                {scraping
                  ? 'Fetching...'
                  : 'Fetch'}
              </button>

            </div>

            {scrapeError && (
              <p className="text-rose-400 text-sm mt-3">
                {scrapeError}
              </p>
            )}

          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">

            <div className="flex-1 h-px bg-[#2c2c2e]" />

            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Or Paste Manually
            </span>

            <div className="flex-1 h-px bg-[#2c2c2e]" />

          </div>

          {/* Textarea */}
          <div>

            <div className="flex items-center justify-between mb-4">

              <p className="text-sm uppercase tracking-wide text-gray-350">
                Job Description
              </p>

              <button
                onClick={() =>
                  setJdText(SAMPLE_JD)
                }
                className="text-sm text-[#ed4690] hover:text-[#f58133] transition-colors"
              >
                Load Sample
              </button>

            </div>

            <textarea
              className="w-full min-h-[320px] bg-[#121212] border border-[#2c2c2e] rounded-2xl px-5 py-5 text-sm leading-relaxed text-white placeholder:text-gray-500 resize-y focus:outline-none focus:border-[#ed4690]"
              placeholder="Paste your job description here..."
              value={jdText}
              onChange={(e) =>
                setJdText(e.target.value)
              }
            />

          </div>

          {/* Error */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-5 py-4 text-sm text-rose-400">
              {error}
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleSubmit}
            disabled={
              loading || !jdText.trim()
            }
            className="w-full bg-gradient-to-r from-[#ed4690] to-[#f58133] py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            {loading
              ? 'Parsing with AI...'
              : 'Parse & Create Job'}
          </button>

        </div>

      </div>

    </div>
  )
}