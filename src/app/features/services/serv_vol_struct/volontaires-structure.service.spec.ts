import { TestBed } from '@angular/core/testing';

import { VolontairesStructureService } from './volontaires-structure.service';

describe('VolontairesStructureService', () => {
  let service: VolontairesStructureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VolontairesStructureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
