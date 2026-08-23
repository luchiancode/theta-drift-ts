import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { map } from 'rxjs';
import { ArticleRepository } from '../repositories/article.repository';

@Controller('api/v1/articles')
export class ArticlesController {
  constructor(private readonly articleRepository: ArticleRepository) {}


  @Get('rated')
  listRated() {
    return this.articleRepository.findRatedArticles();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.articleRepository.findArticleById(id).pipe(
      map((article) => {
        if (article === null) {
          throw new NotFoundException('Article not found');
        }
        return article;
      }),
    );
  }
}
