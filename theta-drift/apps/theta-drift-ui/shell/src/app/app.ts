import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Nav } from '@theta-drift/shared/nav';

@Component({
  imports: [Nav, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'theta-drift-ui';
}
