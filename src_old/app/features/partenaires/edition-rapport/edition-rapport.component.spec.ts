import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditionRapportComponent } from './edition-rapport.component';

describe('EditionRapportComponent', () => {
  let component: EditionRapportComponent;
  let fixture: ComponentFixture<EditionRapportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditionRapportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditionRapportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
