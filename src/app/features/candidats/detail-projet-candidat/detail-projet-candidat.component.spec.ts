import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailProjetCandidatComponent } from './detail-projet-candidat.component';

describe('DetailProjetCandidatComponent', () => {
  let component: DetailProjetCandidatComponent;
  let fixture: ComponentFixture<DetailProjetCandidatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DetailProjetCandidatComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetailProjetCandidatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
