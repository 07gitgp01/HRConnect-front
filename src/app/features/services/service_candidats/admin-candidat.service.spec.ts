import { TestBed } from '@angular/core/testing';

import { AdminCandidatService } from './admin-candidat.service';

describe('AdminCandidatService', () => {
  let service: AdminCandidatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminCandidatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
