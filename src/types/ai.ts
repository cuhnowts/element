export type ProviderType = "anthropic" | "openai" | "ollama" | "openai_compatible";

export interface AiProvider {
  id: string;
  providerType: ProviderType;
  name: string;
  model: string;
  baseUrl: string | null;
  credentialKey: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderInput {
  providerType: ProviderType;
  name: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface TaskScaffold {
  description?: string;
  steps?: string[];
  priority?: string;
  estimatedMinutes?: number;
  tags?: string[];
  relatedTasks?: string[];
}

export interface ModelInfo {
  id: string;
  name: string;
}
