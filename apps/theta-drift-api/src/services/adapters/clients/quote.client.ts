import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Observable, catchError, map, of } from 'rxjs';
import { ENV, type Env } from '../../../config/configuration';

export interface QuoteDto {
  symbol?: string;
  name?: string;
  exchange?: string;
  price?: number;
  change?: number;
  changePercentage?: number;
  dayLow?: number;
  dayHigh?: number;
  yearLow?: number;
  yearHigh?: number;
  marketCap?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  volume?: number;
  open?: number;
  previousClose?: number;
  timestamp?: number;
}

@Injectable()
export class QuoteClient {
  private readonly log = new Logger(QuoteClient.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  getQuote(symbol: string): Observable<QuoteDto | undefined> {
    return this.httpService
      .get<QuoteDto[]>('quote', {
        baseURL: `${this.env.QUOTE_BASE_URL}/`,
        timeout: this.env.QUOTE_TIMEOUT_MS,
        params: { symbol, apikey: this.env.QUOTE_API_KEY },
      })
      .pipe(
        map((response) =>
          Array.isArray(response.data) ? response.data[0] : undefined,
        ),
        catchError((error: unknown) => {
          this.log.warn(`Quote for ${symbol} failed: ${String(error)}`);
          return of(undefined);
        }),
      );
  }
}
