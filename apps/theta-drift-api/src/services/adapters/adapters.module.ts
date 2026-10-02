import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ArticlesClient } from './clients/articles.client';
import { OpenRouterClient } from './clients/open-router.client';
import { QuoteClient } from './clients/quote.client';
import { ArticlesProviderAdapter } from './articles/articles.adapter';
import { ARTICLES_PROVIDER } from './articles/articles.provider';
import { OpenRouterProviderAdapter } from './llm/open-router.adapter';
import { LLM_PROVIDER } from './llm/llm.provider';
import { QuotesProviderAdapter } from './quotes/quotes.adapter';
import { QUOTES_PROVIDER } from './quotes/quotes.provider';


@Module({
  imports: [HttpModule],
  providers: [
    ArticlesClient,
    QuoteClient,
    OpenRouterClient,
    ArticlesProviderAdapter,
    { provide: ARTICLES_PROVIDER, useExisting: ArticlesProviderAdapter },
    QuotesProviderAdapter,
    { provide: QUOTES_PROVIDER, useExisting: QuotesProviderAdapter },
    OpenRouterProviderAdapter,
    { provide: LLM_PROVIDER, useExisting: OpenRouterProviderAdapter },
  ],
  exports: [ARTICLES_PROVIDER, QUOTES_PROVIDER, LLM_PROVIDER],
})
export class AdaptersModule {}
