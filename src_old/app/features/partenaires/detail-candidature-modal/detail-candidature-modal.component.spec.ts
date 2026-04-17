import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailCandidatureModalComponent } from './detail-candidature-modal.component';

describe('DetailCandidatureModalComponent', () => {
  let component: DetailCandidatureModalComponent;
  let fixture: ComponentFixture<DetailCandidatureModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DetailCandidatureModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetailCandidatureModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
