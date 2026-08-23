import { Inject, Injectable, Logger } from '@nestjs/common';
import { Observable, of, switchMap, tap } from 'rxjs';
import {
  ARTICLES_PROVIDER,
  type ArticlesProvider,
} from '../adapters/articles/articles.provider';
import { ArticleRepository } from '../../repositories/article.repository';

@Injectable()
export class IngestService {
  private readonly log = new Logger(IngestService.name);

  constructor(
    private readonly articleRepository: ArticleRepository,
    @Inject(ARTICLES_PROVIDER)
    private readonly articlesProvider: ArticlesProvider,
  ) {}

  ingestOnce(): Observable<number> {
    return this.articlesProvider.fetchLatest().pipe(
      switchMap((articles) => {
        if (articles.length === 0) {
          this.log.log(`${this.articlesProvider.name}: fetched 0 articles`);
          return of(0);
        }

        const fetchedAt = new Date();
        return this.articleRepository.saveArticles(articles, fetchedAt).pipe(
          tap((count) =>
            this.log.log(
              `${this.articlesProvider.name}: fetched ${articles.length} articles, inserted ${count}`,
            ),
          ),
        );
      }),
    );
  }
}
