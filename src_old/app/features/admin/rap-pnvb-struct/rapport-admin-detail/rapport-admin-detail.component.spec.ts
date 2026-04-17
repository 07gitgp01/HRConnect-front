import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RapportAdminDetailComponent } from './rapport-admin-detail.component';

describe('RapportAdminDetailComponent', () => {
  let component: RapportAdminDetailComponent;
  let fixture: ComponentFixture<RapportAdminDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RapportAdminDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RapportAdminDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
