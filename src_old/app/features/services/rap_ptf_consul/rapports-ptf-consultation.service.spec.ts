import { TestBed } from '@angular/core/testing';

import { RapportsPtfConsultationService } from './rapports-ptf-consultation.service';

describe('RapportsPtfConsultationService', () => {
  let service: RapportsPtfConsultationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RapportsPtfConsultationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
