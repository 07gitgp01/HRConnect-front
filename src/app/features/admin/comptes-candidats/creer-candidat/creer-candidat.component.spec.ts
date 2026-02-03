import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreerCandidatComponent } from './creer-candidat.component';

describe('CreerCandidatComponent', () => {
  let component: CreerCandidatComponent;
  let fixture: ComponentFixture<CreerCandidatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreerCandidatComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreerCandidatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
