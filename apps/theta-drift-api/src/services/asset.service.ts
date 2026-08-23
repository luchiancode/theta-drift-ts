import { Injectable } from '@nestjs/common';
import { AssetRepository } from '../repositories/asset.repository';

@Injectable()
export class AssetService {
  constructor(private readonly assetRepository: AssetRepository) {}
}
