import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SpinnerService } from './core/services/spinner.service';
import { SharedService } from './core/services/shared.service';
import { Subject, takeUntil, delay } from 'rxjs';
import { PrimeNGConfig } from 'primeng/api';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    RouterModule,
    TranslateModule,
    CommonModule,
    FormsModule,
    ToastModule,
    DialogModule,
    ProgressSpinnerModule
  ],
  templateUrl: './app.html'
})
export class App implements OnDestroy {
  readonly translate = inject(TranslateService);
  private readonly sharedService = inject(SharedService);
  private readonly destroy$ = new Subject<void>();
  get lastRowRetrievalMs(): number | null { return this.sharedService.lastRowRetrievalMs; }
  isSpinnerVisible: boolean = false;
  isUserAdmin = false;
  constructor(private readonly spinnerService: SpinnerService) {
    inject(PrimeNGConfig).ripple = true;
    this.translate.use('es');
    this.spinnerService.spinner$.pipe(delay(1), takeUntil(this.destroy$)).subscribe(visible => {
      this.isSpinnerVisible = visible;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
