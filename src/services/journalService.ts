import { request, authHeader } from "./authService";

export interface JournalEntry {
  id: string;
  threadId: string;
  title: string;
  body: string;
  reflection: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A thread without its entries, as the list endpoint returns it. */
export interface JournalThread {
  id: string;
  name: string;
  aboutRealPerson: boolean;
  colour: string;
  entryCount: number;
  lastEntryPreview: string;
  lastEntryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalThreadWithEntries extends Omit<JournalThread, "entryCount" | "lastEntryPreview" | "lastEntryAt"> {
  entries: JournalEntry[];
}

export interface NewThreadInput {
  name: string;
  aboutRealPerson: boolean;
}

export const journalService = {
  /** Newest activity first. */
  listThreads(): Promise<{ threads: JournalThread[] }> {
    return request<{ threads: JournalThread[] }>("/journal/threads", {
      headers: authHeader(),
    });
  },

  createThread(input: NewThreadInput): Promise<{ thread: JournalThread }> {
    return request<{ thread: JournalThread }>("/journal/threads", {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(input),
    });
  },

  /** Entries come back oldest first. */
  getThread(id: string): Promise<{ thread: JournalThreadWithEntries }> {
    return request<{ thread: JournalThreadWithEntries }>(`/journal/threads/${id}`, {
      headers: authHeader(),
    });
  },

  updateThread(
    id: string,
    patch: Partial<Pick<JournalThread, "name" | "aboutRealPerson">>
  ): Promise<{ thread: JournalThread }> {
    return request<{ thread: JournalThread }>(`/journal/threads/${id}`, {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify(patch),
    });
  },

  removeThread(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/journal/threads/${id}`, {
      method: "DELETE",
      headers: authHeader(),
    });
  },

  /** Rejects past 10 entries on the Free tier. */
  createEntry(
    threadId: string,
    input: { title?: string; body: string }
  ): Promise<{ entry: JournalEntry }> {
    return request<{ entry: JournalEntry }>(`/journal/threads/${threadId}/entries`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(input),
    });
  },

  /** Called on autosave, so expect this to fire often. */
  updateEntry(
    id: string,
    patch: { title?: string; body?: string }
  ): Promise<{ entry: JournalEntry }> {
    return request<{ entry: JournalEntry }>(`/journal/entries/${id}`, {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify(patch),
    });
  },

  removeEntry(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/journal/entries/${id}`, {
      method: "DELETE",
      headers: authHeader(),
    });
  },

  /** Bump `nonce` to force a different reflection instead of a cached one. */
  reflect(id: string, nonce = 0): Promise<{ entry: JournalEntry }> {
    return request<{ entry: JournalEntry }>(`/journal/entries/${id}/reflect`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ nonce }),
    });
  },
};
