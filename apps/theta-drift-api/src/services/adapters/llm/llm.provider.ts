import type { Observable } from 'rxjs';
import type { z } from 'zod';

export type LlmRole = 'rate' | 'curate';

export interface LlmProvider {
  modelFor(role: LlmRole): string;

  getVerdict<S extends z.ZodType>(
    role: LlmRole,
    schema: S,
    systemInstruction: string,
    input: string,
  ): Observable<z.infer<S>>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
