import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditerCandidatComponent } from './editer-candidat.component';

describe('EditerCandidatComponent', () => {
  let component: EditerCandidatComponent;
  let fixture: ComponentFixture<EditerCandidatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditerCandidatComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditerCandidatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
