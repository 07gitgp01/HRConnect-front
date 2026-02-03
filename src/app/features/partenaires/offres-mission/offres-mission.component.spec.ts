import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffresMissionComponent } from './offres-mission.component';

describe('OffresMissionComponent', () => {
  let component: OffresMissionComponent;
  let fixture: ComponentFixture<OffresMissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OffresMissionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OffresMissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
