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
          orderBy: { quoteSymbol: 'asc' },
        }),
      ),
    );
  }

  findAsset(quoteSymbol: string) {
    return defer(() =>
      from(
        this.prismaService.asset.findUnique({
          where: { quoteSymbol: quoteSymbol.toUpperCase() },
        }),
      ),
    );
  }
}
