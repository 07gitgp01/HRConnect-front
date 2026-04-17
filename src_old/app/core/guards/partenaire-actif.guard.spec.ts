import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { partenaireActifGuard } from './partenaire-actif.guard';

describe('partenaireActifGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => partenaireActifGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
