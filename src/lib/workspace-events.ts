// Sidebar folder/file mutations and item deletes happen in components that
// sit alongside — not inside — the main content page (WorkspaceShell keeps
// the sidebar mounted across route changes within a project). Without this,
// adding a file from the sidebar while sitting on Dashboard/Tracker leaves
// that page's progress numbers stale until a manual reload.

const EVENT_NAME = "workspace:project-data-changed";

export function notifyProjectDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

export function onProjectDataChanged(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
