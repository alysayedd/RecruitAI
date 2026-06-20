import axios from 'axios'

const rawBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
const baseURL = rawBase.endsWith('/api') ? rawBase : rawBase + '/api'

const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.hash = ''
      window.dispatchEvent(new Event('auth-logout'))
    }
    return Promise.reject(err)
  }
)

export const signup = (name: string, email: string, password: string, role: string = 'hr') =>
  api.post('/auth/signup', { name, email, password, role }).then(r => r.data)

export const verifyEmail = (email: string, code: string) =>
  api.post('/auth/verify-email', { email, code }).then(r => r.data)

export const resendCode = (email: string) =>
  api.post('/auth/resend-code', { email }).then(r => r.data)

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then(r => r.data)

export const getMe = () =>
  api.get('/auth/me').then(r => r.data)

export const updateProfile = (name: string, companyName: string) =>
  api.patch('/auth/me', { name, company_name: companyName }).then(r => r.data)

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }).then(r => r.data)

export const deleteAccount = () =>
  api.delete('/auth/me').then(r => r.data)

export const createJob = (jd_text: string) =>
  api.post('/jobs', { jd_text }).then(r => r.data)

export const listJobs = () =>
  api.get('/jobs').then(r => r.data)

export const getJob = (id: string) =>
  api.get(`/jobs/${id}`).then(r => r.data)

export const uploadCandidates = (job_id: string, files: File[]) => {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  return api.post(`/jobs/${job_id}/candidates`, form).then(r => r.data)
}

export const getCandidates = (job_id: string) =>
  api.get(`/jobs/${job_id}/candidates`).then(r => r.data)

export const getResults = (job_id: string) =>
  api.get(`/jobs/${job_id}/results`).then(r => r.data)

export const downloadReport = async (job_id: string) => {
  const res = await api.get(`/jobs/${job_id}/report`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `report_${job_id.slice(0, 8)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const getHRStats = () =>
  api.get('/dashboard/hr').then(r => r.data)

export const getStudentStats = () =>
  api.get('/student/stats').then(r => r.data)

export const sendChatMessage = (message: string) =>
  api.post('/chat', { message }).then(r => r.data)

export const scrapeJobUrl = (url: string) =>
  api.post('/jobs/scrape-url', { url }).then(r => r.data)

export const draftEmail = (jobId: string, candidateId: string, emailType: string, interviewTime?: string) =>
  api.post(`/jobs/${jobId}/candidates/${candidateId}/draft-email`, {
    email_type: emailType,
    interview_time: interviewTime,
  }).then(r => r.data)

export const sendEmail = (
  jobId: string,
  candidateId: string,
  emailType: string,
  subject: string,
  body: string,
  interviewTime?: string,
) =>
  api.post(`/jobs/${jobId}/candidates/${candidateId}/send-email`, {
    email_type: emailType,
    subject,
    body,
    interview_time: interviewTime,
  }).then(r => r.data)

export default api
