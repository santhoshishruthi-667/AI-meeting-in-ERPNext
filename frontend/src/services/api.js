import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getProjects = async () => {
  const res = await apiClient.get('/api/projects');
  return res.data.projects;
};

export const getMeetings = async () => {
  const res = await apiClient.get('/api/meetings');
  return res.data;
};

export const getMeetingById = async (meetingId) => {
  const res = await apiClient.get(`/api/meetings/${meetingId}`);
  return res.data;
};

export const updateMeeting = async (meetingId, updateData) => {
  const res = await apiClient.put(`/api/meetings/${meetingId}`, updateData);
  return res.data;
};

export const createMeeting = async (meetingData) => {
  const res = await apiClient.post('/api/meetings', meetingData);
  return res.data;
};

export const addParticipantToMeeting = async (meetingId, email, name = '') => {
  const res = await apiClient.post(`/api/meetings/${meetingId}/invite`, { email, name });
  return res.data.meeting;
};

export const removeParticipantFromMeeting = async (meetingId, email) => {
  const res = await apiClient.delete(`/api/meetings/${meetingId}/invite/${encodeURIComponent(email)}`);
  return res.data.meeting;
};

export const addTranscriptLine = async (meetingId, line) => {
  const res = await apiClient.post(`/api/meetings/${meetingId}/transcript`, line);
  return res.data;
};

export const addBulkTranscript = async (meetingId, payload) => {
  const res = await apiClient.post(`/api/meetings/${meetingId}/transcript-bulk`, payload);
  return res.data;
};

export const extractAITasks = async (transcript, project, projectName, attendees = []) => {
  const res = await apiClient.post('/api/ai/extract-tasks', {
    transcript,
    project,
    projectName,
    attendees,
  });
  return res.data.tasks;
};

export const getERPConfig = async () => {
  const res = await apiClient.get('/api/erpnext/config');
  return res.data;
};

export const saveERPConfig = async (config) => {
  const res = await apiClient.post('/api/erpnext/config', config);
  return res.data;
};

export const testERPConnection = async (config) => {
  const res = await apiClient.post('/api/erpnext/test-connection', config);
  return res.data;
};

export const syncTaskToERPNext = async (task) => {
  const res = await apiClient.post('/api/erpnext/sync-task', task);
  return res.data;
};

export const getSyncedTasks = async () => {
  const res = await apiClient.get('/api/erpnext/synced-tasks');
  return res.data;
};
