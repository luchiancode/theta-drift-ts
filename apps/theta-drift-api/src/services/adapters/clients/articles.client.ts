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
  private readonly CATEGORY = 'business';
  private readonly LANG = 'en';
  private readonly COUNTRY = 'us';
  private readonly MAX = 10;
  private readonly TIMEOUT_MS = 10_000;

  constructor(
    private readonly httpService: HttpService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  getTopHeadlines(): Observable<ArticleDto[]> {
    return this.httpService
      .get<{ articles?: ArticleDto[] }>('top-headlines', {
        baseURL: `${this.env.ARTICLES_PROVIDER_BASE_URL}/`,
        timeout: this.TIMEOUT_MS,
        params: {
          apikey: this.env.ARTICLES_PROVIDER_API_KEY,
          lang: this.LANG,
          country: this.COUNTRY,
          category: this.CATEGORY,
          max: this.MAX,
        },
      })
      .pipe(map((response) => response.data.articles ?? []));
  }
}
