import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidatureCandiFormComponent } from './candidature-candi-form.component';

describe('CandidatureCandiFormComponent', () => {
  let component: CandidatureCandiFormComponent;
  let fixture: ComponentFixture<CandidatureCandiFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CandidatureCandiFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CandidatureCandiFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
