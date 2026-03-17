package workitems

// Work-items schema for L2 (project-level) planning.
// Scope: single repository.
// Operational status: non-operational (planning artifact only).

#State: "triage" | "queued" | "doing" | "review" | "done"

#Task: {
	text: string
	done: bool
}

#Issue: {
	id:            string
	title:         string
	state:         #State
	tasks:         [...#Task]
	dod:           string
	labels?:       [...string]
	assignee?:     string
	completed_at?: string & =~"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
	note?:         string
}

#Milestone: {
	id:     string & =~"^M[0-9]+$"
	title:  string
	issues: [...#Issue]
}

schema_version: 1
updated_at:     string & =~"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
owner:          string
project_name:   string
milestones:     [...#Milestone]
