import { Injectable } from '@nestjs/common';
import { ArticleRepository } from '../repositories/article.repository';

@Injectable()
export class ArticleService {
  constructor(private readonly articleRepository: ArticleRepository) {}
}
