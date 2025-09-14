# **Task Management App – MVP Requirements Specification (Updated)**

## **1\. Platforms**

* Web App (core platform)

* Android App

* iOS App

* Chrome Extension

* Firefox Plugin

---

## **2\. User Roles**

### **2.1 Task Logger**

* Create multiple projects.

* Log tasks within owned or member projects.

* Pause/resume tasks multiple times.

* Add task names/descriptions with special characters and emojis.

### **2.2 Project Owner (inherits Task Logger)**

* Owner of created projects.

* Edit any task within their project (title, description, start/stop times).

* Delete tasks (tagged as `Deleted`, kept in audit logs).

* Set custom rates per member or use the default project rate.

* Add/remove members.

* Define work days, expected hours, and project default charge rates.

* Create project reminders.

* Approve/correct task start/stop times or names requested by members.

### **2.3 System Admin**

* Manage user accounts: view, deactivate, reactivate.

* Upgrade subscription tiers (no downgrade).

* Cannot access project/task data or audit logs.

---

## **3\. Projects**

* Custom work days (e.g., Tue–Sat).

* Optional expected start/end dates and times.

* Default charge rates with member-level overrides.

* Currency defined at project level (default: USD, editable later).

* Members can belong to multiple projects.

* Tasks cannot be moved between projects.

---

## **4\. Tasks**

### **4.1 Lifecycle**

* Logged as: Start → Pause/Resume → Stop.

* Real-time timer shown during active task.

* Default task name: `Task_<Date>_<StartTime>`.

* Owners can edit:

  * Task name

  * Description

  * Start time

  * Stop time

### **4.2 Automatic Tagging**

* **Overtime:** Task logged outside expected hours.

* **Off-day:** Task logged on non-work days.

* **Deleted:** When removed by owner.

* Tags are system-controlled and recalculated when tasks are stopped or edited.

### **4.3 Rules**

* Tasks are not required to be unique.

* Tasks can have any duration (even seconds).

* Tasks cannot run simultaneously within the same project, but can across projects.

* Deleted tasks remain stored but are excluded from billing/reporting.

* Only owners can make corrections (members must request).

* Members cannot edit system tags (`Overtime`, `Off-day`, `Deleted`).

---

## **5\. Project Reminders**

* Can be set for any future date.

* Can target the entire project or individual members, not both.

* Shown in:

  * Dashboard/Home → today’s reminders

  * Reminders section → all reminders, sorted by date

* Reminder count limited by subscription tier

---

## **6\. Reporting & Dashboards**

* Filter and group by member, project, and date.

* Project dashboards include all charges:

  * Base hours

  * Overtime

  * Off-day

* Tasks displayed per project (no cross-project aggregation).

* Deleted tasks are excluded from reports.

* Export (PDF/CSV) in future phase.

---

## **7\. Billing & Charge Rates**

* Default \+ custom member rates.

* Custom rates are not overwritten when the project default changes.

* Rate changes only affect new tasks.

* **Overtime/Off-day billing:**

  * Overtime tasks can have separate rates (configurable per project/member).

  * Off-day tasks may have special rates or considered non-billable (configurable).

* Cron job calculates billable amounts daily at a configurable time.

---

## **8\. Invitations & Membership**

* Add members via name or email search.

* If the user doesn’t exist → invitation email sent.

* Removed members’ tasks remain visible to owners.

* Members cannot remove themselves or edit others’ tasks.

---

## **9\. Notifications & Audit**

### **9.1 Notifications**

* Audit logs visible only to project owners.

* Notification history persists (past \+ upcoming reminders).

### **9.2 Unified Audit Logs**

* All task lifecycle events \+ edits stored in a single audit table.

#### **9.2.1 Tracked Events**

* START\_TASK – when the user starts a task

* STOP\_TASK – when the user stops a task

* PAUSE\_TASK / RESUME\_TASK – optional, but can be tracked

* DELETE\_TASK – when the owner deletes a task

* EDIT\_NAME – when the owner changes the task name

* EDIT\_DESCRIPTION – when the owner changes the task description

* EDIT\_START\_TIME – when the owner changes the task start time

* EDIT\_STOP\_TIME – when the owner changes the task stop time

#### **9.2.2 Schema**

`CREATE TABLE task_audit_logs (`  
    `id BIGSERIAL PRIMARY KEY,`  
    `task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,`  
    `project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,`  
    `actor_user_id BIGINT NOT NULL REFERENCES users(id),`  
    `action VARCHAR(50) NOT NULL,`  
    `old_value TEXT,`  
    `new_value TEXT,`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT now()`  
`);`

`CREATE INDEX idx_task_audit_logs_task_id ON task_audit_logs(task_id);`  
`CREATE INDEX idx_task_audit_logs_project_id ON task_audit_logs(project_id);`  
`CREATE INDEX idx_task_audit_logs_actor_user_id ON task_audit_logs(actor_user_id);`

#### **9.2.3 Example Audit Trail**

| id | task\_id | project\_id | actor\_user\_id | action | old\_value | new\_value | created\_at |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| 1 | 101 | 10 | 5 | EDIT\_NAME | Task\_20250912\_181230 | Fix API Bug | 2025-09-12 10:12 UTC |
| 2 | 101 | 10 | 5 | EDIT\_START\_TIME | 2025-09-12T18:12:30Z | 2025-09-12T18:15:00Z | 2025-09-15 18:15 UTC |

**UI Example:**

`[2025-09-12 10:12 UTC] xyz (owner) edited task name`  
`[2025-09-15 18:15 UTC] xyz (owner) edited task start_time`

---

## **10\. Task Workflow – Including Overtime & Off-day**

### **10.1 Member Workflow**

1. Check project workdays and expected hours.

2. Start a task → timer runs in real-time.

3. Pause/Resume task if needed.

4. Stop task → system tags task as:

   * Normal (within hours)

   * Overtime (outside hours)

   * Off-day (non-workday)

5. Request corrections if start/stop time is wrong → goes to owner.

### **10.2 Owner Workflow**

1. Monitor member tasks.

2. Review automatically flagged `Overtime` / `Off-day` tasks.

3. Approve or edit task corrections.

4. Billing dashboard calculates base, overtime, off-day charges separately.

5. All actions recorded in audit logs.

**Workflow Diagram**

`Member starts task → Task runs`  
       `↓`  
`Pause/Resume multiple times`  
       `↓`  
`Stop task → System calculates duration`  
       `↓`  
`System tags:`  
   `- Within expected hours → Normal`  
   `- Outside expected hours → Overtime`  
   `- Non-workday → Off-day`  
       `↓`  
`Member requests corrections → Owner approves/edits`  
       `↓`  
`Audit log updated → Billing calculated`

---

## **11\. Constraints & Rules**

* Owners cannot manually change system tags (`Overtime`, `Off-day`, `Deleted`).

* Tasks cannot be reassigned between projects.

* Deleted tasks remain in DB but are excluded from billing and reports.

* Audit logs are append-only and immutable.

---

## **12\. Future Considerations**

* Export audit logs for compliance.

* Add admin override logging (if requirement changes).

* Add search/filter for audit logs in project dashboards.

* Add diff views for long text fields (descriptions).

* Export billing reports including overtime/off-day breakdown.

