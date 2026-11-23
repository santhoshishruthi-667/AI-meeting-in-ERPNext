export const INITIAL_MEETINGS = [
  {
    id: 'MEET-2026-001',
    title: 'ERPNext v15 Custom Workflow & AI Integration Sprint',
    project: 'PROJ-001',
    projectName: 'ERPNext AI Module Integration',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    duration: '45 mins',
    gmeetLink: 'https://meet.google.com/xyz-abc-erp',
    status: 'Scheduled',
    organizer: 'Host',
    attendees: [],
    transcript: []
  }
];
