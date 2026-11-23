from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import datetime
import uuid
import httpx
import re
import random
import string

app = FastAPI(
    title="ERPNext AI Meeting Demo Backend",
    description="Clean, simplified FastAPI backend for AI Meeting & ERPNext Task Sync Demo",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Clean Seed Data & State ---

ERPNEXT_PROJECTS = [
    {"id": "PROJ-001", "name": "ERPNext AI Module Integration", "customer": "Acme Corp"},
    {"id": "PROJ-002", "name": "CRM & Sales Automation", "customer": "Global Tech"},
    {"id": "PROJ-003", "name": "Supply Chain & Warehouse System", "customer": "LogiTrans Inc"},
    {"id": "PROJ-004", "name": "HRMS & Payroll Portal", "customer": "OmniHealth"},
]

MEETINGS_DB: List[Dict[str, Any]] = [
    {
        "id": "MEET-DEMO-01",
        "title": "ERPNext AI Module Integration Sync",
        "project": "PROJ-001",
        "projectName": "ERPNext AI Module Integration",
        "date": datetime.date.today().isoformat(),
        "time": datetime.datetime.now().strftime("%H:%M"),
        "duration": "45 mins",
        "platform": "google_meet",
        "googleMeetLink": "https://meet.google.com/aie-rpne-xtm",
        "meetingUrl": "https://meet.google.com/aie-rpne-xtm",
        "jitsiRoomName": "ERPNext_AI_Meeting_MEET-DEMO-01",
        "jitsiLink": "https://meet.jit.si/ERPNext_AI_Meeting_MEET-DEMO-01",
        "appLink": "http://localhost:3000/?meetingId=MEET-DEMO-01",
        "status": "Scheduled",
        "attendees": [],
        "agenda": "Discuss ERPNext REST API integration, live transcription webhook, and task creation.",
        "transcript": []
    }
]
SYNCED_TASKS_DB: List[Dict[str, Any]] = []

ERP_CONFIG = {
    "host": "http://localhost:8000",
    "apiKey": "demo_api_key",
    "apiSecret": "demo_api_secret",
    "useMockMode": True
}

# --- Pydantic Schemas ---

class MeetingCreateSchema(BaseModel):
    title: str
    project: str
    date: str
    time: str
    duration: Optional[str] = "45 mins"
    agenda: Optional[str] = ""
    platform: Optional[str] = "google_meet"
    googleMeetLink: Optional[str] = None
    jitsiRoomName: Optional[str] = None

class AddParticipantSchema(BaseModel):
    email: str
    name: Optional[str] = ""

class TranscriptEntrySchema(BaseModel):
    speaker: str # Speaker can be an email ID or name
    text: str
    timestamp: Optional[str] = None

class BulkTranscriptSchema(BaseModel):
    raw_text: Optional[str] = None
    entries: Optional[List[TranscriptEntrySchema]] = None
    default_speaker: Optional[str] = "participant@company.com"

class MeetingUpdateSchema(BaseModel):
    status: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = None
    googleMeetLink: Optional[str] = None
    meetingUrl: Optional[str] = None

class ExtractTaskRequestSchema(BaseModel):
    transcript: List[Dict[str, Any]]
    project: Optional[str] = "PROJ-001"
    projectName: Optional[str] = "ERPNext AI Module Integration"
    attendees: Optional[List[Dict[str, Any]]] = []

class ERPNextConfigSchema(BaseModel):
    host: str
    apiKey: str
    apiSecret: str
    useMockMode: bool

class TaskSyncRequestSchema(BaseModel):
    id: str
    title: str
    description: str
    rawQuote: str
    speaker: str
    assigneeName: str
    assigneeEmail: str
    project: str
    priority: str
    expEndDate: str

# --- Endpoints ---

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "FastAPI Demo Backend", "time": datetime.datetime.now().isoformat()}

@app.get("/api/projects")
def get_projects():
    return {"projects": ERPNEXT_PROJECTS}

@app.get("/api/meetings")
def list_meetings():
    return MEETINGS_DB

@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id: str):
    meeting = next((m for m in MEETINGS_DB if m["id"].lower() == meeting_id.lower()), None)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

def generate_meet_code() -> str:
    def rand_letters(n):
        return ''.join(random.choices(string.ascii_lowercase, k=n))
    return f"https://meet.google.com/{rand_letters(3)}-{rand_letters(4)}-{rand_letters(3)}"

def normalize_google_meet_link(link: Optional[str]) -> str:
    if not link or not link.strip() or "new" in link.lower() or "erp-next-ai" in link.lower():
        return generate_meet_code()
    clean = link.strip()
    if clean.startswith("http://") or clean.startswith("https://"):
        return clean
    if clean.startswith("meet.google.com/"):
        return f"https://{clean}"
    return f"https://meet.google.com/{clean}"

@app.put("/api/meetings/{meeting_id}")
def update_meeting(meeting_id: str, data: MeetingUpdateSchema):
    meeting = next((m for m in MEETINGS_DB if m["id"].lower() == meeting_id.lower()), None)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if data.status:
        meeting["status"] = data.status
    if data.transcript is not None:
        meeting["transcript"] = data.transcript
    if data.googleMeetLink:
        meeting["googleMeetLink"] = normalize_google_meet_link(data.googleMeetLink)
        meeting["meetingUrl"] = meeting["googleMeetLink"]
    if data.meetingUrl:
        meeting["meetingUrl"] = data.meetingUrl
    return {"success": True, "meeting": meeting}

def parse_google_meet_transcript(raw_text: str, attendees: List[Dict[str, Any]], default_speaker: str) -> List[Dict[str, str]]:
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    results = []
    speaker_map = {}
    for att in attendees:
        name = (att.get("name") or "").strip().lower()
        email = (att.get("email") or "").strip().lower()
        if name:
            speaker_map[name] = email
        if email:
            prefix = email.split("@")[0].replace(".", " ").lower()
            speaker_map[prefix] = email
            speaker_map[email] = email

    current_speaker = default_speaker
    current_time = datetime.datetime.now().strftime("%I:%M %p")

    inline_pat = re.compile(r'^([^:\(\[\n]+?)(?:\s*[\(\[]?(\d{1,2}:\d{2}(?:\s*[AP]M)?)[\)\]]?)?\s*:\s*(.+)$', re.IGNORECASE)
    bracket_time_pat = re.compile(r'^\[(\d{1,2}:\d{2}(?:\s*[AP]M)?)\]\s*([^:\n]+?)\s*:\s*(.+)$', re.IGNORECASE)
    time_only_pat = re.compile(r'^\d{1,2}:\d{2}(?:\s*[AP]M)?$', re.IGNORECASE)

    i = 0
    while i < len(lines):
        line = lines[i]

        m_bracket = bracket_time_pat.match(line)
        if m_bracket:
            t_str, spk, txt = m_bracket.group(1), m_bracket.group(2).strip(), m_bracket.group(3).strip()
            mapped_spk = speaker_map.get(spk.lower(), spk)
            results.append({"speaker": mapped_spk, "timestamp": t_str, "text": txt})
            i += 1
            continue

        m_inline = inline_pat.match(line)
        if m_inline and len(m_inline.group(1).split()) <= 4:
            spk, t_str, txt = m_inline.group(1).strip(), m_inline.group(2), m_inline.group(3).strip()
            mapped_spk = speaker_map.get(spk.lower(), spk)
            ts = t_str if t_str else datetime.datetime.now().strftime("%I:%M %p")
            results.append({"speaker": mapped_spk, "timestamp": ts, "text": txt})
            i += 1
            continue

        if i + 2 < len(lines) and time_only_pat.match(lines[i+1]):
            spk = lines[i]
            ts = lines[i+1]
            txt = lines[i+2]
            mapped_spk = speaker_map.get(spk.lower(), spk)
            results.append({"speaker": mapped_spk, "timestamp": ts, "text": txt})
            i += 3
            continue

        if i + 1 < len(lines) and (lines[i].lower() in speaker_map or (len(lines[i].split()) <= 3 and not lines[i].endswith('.'))):
            spk = lines[i]
            txt = lines[i+1]
            mapped_spk = speaker_map.get(spk.lower(), spk)
            results.append({"speaker": mapped_spk, "timestamp": current_time, "text": txt})
            i += 2
            continue

        results.append({
            "speaker": current_speaker,
            "timestamp": current_time,
            "text": line.lstrip('-•* ')
        })
        i += 1

    return results

@app.post("/api/meetings")
def create_meeting(data: MeetingCreateSchema):
    meeting_id = f"MEET-{uuid.uuid4().hex[:4].upper()}"
    app_link = f"http://localhost:3000/?meetingId={meeting_id}"

    platform = data.platform or "google_meet"
    jitsi_room = data.jitsiRoomName.strip() if data.jitsiRoomName and data.jitsiRoomName.strip() else f"ERPNext_AI_Meeting_{meeting_id}"
    jitsi_link = f"https://meet.jit.si/{jitsi_room}"

    if platform == "google_meet":
        gmeet_link = normalize_google_meet_link(data.googleMeetLink)
        meeting_url = gmeet_link
    else:
        gmeet_link = normalize_google_meet_link(None)
        meeting_url = jitsi_link

    proj_obj = next((p for p in ERPNEXT_PROJECTS if p["id"] == data.project), ERPNEXT_PROJECTS[0])

    new_meeting = {
        "id": meeting_id,
        "title": data.title,
        "project": data.project,
        "projectName": proj_obj["name"],
        "date": data.date,
        "time": data.time,
        "duration": data.duration or "45 mins",
        "platform": platform,
        "googleMeetLink": gmeet_link,
        "meetingUrl": meeting_url,
        "jitsiRoomName": jitsi_room,
        "jitsiLink": jitsi_link,
        "appLink": app_link,
        "status": "Scheduled",
        "attendees": [],
        "agenda": data.agenda,
        "transcript": []
    }
    MEETINGS_DB.insert(0, new_meeting)
    return new_meeting

@app.post("/api/meetings/{meeting_id}/invite")
def add_participant(meeting_id: str, participant: AddParticipantSchema):
    meeting = next((m for m in MEETINGS_DB if m["id"] == meeting_id), None)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    email = participant.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    # Only add email id should contain - no fake name
    if not any(a["email"].lower() == email for a in meeting["attendees"]):
        meeting["attendees"].append({"name": email, "email": email})

    return {"success": True, "meeting": meeting}

@app.delete("/api/meetings/{meeting_id}/invite/{email}")
def remove_participant(meeting_id: str, email: str):
    meeting = next((m for m in MEETINGS_DB if m["id"] == meeting_id), None)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting["attendees"] = [a for a in meeting["attendees"] if a["email"].lower() != email.lower()]
    return {"success": True, "meeting": meeting}

@app.post("/api/meetings/{meeting_id}/transcript")
def add_transcript(meeting_id: str, entry: TranscriptEntrySchema):
    meeting = next((m for m in MEETINGS_DB if m["id"] == meeting_id), None)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    timestamp = entry.timestamp or datetime.datetime.now().strftime("%I:%M %p")
    new_line = {
        "id": f"t-{uuid.uuid4().hex[:6]}",
        "timestamp": timestamp,
        "speaker": entry.speaker,
        "text": entry.text
    }
    meeting["transcript"].append(new_line)
    return {"success": True, "entry": new_line, "total_lines": len(meeting["transcript"])}

@app.post("/api/meetings/{meeting_id}/transcript-bulk")
def add_bulk_transcript(meeting_id: str, payload: BulkTranscriptSchema):
    meeting = next((m for m in MEETINGS_DB if m["id"] == meeting_id), None)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    new_entries = []

    if payload.entries:
        for item in payload.entries:
            ts = item.timestamp or datetime.datetime.now().strftime("%I:%M %p")
            entry = {
                "id": f"t-{uuid.uuid4().hex[:6]}",
                "timestamp": ts,
                "speaker": item.speaker,
                "text": item.text
            }
            new_entries.append(entry)
            meeting["transcript"].append(entry)

    if payload.raw_text and payload.raw_text.strip():
        fallback_speaker = payload.default_speaker or (meeting.get("attendees", [{}])[0].get("email") if meeting.get("attendees") else "participant@company.com")
        parsed = parse_google_meet_transcript(payload.raw_text.strip(), meeting.get("attendees", []), fallback_speaker)
        for p in parsed:
            entry = {
                "id": f"t-{uuid.uuid4().hex[:6]}",
                "timestamp": p["timestamp"],
                "speaker": p["speaker"],
                "text": p["text"]
            }
            new_entries.append(entry)
            meeting["transcript"].append(entry)

    return {"success": True, "added": len(new_entries), "entries": new_entries, "total_lines": len(meeting["transcript"])}

def find_assignee_for_text(text: str, speaker: str, attendees: List[Dict[str, Any]]) -> tuple:
    """
    Finds assignee email and name by:
    1. Matching names/email prefixes of invited attendees in the text.
    2. Extracting capitalized names in the text and matching or deriving an email.
    3. Matching speaker if speaker is an attendee.
    4. Falling back to first attendee or team email.
    """
    lower_text = text.lower()
    domain = "company.com"

    for att in attendees:
        email = att.get("email", "")
        if "@" in email:
            domain = email.split("@")[1]
            break

    # 1. Match against attendees list by name or email prefix or name tokens
    for att in attendees:
        att_email = (att.get("email") or "").strip()
        att_name = (att.get("name") or "").strip()

        email_prefix = att_email.split("@")[0].lower() if "@" in att_email else att_email.lower()
        name_parts = [p.lower() for p in re.split(r'\s+', att_name) if p.strip()]
        email_parts = [p.lower() for p in re.split(r'[._-]', email_prefix) if p.strip()]

        all_candidate_words = set(name_parts + email_parts)
        if att_name:
            all_candidate_words.add(att_name.lower())
        if email_prefix:
            all_candidate_words.add(email_prefix)

        for word in all_candidate_words:
            if len(word) >= 2 and re.search(r'\b' + re.escape(word) + r'\b', lower_text):
                return att_email or f"{word}@{domain}", att_name or word.title()

    # 2. Extract potential person names from text if not in attendees list
    name_matches = re.findall(r'\b([A-Z][a-z]{2,})\b', text)
    stopwords = {
        "The", "This", "That", "Next", "Thursday", "Wednesday", "Friday", "Monday", "Tuesday",
        "Saturday", "Sunday", "Today", "Tomorrow", "ERPNext", "FastAPI", "DocType", "Jitsi",
        "Google", "Meet", "GMeet",
        "Sprint", "Sync", "Meeting", "Task", "Code", "Login", "Development", "Action", "Item",
        "Sure", "Yeah", "Okay", "Welcome", "Everyone", "Please", "Could", "Would", "Should"
    }

    for name in name_matches:
        if name not in stopwords:
            clean_name = name.capitalize()
            for att in attendees:
                att_e = (att.get("email") or "").lower()
                if clean_name.lower() in att_e:
                    return att.get("email"), att.get("name") or clean_name
            derived_email = f"{clean_name.lower()}@{domain}"
            return derived_email, clean_name

    # 3. Fallback to speaker if speaker is provided
    if speaker:
        speaker_str = str(speaker).strip()
        for att in attendees:
            if speaker_str.lower() == (att.get("email") or "").lower() or speaker_str.lower() == (att.get("name") or "").lower():
                return att.get("email"), att.get("name") or speaker_str
        if "@" in speaker_str:
            sp_name = speaker_str.split("@")[0].replace(".", " ").title()
            return speaker_str, sp_name
        else:
            return f"{speaker_str.lower().replace(' ', '.')}@{domain}", speaker_str.title()

    # 4. Fallback to first attendee
    if attendees:
        first_email = attendees[0].get("email", f"user@{domain}")
        first_name = attendees[0].get("name", first_email.split("@")[0].title() if "@" in first_email else first_email)
        return first_email, first_name

    return f"team@{domain}", "Team Member"

@app.post("/api/ai/extract-tasks")
def extract_tasks_endpoint(req: ExtractTaskRequestSchema):
    transcript = req.transcript
    attendees = req.attendees or []
    extracted_tasks = []

    action_verbs = [
        "will create", "will write", "will draft", "will prepare", "will implement", "will complete",
        "will do", "will finish", "will work on", "complete the", "finish the", "prepare the",
        "please implement", "could you prepare", "can you write", "assign", "need to create",
        "need to build", "need to fix", "responsible for", "take care of", "handle the"
    ]

    for index, entry in enumerate(transcript):
        raw_text = entry.get("text", "")
        speaker = entry.get("speaker", "")

        # Split compound sentences like "Shruti will complete... and Ashwini complete..."
        clauses = re.split(r'\b(?:and|also|while)\b|;', raw_text, flags=re.IGNORECASE)
        clauses = [c.strip() for c in clauses if c.strip()]

        for clause in clauses:
            lower_clause = clause.lower()

            is_action = any(verb in lower_clause for verb in action_verbs)
            if not is_action and ("will " in lower_clause or "please " in lower_clause or "can you " in lower_clause or "complete " in lower_clause or "prepare " in lower_clause):
                is_action = True

            if is_action:
                assignee_email, assignee_name = find_assignee_for_text(clause, speaker, attendees)

                priority = "Medium"
                if any(k in lower_clause for k in ["urgent", "asap", "critical", "today"]):
                    priority = "High"
                elif any(k in lower_clause for k in ["next week", "later", "whenever"]):
                    priority = "Low"

                due_date = datetime.date.today() + datetime.timedelta(days=3)

                title = clause
                title = re.sub(
                    r"^(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[A-Z][a-z]+|I|you|we|sure thing,|got it\.|yes,|also,|ok,|hey,|welcome everyone!)\s+(?:will|should|must|to|is going to|can|please|could you)?\s*",
                    "",
                    title,
                    flags=re.IGNORECASE
                ).strip()

                if len(title) > 80:
                    title = title[:77] + "..."
                if title:
                    title = title[0].upper() + title[1:]
                else:
                    title = f"Action item from {speaker}"

                extracted_tasks.append({
                    "id": f"AI-TASK-{uuid.uuid4().hex[:6]}",
                    "transcriptId": entry.get("id"),
                    "title": title,
                    "description": f"Captured from live transcript at {entry.get('timestamp')}:\n\"{raw_text}\"",
                    "rawQuote": clause,
                    "speaker": speaker,
                    "timestamp": entry.get("timestamp"),
                    "assigneeName": assignee_name,
                    "assigneeEmail": assignee_email,
                    "project": req.project or "PROJ-001",
                    "projectName": req.projectName or "ERPNext AI Module Integration",
                    "priority": priority,
                    "expEndDate": due_date.isoformat(),
                    "status": "Pending Approval",
                    "confidence": 92,
                    "erpnextTaskId": None
                })

    return {"tasks": extracted_tasks, "count": len(extracted_tasks)}

@app.get("/api/erpnext/config")
def get_erp_config():
    return ERP_CONFIG

@app.post("/api/erpnext/config")
def save_erp_config(config: ERPNextConfigSchema):
    ERP_CONFIG.update(config.model_dump())
    return {"success": True, "config": ERP_CONFIG}

@app.post("/api/erpnext/test-connection")
async def test_erp_connection(config: ERPNextConfigSchema):
    if config.useMockMode:
        return {"success": True, "message": "Connected to ERPNext Mock Engine (FastAPI Backend v2.0)"}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{config.host}/api/method/frappe.auth.get_logged_user",
                headers={"Authorization": f"token {config.apiKey}:{config.apiSecret}"}
            )
            if resp.status_code == 200:
                return {"success": True, "user": resp.json().get("message"), "message": f"Connected to ERPNext host as {resp.json().get('message')}"}
            else:
                return {"success": False, "message": f"ERPNext returned HTTP status {resp.status_code}"}
    except Exception as e:
        return {"success": False, "message": f"Could not connect to {config.host}: {str(e)}"}

@app.post("/api/erpnext/sync-task")
async def sync_task_to_erpnext(task: TaskSyncRequestSchema):
    if ERP_CONFIG.get("useMockMode", True):
        mock_task_id = f"TASK-2026-{uuid.uuid4().hex[:4].upper()}"
        synced_item = {
            **task.model_dump(),
            "status": "Synced",
            "erpnextTaskId": mock_task_id,
            "syncedAt": datetime.datetime.now().isoformat(),
            "erpnextUrl": f"{ERP_CONFIG['host']}/app/task/{mock_task_id}"
        }
        SYNCED_TASKS_DB.insert(0, synced_item)
        return {
            "success": True,
            "taskId": mock_task_id,
            "task": synced_item,
            "message": f"Task created in ERPNext Task DocType: {mock_task_id}"
        }

    try:
        payload = {
            "subject": task.title,
            "description": f"{task.description}\n\n[Synced via FastAPI ERPNext AI Bridge]",
            "project": task.project,
            "priority": task.priority,
            "exp_end_date": task.expEndDate,
            "allocated_to": task.assigneeEmail
        }

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                f"{ERP_CONFIG['host']}/api/resource/Task",
                json=payload,
                headers={
                    "Authorization": f"token {ERP_CONFIG['apiKey']}:{ERP_CONFIG['apiSecret']}",
                    "Content-Type": "application/json"
                }
            )
            if resp.status_code in (200, 201):
                real_id = resp.json().get("data", {}).get("name") or f"TASK-{uuid.uuid4().hex[:4].upper()}"
                synced_item = {
                    **task.model_dump(),
                    "status": "Synced",
                    "erpnextTaskId": real_id,
                    "syncedAt": datetime.datetime.now().isoformat(),
                    "erpnextUrl": f"{ERP_CONFIG['host']}/app/task/{real_id}"
                }
                SYNCED_TASKS_DB.insert(0, synced_item)
                return {"success": True, "taskId": real_id, "task": synced_item, "message": f"Task pushed to ERPNext DocType: {real_id}"}
            else:
                raise Exception(f"HTTP {resp.status_code}: {resp.text}")
    except Exception as e:
        offline_id = f"TASK-2026-{uuid.uuid4().hex[:4].upper()}"
        synced_item = {
            **task.model_dump(),
            "status": "Synced (Offline Mode)",
            "erpnextTaskId": offline_id,
            "syncedAt": datetime.datetime.now().isoformat(),
            "erpnextUrl": f"{ERP_CONFIG['host']}/app/task/{offline_id}",
            "warning": str(e)
        }
        SYNCED_TASKS_DB.insert(0, synced_item)
        return {"success": True, "taskId": offline_id, "task": synced_item, "message": f"Saved locally: {offline_id}"}

@app.get("/api/erpnext/synced-tasks")
def list_synced_tasks():
    return SYNCED_TASKS_DB

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

