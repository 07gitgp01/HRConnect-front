import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RapportAdminListComponent } from './rapport-admin-list.component';

describe('RapportAdminListComponent', () => {
  let component: RapportAdminListComponent;
  let fixture: ComponentFixture<RapportAdminListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RapportAdminListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RapportAdminListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
