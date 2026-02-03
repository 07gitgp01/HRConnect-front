import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidatDashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: CandidatDashboardComponent;
  let fixture: ComponentFixture<CandidatDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CandidatDashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CandidatDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
