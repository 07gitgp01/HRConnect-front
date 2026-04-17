import { TestBed } from '@angular/core/testing';

import { RapportPtfService } from './rapport-ptf.service';

describe('RapportPtfService', () => {
  let service: RapportPtfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RapportPtfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
