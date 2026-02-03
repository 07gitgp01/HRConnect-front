import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRapportsPtfComponent } from './admin-rapports-ptf.component';

describe('AdminRapportsPtfComponent', () => {
  let component: AdminRapportsPtfComponent;
  let fixture: ComponentFixture<AdminRapportsPtfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminRapportsPtfComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminRapportsPtfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
