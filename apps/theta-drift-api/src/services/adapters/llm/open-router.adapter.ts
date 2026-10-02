import { OpenRouter } from '@openrouter/sdk';
import { Inject, Injectable } from '@nestjs/common';
import { Observable, defer } from 'rxjs';
import type { z } from 'zod';
import { OpenRouterClient } from '../clients/open-router.client';
import { ENV, type Env } from '../../../config/configuration';
import type { LlmProvider, LlmRole } from './llm.provider';

@Injectable()
export class OpenRouterProviderAdapter implements LlmProvider {
  private readonly client: OpenRouter;

  constructor(
    private readonly openRouterClient: OpenRouterClient,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.client = new OpenRouter({ apiKey: this.env.OPEN_ROUTER_API_KEY });
  }

  modelFor(): string {
    return this.env.OPEN_ROUTER_LLM_TEXT;
  }

  getVerdict<S extends z.ZodType>(
    _role: LlmRole,
    schema: S,
    systemInstruction: string,
    input: string,
  ): Observable<z.infer<S>> {
    return defer(() =>
      this.openRouterClient.getVerdict(
        this.client,
        this.modelFor(),
        schema,
        systemInstruction,
        input,
      ),
    );
  }
}
