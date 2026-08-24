import { END, START, StateGraph } from '@langchain/langgraph';
import { Injectable } from '@nestjs/common';
import { Observable, defer } from 'rxjs';
import type { Asset } from '@theta-drift/theta-drift-api/interfaces';
import { CurateNode } from './curate.node';
import { RateNode } from './rate.node';
import { RatingStateAnnotation, type RatingState } from './state';

export interface GraphInput {
  articleId: string;
  title: string;
  body: string;
  candidates: Asset[];
}

@Injectable()
export class RatingGraph {
  private readonly compiled: ReturnType<typeof this.buildGraph>;

  constructor(curateNode: CurateNode, rateNode: RateNode) {
    this.compiled = this.buildGraph(curateNode, rateNode);
  }

  invoke(input: GraphInput): Observable<RatingState> {
    return defer(() => this.compiled.invoke(input));
  }

  private buildGraph(curateNode: CurateNode, rateNode: RateNode) {
    return new StateGraph(RatingStateAnnotation)
      .addNode('curate', (state) => curateNode.run(state))
      .addNode('rate', (state) => rateNode.run(state))
      .addEdge(START, 'curate')
      .addConditionalEdges(
        'curate',
        (state: RatingState) =>
          (state.universe ?? []).length > 0 ? 'rate' : END,
        { rate: 'rate', [END]: END },
      )
      .addEdge('rate', END)
      .compile();
  }
}
