import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

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

export const getReportUrl = (job_id: string) =>
  `/api/jobs/${job_id}/report`

export default api
