import { TestBed } from '@angular/core/testing';

import { VolontaireService } from './volontaire.service';

describe('VolontaireService', () => {
  let service: VolontaireService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VolontaireService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
