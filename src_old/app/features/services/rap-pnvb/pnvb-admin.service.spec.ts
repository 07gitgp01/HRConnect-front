import { TestBed } from '@angular/core/testing';

import { PnvbAdminService } from './pnvb-admin.service';

describe('PnvbAdminService', () => {
  let service: PnvbAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PnvbAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
