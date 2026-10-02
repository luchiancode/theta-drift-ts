import { OpenRouter } from '@openrouter/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { Observable, from, map, tap } from 'rxjs';
import { z } from 'zod';

@Injectable()
export class OpenRouterClient {
  private readonly log = new Logger(OpenRouterClient.name);

  getVerdict<S extends z.ZodType>(
    client: OpenRouter,
    model: string,
    schema: S,
    systemInstruction: string,
    input: string,
  ): Observable<z.infer<S>> {
    const started = Date.now();
    return from(
      client.chat.send({
        chatRequest: {
          model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: input },
          ],
          provider: {
            only: ['deepinfra/fp8'],
            allowFallbacks: false,
            requireParameters: true,
          },
          responseFormat: {
            type: 'json_schema',
            jsonSchema: {
              name: 'verdict',
              strict: true,
              schema: z.toJSONSchema(schema, { io: 'input' }),
            },
          },
          stream: false,
        },
      }),
    ).pipe(
      map((response) => {
        if (!('choices' in response)) {
          throw new Error('Expected a non-streaming OpenRouter response');
        }
        const content = response.choices[0]?.message.content;
        if (typeof content !== 'string' || !content) {
          throw new Error('OpenRouter returned no verdict');
        }
        return schema.parse(JSON.parse(content));
      }),
      tap(() => this.log.debug(`${model} in ${Date.now() - started}ms`)),
    );
  }
}
