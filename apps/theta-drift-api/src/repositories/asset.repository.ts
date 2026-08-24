import { Injectable } from '@nestjs/common';
import { defer, from } from 'rxjs';
import { PrismaService } from './prisma.service';

@Injectable()
export class AssetRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findAssets() {
    return defer(() =>
      from(
        this.prismaService.asset.findMany({
          orderBy: { symbol: 'asc' },
        }),
      ),
    );
  }

  findAsset(symbol: string) {
    return defer(() =>
      from(
        this.prismaService.asset.findUnique({
          where: { symbol: symbol.toUpperCase() },
        }),
      ),
    );
  }
}
