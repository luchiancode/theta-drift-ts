import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ArticlesClient } from './clients/articles.client';
import { LlmClient } from './clients/llm.client';
import { QuoteClient } from './clients/quote.client';
import { ArticlesProviderAdapter } from './articles/articles.service';
import { ARTICLES_PROVIDER } from './articles/articles.provider';
import { LlmProviderAdapter } from './llm/llm.service';
import { LLM_PROVIDER } from './llm/llm.provider';
import { QuotesProviderAdapter } from './quotes/quotes.service';
import { QUOTES_PROVIDER } from './quotes/quotes.provider';


@Module({
  imports: [HttpModule],
  providers: [
    ArticlesClient,
    QuoteClient,
    LlmClient,
    ArticlesProviderAdapter,
    { provide: ARTICLES_PROVIDER, useExisting: ArticlesProviderAdapter },
    QuotesProviderAdapter,
    { provide: QUOTES_PROVIDER, useExisting: QuotesProviderAdapter },
    LlmProviderAdapter,
    { provide: LLM_PROVIDER, useExisting: LlmProviderAdapter },
  ],
  exports: [ARTICLES_PROVIDER, QUOTES_PROVIDER, LLM_PROVIDER],
})
export class AdaptersModule {}
