import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Injectable, Logger } from '@nestjs/common';
import { Observable, from, map, tap } from 'rxjs';
import type { z } from 'zod';

@Injectable()
export class LlmClient {
  private readonly log = new Logger(LlmClient.name);

  getVerdict<S extends z.ZodType>(
    model: ChatGoogleGenerativeAI,
    schema: S,
    systemInstruction: string,
    input: string,
  ): Observable<z.infer<S>> {
    const started = Date.now();
    return from(
      model.withStructuredOutput(schema, { name: 'verdict' }).invoke([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: input },
      ]),
    ).pipe(
      map((parsed) => parsed as z.infer<S>),
      tap(() =>
        this.log.debug(`${model.model} in ${Date.now() - started}ms`),
      ),
    );
  }
}
