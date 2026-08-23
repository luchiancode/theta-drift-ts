import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { map } from 'rxjs';
import { AssetRepository } from '../repositories/asset.repository';

@Controller('api/v1/assets')
export class AssetsController {
  constructor(private readonly assetRepository: AssetRepository) {}

  @Get()
  list() {
    return this.assetRepository.findAssets();
  }

  @Get(':symbol')
  get(@Param('symbol') symbol: string) {
    return this.assetRepository.findAsset(symbol).pipe(
      map((asset) => {
        if (asset === null) {
          throw new NotFoundException('Asset not found');
        }
        return asset;
      }),
    );
  }
}
