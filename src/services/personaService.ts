import { request, authHeader } from "./authService";

// Personas are who the USER speaks as. Distinct from a character, and distinct
// from the per-room character overrides in group chat.

export interface Persona {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const personaService = {
  list(): Promise<{ personas: Persona[]; limit: number | null }> {
    return request(`/personas`, { headers: authHeader() });
  },

  create(body: { name: string; description?: string }): Promise<{ persona: Persona }> {
    return request(`/personas`, { method: "POST", headers: authHeader(), body: JSON.stringify(body) });
  },

  update(id: string, body: { name?: string; description?: string }): Promise<{ persona: Persona }> {
    return request(`/personas/${id}`, { method: "PATCH", headers: authHeader(), body: JSON.stringify(body) });
  },

  remove(id: string): Promise<void> {
    return request(`/personas/${id}`, { method: "DELETE", headers: authHeader() });
  },

  /** Switching is metered monthly on the paid plans. */
  activate(id: string): Promise<{ persona: Persona; changed: boolean }> {
    return request(`/personas/${id}/activate`, { method: "POST", headers: authHeader(), body: JSON.stringify({}) });
  },

  deactivate(): Promise<{ ok: boolean }> {
    return request(`/personas/deactivate`, { method: "POST", headers: authHeader(), body: JSON.stringify({}) });
  },
};

export interface ModelOption {
  id: string;
  label: string;
  cost: number;
  available: boolean;
}

export const modelService = {
  list(): Promise<{ models: ModelOption[] }> {
    return request(`/models`, { headers: authHeader() });
  },
};
