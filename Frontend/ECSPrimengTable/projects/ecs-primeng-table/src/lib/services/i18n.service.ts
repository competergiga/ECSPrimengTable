import { Injectable, OnDestroy, inject } from '@angular/core';
import { TranslateDefaultParser, TranslateService } from '@ngx-translate/core';
import { PrimeNGConfig, TranslationKeys } from 'primeng/api';
import { EMPTY, merge, Subject, takeUntil } from 'rxjs';

/** Translates UI text only; never changes column keys, data or persisted view names. */
@Injectable({ providedIn: 'root' })
export class ECSPrimengTableI18nService implements OnDestroy {
  private readonly translate = inject(TranslateService, { optional: true });
  private readonly prime = inject(PrimeNGConfig, { optional: true });
  private readonly destroy$ = new Subject<void>();
  private readonly parser = new TranslateDefaultParser();
  private connected = false;
  private primeDefaults: Record<string, any> | undefined;
  private appliedPrimeTranslations = false;
  readonly changes = this.translate
    ? merge(this.translate.onLangChange, this.translate.onTranslationChange, this.translate.onDefaultLangChange)
    : EMPTY;

  text(key: string | null | undefined, params?: Record<string, any>): string {
    if (!key) return '';
    const value = this.translate?.instant(key, params);
    // Literal English keys also serve as defaults, including interpolated counters.
    if (typeof value === 'string' && value !== key) return value;
    return this.parser.interpolate(key, params) ?? key;
  }

  /** Optional dictionary section "primeng" configures the application's shared PrimeNG locale. */
  connectPrimeNG(): void {
    if (this.connected || !this.prime || !this.translate) return;
    this.connected = true;
    this.primeDefaults = Object.fromEntries(
      [...Object.values(TranslationKeys), 'dateFormat', 'aria'].map(key => [key, structuredClone(this.prime!.getTranslation(key))])
    );
    this.syncPrimeNG();
    this.changes.pipe(takeUntil(this.destroy$)).subscribe(() => this.syncPrimeNG());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private syncPrimeNG(): void {
    const value = this.translate!.instant('primeng');
    const defined = value && typeof value === 'object' && !Array.isArray(value);
    if (!defined && !this.appliedPrimeTranslations) return;
    const defaults = this.primeDefaults!;
    const overrides = defined ? value : {};
    this.prime!.setTranslation({
      ...defaults, ...overrides,
      aria: { ...defaults['aria'], ...overrides['aria'] }
    });
    this.appliedPrimeTranslations = !!defined;
  }
}
