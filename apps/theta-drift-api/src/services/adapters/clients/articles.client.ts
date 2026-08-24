import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ENV, type Env } from '../../../config/configuration';

export interface ArticleDto {
  id?: string;
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  image?: string;
  publishedAt?: string;
  source?: { name?: string };
}

@Injectable()
export class ArticlesClient {
  constructor(
    private readonly httpService: HttpService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  getTopHeadlines(): Observable<ArticleDto[]> {
    return this.httpService
      .get<{ articles?: ArticleDto[] }>('top-headlines', {
        baseURL: `${this.env.ARTICLES_PROVIDER_BASE_URL}/`,
        timeout: this.env.ARTICLES_PROVIDER_TIMEOUT_MS,
        params: {
          apikey: this.env.ARTICLES_PROVIDER_API_KEY,
          lang: this.env.ARTICLES_PROVIDER_LANG,
          country: this.env.ARTICLES_PROVIDER_COUNTRY,
          category: this.env.ARTICLES_PROVIDER_CATEGORY,
          max: this.env.ARTICLES_PROVIDER_MAX,
        },
      })
      .pipe(map((response) => response.data.articles ?? []));
  }
}
