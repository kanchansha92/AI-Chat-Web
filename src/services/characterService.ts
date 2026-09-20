import { request, authHeader } from "./authService";

export interface CharacterSourceMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
}

export interface Character {
  id: string;
  name: string;
  colour: string;
  /** Uploaded picture URL, or null to fall back to the colour swatch. */
  avatar: string | null;
  quickLine: string;
  tones: string[];
  mode: "QUICK" | "DEEP";
  sources: CharacterSourceMeta[];
  createdAt: string;
  updatedAt: string;
}

export interface NewCharacterInput {
  name: string;
  colour: string;
  quickLine: string;
  tones: string[];
  mode: "quick" | "deep";
}

export const characterService = {
  /**
   * Always multipart, even with no files, so the deep builder's sources (max 6)
   * and the optional avatar can ride in the same body.
   */
  create(
    input: NewCharacterInput,
    files: File[] = [],
    avatar?: File | null
  ): Promise<{ character: Character }> {
    const form = new FormData();
    form.append("name", input.name);
    form.append("colour", input.colour);
    form.append("quickLine", input.quickLine);
    form.append("tones", JSON.stringify(input.tones));
    form.append("mode", input.mode);
    for (const file of files) {
      form.append("sources", file, file.name);
    }
    if (avatar) {
      form.append("avatar", avatar, avatar.name);
    }

    return request<{ character: Character }>("/characters", {
      method: "POST",
      headers: authHeader(), // no Content-Type - the browser sets the boundary
      body: form,
    });
  },

  /** Newest activity first. */
  list(search?: string): Promise<{ characters: Character[] }> {
    const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return request<{ characters: Character[] }>(`/characters${qs}`, {
      headers: authHeader(),
    });
  },

  get(id: string): Promise<{ character: Character }> {
    return request<{ character: Character }>(`/characters/${id}`, {
      headers: authHeader(),
    });
  },

  update(
    id: string,
    patch: Partial<Pick<Character, "name" | "colour" | "quickLine" | "tones">>
  ): Promise<{ character: Character }> {
    return request<{ character: Character }>(`/characters/${id}`, {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify(patch),
    });
  },

  /** Separate from `update` because a photo can't ride in a JSON body. */
  updateAvatar(id: string, avatar: File | null): Promise<{ character: Character }> {
    const form = new FormData();
    if (avatar) form.append("avatar", avatar, avatar.name);
    else form.append("removeAvatar", "true");

    return request<{ character: Character }>(`/characters/${id}`, {
      method: "PATCH",
      headers: authHeader(),
      body: form,
    });
  },

  remove(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/characters/${id}`, {
      method: "DELETE",
      headers: authHeader(),
    });
  },
};
