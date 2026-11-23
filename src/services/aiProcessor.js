import { ERPNEXT_USERS } from '../data/erpnextProjects';

/**
 * Intelligent AI transcript parser
 * Analyzes transcript entries and extracts actionable items.
 */
export function extractTasksFromTranscript(transcript, projectInfo = {}) {
  if (!transcript || transcript.length === 0) return [];

  const extractedTasks = [];
  
  // Keyword pattern matchers
  const actionVerbs = [
    'will create', 'will write', 'will draft', 'will prepare', 'will implement',
    'please implement', 'could you prepare', 'can you write', 'assign', 'need to create',
    'need to build', 'need to fix', 'responsible for', 'take care of', 'handle the'
  ];

  transcript.forEach((entry, index) => {
    const text = entry.text;
    const lowerText = text.toLowerCase();

    // Check if entry contains action commitment or assignment directive
    let isAction = actionVerbs.some(verb => lowerText.includes(verb));
    
    // Also check for explicit modal statements like "I will...", "You should...", "Please..."
    if (!isAction && (lowerText.includes('will ') || lowerText.includes('please ') || lowerText.includes('can you '))) {
      isAction = true;
    }

    if (isAction) {
      // Find candidate assignee
      let assignee = null;
      
      // First check if someone is addressed in text (e.g., "Samantha, could you...", "Devon, please...")
      for (const user of ERPNEXT_USERS) {
        const firstName = user.name.split(' ')[0].toLowerCase();
        if (lowerText.includes(firstName)) {
          assignee = user;
          break;
        }
      }

      // If no one explicitly addressed, check if the speaker is committing ("I will...")
      if (!assignee && (lowerText.includes('i will') || lowerText.includes('i can') || lowerText.includes("i'll"))) {
        assignee = ERPNEXT_USERS.find(u => u.name.toLowerCase() === entry.speaker.toLowerCase()) || ERPNEXT_USERS[0];
      }

      // Fallback assignee to speaker or first user
      if (!assignee) {
        assignee = ERPNEXT_USERS.find(u => u.name.toLowerCase() === entry.speaker.toLowerCase()) || ERPNEXT_USERS[0];
      }

      // Priority determination
      let priority = 'Medium';
      if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('critical') || lowerText.includes('today')) {
        priority = 'High';
      } else if (lowerText.includes('next week') || lowerText.includes('later') || lowerText.includes('whenever')) {
        priority = 'Low';
      }

      // Due date extraction (simple heuristics)
      let dueDate = new Date();
      if (lowerText.includes('thursday')) {
        dueDate.setDate(dueDate.getDate() + ((4 + 7 - dueDate.getDay()) % 7 || 7));
      } else if (lowerText.includes('friday')) {
        dueDate.setDate(dueDate.getDate() + ((5 + 7 - dueDate.getDay()) % 7 || 7));
      } else if (lowerText.includes('tomorrow')) {
        dueDate.setDate(dueDate.getDate() + 1);
      } else {
        dueDate.setDate(dueDate.getDate() + 3); // Default 3 days
      }

      const formattedDueDate = dueDate.toISOString().split('T')[0];

      // Clean task title derivation
      let title = text;
      // Strip conversation intro fillers
      title = title.replace(/^(sure thing,|got it\.|yes,|also,|ok,|hey,|welcome everyone!|i will|please|can you)/i, '').trim();
      if (title.length > 80) {
        title = title.substring(0, 77) + '...';
      }
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);

      // Calculate confidence score
      let confidence = 85;
      if (lowerText.includes('will') || lowerText.includes('please')) confidence += 8;
      if (assignee) confidence += 4;
      if (confidence > 98) confidence = 98;

      extractedTasks.push({
        id: `AI-TASK-${Date.now()}-${index}`,
        transcriptId: entry.id,
        title: title || `Action item from ${entry.speaker}`,
        description: `Extracted from live meeting transcript at ${entry.timestamp}:\n"${entry.text}"`,
        rawQuote: entry.text,
        speaker: entry.speaker,
        timestamp: entry.timestamp,
        assigneeName: assignee ? assignee.name : entry.speaker,
        assigneeEmail: assignee ? assignee.email : 'unassigned@company.com',
        assigneeAvatar: assignee ? assignee.avatar : '',
        project: projectInfo.project || 'PROJ-001',
        projectName: projectInfo.projectName || 'ERPNext AI Module Integration',
        priority: priority,
        expEndDate: formattedDueDate,
        status: 'Pending Approval', // 'Pending Approval', 'Approved', 'Synced', 'Rejected'
        confidence: confidence,
        erpnextTaskId: null,
        syncError: null
      });
    }
  });

  return extractedTasks;
}
