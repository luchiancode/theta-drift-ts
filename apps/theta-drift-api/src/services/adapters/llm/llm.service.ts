import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Inject, Injectable } from '@nestjs/common';
import { Observable, defer } from 'rxjs';
import type { z } from 'zod';
import { LlmClient } from '../clients/llm.client';
import { ENV, type Env } from '../../../config/configuration';
import type { LlmProvider, LlmRole } from './llm.provider';

@Injectable()
export class LlmProviderAdapter implements LlmProvider {
  private readonly clients = new Map<string, ChatGoogleGenerativeAI>();

  constructor(
    private readonly llmClient: LlmClient,
    @Inject(ENV) private readonly env: Env,
  ) {}

  modelFor(role: LlmRole): string {
    return role === 'curate' ? this.env.LLM_CURATE_MODEL : this.env.LLM_MODEL;
  }

  getVerdict<S extends z.ZodType>(
    role: LlmRole,
    schema: S,
    systemInstruction: string,
    input: string,
  ): Observable<z.infer<S>> {
    return defer(() =>
      this.llmClient.getVerdict(
        this.clientFor(this.modelFor(role)),
        schema,
        systemInstruction,
        input,
      ),
    );
  }

  private clientFor(model: string): ChatGoogleGenerativeAI {
    const existing = this.clients.get(model);
    if (existing) {
      return existing;
    }
    const client = new ChatGoogleGenerativeAI({
      model,
      apiKey: this.env.LLM_API_KEY,
    });
    this.clients.set(model, client);
    return client;
  }
}
