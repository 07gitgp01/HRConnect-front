import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidatureFormComponent } from './candidature-form.component';

describe('CandidatureFormComponent', () => {
  let component: CandidatureFormComponent;
  let fixture: ComponentFixture<CandidatureFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CandidatureFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CandidatureFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
