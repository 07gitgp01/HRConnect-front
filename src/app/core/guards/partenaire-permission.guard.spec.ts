import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { partenairePermissionGuard } from './partenaire-permission.guard';

describe('partenairePermissionGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => partenairePermissionGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
