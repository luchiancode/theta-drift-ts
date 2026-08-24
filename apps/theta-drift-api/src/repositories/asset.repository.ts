import { Injectable } from '@nestjs/common';
import { defer } from 'rxjs';
import { PrismaService } from './prisma.service';

@Injectable()
export class AssetRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findAssets() {
    return defer(() =>
      this.prismaService.asset.findMany({
        orderBy: { symbol: 'asc' },
      }),
    );
  }

  findAsset(symbol: string) {
    return defer(() =>
      this.prismaService.asset.findUnique({
        where: { symbol: symbol.toUpperCase() },
      }),
    );
  }
}
