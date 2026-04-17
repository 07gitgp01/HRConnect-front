import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RapportDetailAdminComponent } from './rapport-detail-admin.component';

describe('RapportDetailAdminComponent', () => {
  let component: RapportDetailAdminComponent;
  let fixture: ComponentFixture<RapportDetailAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RapportDetailAdminComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RapportDetailAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
